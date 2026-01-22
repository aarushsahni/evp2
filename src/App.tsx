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
import { AlertCircle, Stethoscope } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(
    null
  );
  const [isConfigured, setIsConfigured] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
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
        <div className="max-w-6xl mx-auto px-6 py-5">
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
                  Urologist-facing support for Enfortumab Vedotin + Pembrolizumab
                  therapy
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

      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-6xl mx-auto px-6 py-6 flex-1 flex flex-col min-h-0 w-full">
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left sidebar - Patient Info */}
            <div className="w-80 flex-shrink-0 overflow-y-auto">
              <PatientInfoForm
                onGenerateQuestion={handleSendMessage}
                disabled={isLoading || !openAIService}
              />
            </div>

            {/* Main chat area */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex-1 overflow-y-auto min-h-0">
                {messages.length === 0 && !error && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Stethoscope className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">
                      Welcome to EVP Clinical Assistant
                    </h2>
                    <p className="text-slate-600 text-sm max-w-md mx-auto">
                      Evidence-based clinical guidance for urologists managing
                      EVP therapy. Ask about dosing, efficacy, safety, or trial data.
                    </p>
                    <QuickQuestions
                      onSelect={handleSendMessage}
                      disabled={isLoading || !openAIService}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                      <p className="text-red-700 text-sm">{error}</p>
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

              {/* Chat input at bottom of chat area */}
              <div className="pt-4 border-t border-slate-200 mt-4">
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
