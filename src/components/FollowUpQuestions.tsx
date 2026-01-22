import { Lightbulb } from 'lucide-react';

interface FollowUpQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function FollowUpQuestions({ questions, onSelect, disabled }: FollowUpQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium text-slate-500">Suggested Follow-ups</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className="text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs text-slate-600"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
