import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface ComorbiditiesProps {
  selected: string[];
  onChange: (comorbidities: string[]) => void;
}

const COMMON_COMORBIDITIES = [
  'Diabetes mellitus',
  'Hypertension',
  'Coronary artery disease',
  'Heart failure',
  'Atrial fibrillation',
  'COPD',
  'Asthma',
  'Chronic kidney disease',
  'Peripheral neuropathy',
  'Autoimmune disease',
  'Hypothyroidism',
  'Hyperthyroidism',
  'Hepatitis B',
  'Hepatitis C',
  'HIV',
  'Prior malignancy',
  'Obesity',
  'Depression',
  'Dementia',
];

export function Comorbidities({ selected, onChange }: ComorbiditiesProps) {
  const [customInput, setCustomInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const availableOptions = COMMON_COMORBIDITIES.filter(
    (c) => !selected.includes(c)
  );

  const handleSelectFromDropdown = (comorbidity: string) => {
    onChange([...selected, comorbidity]);
    setIsDropdownOpen(false);
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setCustomInput('');
    }
  };

  const handleRemove = (comorbidity: string) => {
    onChange(selected.filter((c) => c !== comorbidity));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">
        Comorbidities
      </label>

      {/* Selected comorbidities as tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((comorbidity) => (
            <span
              key={comorbidity}
              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200"
            >
              {comorbidity}
              <button
                onClick={() => handleRemove(comorbidity)}
                className="hover:text-emerald-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown and custom input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-3 py-2 text-sm text-left border border-slate-200 rounded-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
          >
            <span className="text-slate-500">Select common comorbidity...</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
              {availableOptions.length > 0 ? (
                availableOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelectFromDropdown(option)}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-emerald-50 transition-colors"
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-slate-500">
                  All common options selected
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add custom..."
            className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={handleAddCustom}
            disabled={!customInput.trim()}
            className="px-2 py-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
