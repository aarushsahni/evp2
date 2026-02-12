import { MessageCircleQuestion } from 'lucide-react';

interface QuickQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

const QUICK_QUESTIONS = [
  'How do I summarize the key efficacy takeaways from EV-303 (perioperative EV+P in cisplatin-ineligible patients) in a way that\'s useful for shared decision-making?',
  'What are the top toxicities from EV+P I need to counsel on up front—and what are the red-flag symptoms that require urgent action?',
  'Based on the EV-303 and EV-304 trials that tested perioperative EV+P, how can I explain to patients the timing of EV+P and cystectomy?',
];

export function QuickQuestions({ onSelect, disabled }: QuickQuestionsProps) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 justify-center mb-3">
        <MessageCircleQuestion className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">Quick Questions</span>
      </div>
      <div className="flex flex-col gap-2 max-w-lg mx-auto">
        {QUICK_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="text-left px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-700"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
