import { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';

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

const ADDITIONAL_COMORBIDITIES = [
  'DVT/PE',
  'PVD',
  'Dyslipidemia',
  'ILD',
  'Cirrhosis',
  'Stroke/TIA',
  'Dementia',
  'Hyperthyroid',
  'Adrenal insufficiency',
  'Rheumatoid arthritis',
  'Lupus/SLE',
  'IBD',
  'Psoriasis',
  'TB history',
  'Active 2nd cancer',
  'Depression',
  'Anxiety',
  'Transplant recipient',
  'Immunosuppressed',
];

export function Comorbidities({ selected, onChange }: ComorbiditiesProps) {
  const [customInput, setCustomInput] = useState('');
  const [showAdditional, setShowAdditional] = useState(false);

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

  const handleSelectAdditional = (comorbidity: string) => {
    if (!selected.includes(comorbidity)) {
      onChange([...selected, comorbidity]);
    }
    setShowAdditional(false);
  };

  // Get custom entries (ones not in either preset list)
  const allPresets = [...COMMON_COMORBIDITIES, ...ADDITIONAL_COMORBIDITIES];
  const customEntries = selected.filter((s) => !allPresets.includes(s));

  // Filter additional options to only show unselected ones
  const availableAdditional = ADDITIONAL_COMORBIDITIES.filter(
    (c) => !selected.includes(c)
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

      {/* Selected additional comorbidities as tags */}
      {selected.filter((s) => ADDITIONAL_COMORBIDITIES.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected
            .filter((s) => ADDITIONAL_COMORBIDITIES.includes(s))
            .map((comorbidity) => (
              <button
                key={comorbidity}
                onClick={() => handleToggle(comorbidity)}
                className="px-2 py-1 text-xs rounded-md border bg-emerald-100 border-emerald-300 text-emerald-700 transition-colors"
              >
                {comorbidity} ×
              </button>
            ))}
        </div>
      )}

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

      {/* Additional options dropdown and custom input */}
      <div className="flex gap-1">
        <div className="relative">
          <button
            onClick={() => setShowAdditional(!showAdditional)}
            className="px-2 py-1 text-xs border border-slate-200 rounded-md hover:border-slate-300 bg-white text-slate-600 flex items-center gap-1"
          >
            Additional
            <ChevronDown className="w-3 h-3" />
          </button>
          {showAdditional && (
            <div className="absolute z-10 mt-1 w-40 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
              {availableAdditional.length > 0 ? (
                availableAdditional.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelectAdditional(option)}
                    className="w-full px-2 py-1.5 text-xs text-left hover:bg-emerald-50 transition-colors"
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-slate-500">
                  All selected
                </div>
              )}
            </div>
          )}
        </div>

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
