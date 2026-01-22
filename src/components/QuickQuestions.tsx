import { MessageCircleQuestion } from 'lucide-react';

interface QuickQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const QUICK_QUESTIONS = [
  'What is the recommended dosing for Enfortumab Vedotin + Pembrolizumab?',
  'What are the most common adverse events with EVP therapy?',
  'What were the key efficacy outcomes from the EV-302 trial?',
];

export function QuickQuestions({ onSelect, disabled }: QuickQuestionsProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 justify-center mb-4">
        <MessageCircleQuestion className="w-5 h-5 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">Quick Questions</span>
      </div>
      <div className="flex flex-col gap-3 max-w-xl mx-auto">
        {QUICK_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="text-left px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-700"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
