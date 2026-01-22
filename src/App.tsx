import { useState, useEffect, useRef } from 'react';
import { OpenAIService } from './services/openai';
import { Message } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ApiKeyConfig } from './components/ApiKeyConfig';
// import { QuickQuestions } from './components/QuickQuestions';
// import { FollowUpQuestions } from './components/FollowUpQuestions';
// import { PatientInfoForm } from './components/PatientInfoForm';
import { AlertCircle, Stethoscope } from 'lucide-react';

// TEST MARKER - DELETE THIS AFTER CONFIRMING DEPLOYMENT WORKS
const DEPLOY_TEST = "DEPLOYMENT TEST v1 - Jan 22 2026";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAIService, setOpenAIService] = useState<OpenAIService | null>(
    null
  );
  const [isConfigured, setIsConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleNewConversation = () => {
    if (openAIService) {
      openAIService.resetConversation();
    }
    setMessages([]);
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

    try {
      const { response } = await openAIService.askQuestion(content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* TEST BANNER - DELETE AFTER CONFIRMING */}
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-6 text-center">
            <p className="text-yellow-800 font-bold text-lg">{DEPLOY_TEST}</p>
            <p className="text-yellow-700 text-sm">If you see this, deployment is working!</p>
          </div>

          {messages.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Welcome to EVP Clinical Assistant
              </h2>
              <p className="text-slate-600 max-w-lg mx-auto">
                This tool provides evidence-based clinical guidance for
                urologists managing patients receiving Enfortumab Vedotin +
                Pembrolizumab therapy. Ask questions about dosing, efficacy,
                safety, or trial data.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading || !openAIService}
      />
    </div>
  );
}

export default App;
