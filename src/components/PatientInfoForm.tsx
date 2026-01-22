import { useState } from 'react';
import { User, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Comorbidities } from './Comorbidities';

export interface PatientInfo {
  age: string;
  sex: string;
  cancerStage: string;
  tnmStaging: string;
  histology: string;
  priorTherapies: string;
  surgicalHistory: string;
  ecogStatus: string;
  pdl1Status: string;
  nectin4Expression: string;
  renalFunction: string;
  liverFunction: string;
  metastaticSites: string;
  comorbidities: string[];
}

interface PatientInfoFormProps {
  onGenerateQuestion: (prompt: string) => void;
  disabled?: boolean;
}

const INITIAL_PATIENT_INFO: PatientInfo = {
  age: '',
  sex: '',
  cancerStage: '',
  tnmStaging: '',
  histology: '',
  priorTherapies: '',
  surgicalHistory: '',
  ecogStatus: '',
  pdl1Status: '',
  nectin4Expression: '',
  renalFunction: '',
  liverFunction: '',
  metastaticSites: '',
  comorbidities: [],
};

const CANCER_STAGES = ['I', 'II', 'IIIA', 'IIIB', 'IVA', 'IVB'];
const ECOG_STATUSES = ['0', '1', '2', '3', '4'];
const SURGICAL_OPTIONS = [
  'None',
  'TURBT only',
  'Partial cystectomy',
  'Radical cystectomy',
  'Radical cystectomy + lymphadenectomy',
  'Nephroureterectomy',
];
const HISTOLOGY_OPTIONS = [
  'Pure urothelial carcinoma',
  'Urothelial with squamous differentiation',
  'Urothelial with glandular differentiation',
  'Urothelial with variant histology',
  'Mixed histology',
];
const PDL1_OPTIONS = ['CPS < 10', 'CPS ≥ 10', 'CPS ≥ 20', 'Unknown/Not tested'];
const LIVER_FUNCTION_OPTIONS = ['Normal', 'Mild impairment', 'Moderate impairment', 'Severe impairment', 'Unknown'];

export function PatientInfoForm({ onGenerateQuestion, disabled }: PatientInfoFormProps) {
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(INITIAL_PATIENT_INFO);
  const [isExpanded, setIsExpanded] = useState(true);

  const updateField = (field: keyof PatientInfo, value: string | string[]) => {
    setPatientInfo((prev) => ({ ...prev, [field]: value }));
  };

  const generatePrompt = () => {
    const filledFields: string[] = [];

    if (patientInfo.age) filledFields.push(`Age: ${patientInfo.age} years`);
    if (patientInfo.sex) filledFields.push(`Sex: ${patientInfo.sex}`);
    if (patientInfo.cancerStage) filledFields.push(`Cancer stage: ${patientInfo.cancerStage}`);
    if (patientInfo.tnmStaging) filledFields.push(`TNM staging: ${patientInfo.tnmStaging}`);
    if (patientInfo.histology) filledFields.push(`Histology: ${patientInfo.histology}`);
    if (patientInfo.priorTherapies) filledFields.push(`Prior therapies: ${patientInfo.priorTherapies}`);
    if (patientInfo.surgicalHistory) filledFields.push(`Surgical history: ${patientInfo.surgicalHistory}`);
    if (patientInfo.ecogStatus) filledFields.push(`ECOG performance status: ${patientInfo.ecogStatus}`);
    if (patientInfo.pdl1Status) filledFields.push(`PD-L1 status: ${patientInfo.pdl1Status}`);
    if (patientInfo.nectin4Expression) filledFields.push(`Nectin-4 expression: ${patientInfo.nectin4Expression}`);
    if (patientInfo.renalFunction) filledFields.push(`Renal function (eGFR/CrCl): ${patientInfo.renalFunction}`);
    if (patientInfo.liverFunction) filledFields.push(`Liver function: ${patientInfo.liverFunction}`);
    if (patientInfo.metastaticSites) filledFields.push(`Metastatic sites: ${patientInfo.metastaticSites}`);
    if (patientInfo.comorbidities.length > 0) {
      filledFields.push(`Comorbidities: ${patientInfo.comorbidities.join(', ')}`);
    }

    if (filledFields.length === 0) {
      return null;
    }

    const prompt = `I have a patient with urothelial carcinoma and I'm considering Enfortumab Vedotin + Pembrolizumab therapy. Here is their clinical profile:

${filledFields.map((f) => `- ${f}`).join('\n')}

Based on this patient's characteristics, what clinical considerations should I be aware of when thinking about EVP therapy? Please address eligibility, dosing considerations, potential toxicity risks based on their comorbidities, and any relevant monitoring recommendations.`;

    return prompt;
  };

  const handleSubmit = () => {
    const prompt = generatePrompt();
    if (prompt) {
      onGenerateQuestion(prompt);
    }
  };

  const hasAnyData = Object.entries(patientInfo).some(([key, value]) => {
    if (key === 'comorbidities') return (value as string[]).length > 0;
    return value !== '';
  });

  const handleClear = () => {
    setPatientInfo(INITIAL_PATIENT_INFO);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-slate-800">Patient Profile</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mt-3 mb-4">
            Enter patient details to get personalized clinical guidance for EVP therapy.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Demographics */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Age</label>
              <input
                type="number"
                value={patientInfo.age}
                onChange={(e) => updateField('age', e.target.value)}
                placeholder="e.g., 68"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sex</label>
              <select
                value={patientInfo.sex}
                onChange={(e) => updateField('sex', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Cancer Details */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cancer Stage</label>
              <select
                value={patientInfo.cancerStage}
                onChange={(e) => updateField('cancerStage', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {CANCER_STAGES.map((stage) => (
                  <option key={stage} value={stage}>Stage {stage}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TNM Staging</label>
              <input
                type="text"
                value={patientInfo.tnmStaging}
                onChange={(e) => updateField('tnmStaging', e.target.value)}
                placeholder="e.g., T3N1M0"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Histology */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Histology</label>
              <select
                value={patientInfo.histology}
                onChange={(e) => updateField('histology', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {HISTOLOGY_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Treatment History */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Prior Therapies</label>
              <input
                type="text"
                value={patientInfo.priorTherapies}
                onChange={(e) => updateField('priorTherapies', e.target.value)}
                placeholder="e.g., Gemcitabine/Cisplatin, BCG"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Surgical History</label>
              <select
                value={patientInfo.surgicalHistory}
                onChange={(e) => updateField('surgicalHistory', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {SURGICAL_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Performance & Biomarkers */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ECOG Status</label>
              <select
                value={patientInfo.ecogStatus}
                onChange={(e) => updateField('ecogStatus', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {ECOG_STATUSES.map((status) => (
                  <option key={status} value={status}>ECOG {status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">PD-L1 Status</label>
              <select
                value={patientInfo.pdl1Status}
                onChange={(e) => updateField('pdl1Status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {PDL1_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nectin-4 Expression</label>
              <input
                type="text"
                value={patientInfo.nectin4Expression}
                onChange={(e) => updateField('nectin4Expression', e.target.value)}
                placeholder="e.g., High (H-score 250), Not tested"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Organ Function */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Renal Function</label>
              <input
                type="text"
                value={patientInfo.renalFunction}
                onChange={(e) => updateField('renalFunction', e.target.value)}
                placeholder="e.g., eGFR 45 mL/min"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Liver Function</label>
              <select
                value={patientInfo.liverFunction}
                onChange={(e) => updateField('liverFunction', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {LIVER_FUNCTION_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Metastatic Sites */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Metastatic Sites</label>
              <input
                type="text"
                value={patientInfo.metastaticSites}
                onChange={(e) => updateField('metastaticSites', e.target.value)}
                placeholder="e.g., Lymph nodes, Liver, Lung, Bone"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Comorbidities Section */}
          <div className="mt-4">
            <Comorbidities
              selected={patientInfo.comorbidities}
              onChange={(comorbidities) => updateField('comorbidities', comorbidities)}
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={disabled || !hasAnyData}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Get Clinical Guidance
            </button>
            <button
              onClick={handleClear}
              disabled={!hasAnyData}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
