import { useState, useEffect, useRef } from 'react';
import { OpenAIService } from './services/openai';
import { Message } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ApiKeyConfig } from './components/ApiKeyConfig';
import { QuickQuestions } from './components/QuickQuestions';
import { FollowUpQuestions } from './components/FollowUpQuestions';
import { PatientInfoForm } from './components/PatientInfoForm';
import { AlertCircle, Stethoscope, User, ChevronRight } from 'lucide-react';

// Set to true to enable the patient panel sidebar
const ENABLE_PATIENT_PANEL = false;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(
    null
  );
  const [isConfigured, setIsConfigured] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClearChat = () => {
    setMessages([]);
    setFollowUpQuestions([]);
  };

  const handleNewConversation = () => {
    if (openAIService) {
      openAIService.resetConversation();
    }
    setMessages([]);
    setFollowUpQuestions([]);
    setError(null);
  };

  useEffect(() => {
    const assistantId = import.meta.env.VITE_ASSISTANT_ID;

    if (assistantId && assistantId !== 'your_assistant_id_here') {
      setOpenAIService(new OpenAIService(assistantId));
      setIsConfigured(true);
    } else {
      const storedAssistantId = localStorage.getItem('openai_assistant_id');

      if (storedAssistantId) {
        setOpenAIService(new OpenAIService(storedAssistantId));
        setIsConfigured(true);
      } else {
        setError(
          'Assistant ID not configured. Please configure it using the button above.'
        );
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleAssistantConfigured = (assistantId: string) => {
    localStorage.setItem('openai_assistant_id', assistantId);
    setOpenAIService(new OpenAIService(assistantId));
    setIsConfigured(true);
    setError(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!openAIService) {
      setError('OpenAI service not initialized');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setFollowUpQuestions([]);

    try {
      const { response, followUpQuestions: newFollowUps } = await openAIService.askQuestion(content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setFollowUpQuestions(newFollowUps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-10 py-4">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-800">
                  EVP Clinical Assistant
                </h1>
                <p className="text-sm text-slate-600">
                  EVP therapy for urothelial cancer
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewConversation}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-60"
                disabled={!openAIService}
              >
                New conversation
              </button>
              <button
                onClick={handleClearChat}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-60"
                disabled={messages.length === 0}
              >
                Clear chat
              </button>
              <ApiKeyConfig
                onAssistantConfigured={handleAssistantConfigured}
                isConfigured={isConfigured}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-10 py-4 w-full">
          <div className="flex gap-8 items-stretch">
            {/* Toggle button for patient panel - only shown when ENABLE_PATIENT_PANEL is true */}
            {ENABLE_PATIENT_PANEL && !showPatientPanel && (
              <button
                onClick={() => setShowPatientPanel(true)}
                className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-md"
                title="Show Patient Profile"
              >
                <User className="w-5 h-5" />
              </button>
            )}

            {/* Left sidebar - Patient Info - only shown when ENABLE_PATIENT_PANEL is true */}
            {ENABLE_PATIENT_PANEL && showPatientPanel && (
              <div className="w-[420px] flex-shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Patient Profile</span>
                  <button
                    onClick={() => setShowPatientPanel(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Hide Patient Profile"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <PatientInfoForm
                  onGenerateQuestion={handleSendMessage}
                  disabled={isLoading || !openAIService}
                />
              </div>
            )}

            {/* Main chat area */}
            <div className="flex-1 min-w-0 flex flex-col bg-white border border-slate-200 rounded-lg">
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && !error && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <Stethoscope className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                      Welcome to EVP Clinical Assistant
                    </h2>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      Evidence-based clinical guidance for Enfortumab Vedotin + Pembrolizumab (EVP) therapy for urothelial cancer. Ask about dosing, efficacy, safety, or trial data.
                    </p>
                    <QuickQuestions
                      onSelect={handleSendMessage}
                      disabled={isLoading || !openAIService}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-800 text-sm mb-1">Error</h3>
                      <p className="text-red-700 text-xs">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={message.id}>
                      <ChatMessage message={message} />
                      {/* Show follow-up questions after the last assistant message */}
                      {message.role === 'assistant' &&
                        index === messages.length - 1 &&
                        !isLoading &&
                        followUpQuestions.length > 0 && (
                          <FollowUpQuestions
                            questions={followUpQuestions}
                            onSelect={handleSendMessage}
                            disabled={isLoading || !openAIService}
                          />
                        )}
                    </div>
                  ))}
                  {isLoading && <LoadingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat input at bottom */}
              <div className="p-4 border-t border-slate-200 mt-auto">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={isLoading || !openAIService}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
