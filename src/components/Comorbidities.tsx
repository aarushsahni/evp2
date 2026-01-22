import { useState } from 'react';
import { Plus } from 'lucide-react';

interface ComorbiditiesProps {
  selected: string[];
  onChange: (comorbidities: string[]) => void;
}

const COMMON_COMORBIDITIES = [
  'Diabetes',
  'Hypertension',
  'CAD',
  'Heart failure',
  'A-fib',
  'COPD',
  'Asthma',
  'CKD',
  'Neuropathy',
  'Autoimmune',
  'Hypothyroid',
  'Hep B/C',
  'HIV',
  'Prior cancer',
  'Obesity',
];

export function Comorbidities({ selected, onChange }: ComorbiditiesProps) {
  const [customInput, setCustomInput] = useState('');

  const handleToggle = (comorbidity: string) => {
    if (selected.includes(comorbidity)) {
      onChange(selected.filter((c) => c !== comorbidity));
    } else {
      onChange([...selected, comorbidity]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  // Get custom entries (ones not in the preset list)
  const customEntries = selected.filter(
    (s) => !COMMON_COMORBIDITIES.includes(s)
  );

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">
        Comorbidities
      </label>

      {/* Toggle buttons for common comorbidities */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {COMMON_COMORBIDITIES.map((comorbidity) => {
          const isSelected = selected.includes(comorbidity);
          return (
            <button
              key={comorbidity}
              onClick={() => handleToggle(comorbidity)}
              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                isSelected
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {comorbidity}
            </button>
          );
        })}
      </div>

      {/* Custom entries */}
      {customEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {customEntries.map((custom) => (
            <button
              key={custom}
              onClick={() => handleToggle(custom)}
              className="px-2 py-1 text-xs rounded-md border bg-emerald-100 border-emerald-300 text-emerald-700 transition-colors"
            >
              {custom} ×
            </button>
          ))}
        </div>
      )}

      {/* Add custom input */}
      <div className="flex gap-1">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Add other..."
          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
        />
        <button
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
