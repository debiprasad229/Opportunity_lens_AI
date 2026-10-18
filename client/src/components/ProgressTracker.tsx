import React, { useState } from 'react';
import {
  Brain,
  Search,
  Globe2,
  FileCode2,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import { ResearchPlanStep } from '../../../shared/types';

interface ProgressTrackerProps {
  currentStep: ResearchPlanStep['step'];
  timeline: ResearchPlanStep[];
  isStreaming: boolean;
}

const PHASES = [
  { key: 'planning', label: 'Query Planning', icon: Brain },
  { key: 'searching', label: 'Web Search', icon: Search },
  { key: 'fetching', label: 'Safe Fetch (SSRF Guard)', icon: Globe2 },
  { key: 'extracting', label: 'Gemini LLM Extraction', icon: FileCode2 },
  { key: 'verifying', label: 'Evidence Grounding', icon: ShieldCheck },
  { key: 'ranking', label: 'Auditing & Ranking', icon: CheckCircle2 },
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  timeline,
  isStreaming,
}) => {
  const [showConsole, setShowConsole] = useState(true);

  const getPhaseIndex = (step: string) => {
    switch (step) {
      case 'planning': return 0;
      case 'searching': return 1;
      case 'fetching': return 2;
      case 'extracting': return 3;
      case 'verifying': return 4;
      case 'ranking': return 5;
      case 'completed': return 6;
      default: return 0;
    }
  };

  const activeIndex = getPhaseIndex(currentStep);

  return (
    <div className="w-full max-w-5xl mx-auto my-6 glass-panel rounded-2xl p-5 border border-indigo-500/20 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></div>
          <h3 className="text-sm font-semibold text-slate-200">
            {isStreaming ? 'Autonomous Information Retrieval in Progress' : 'Research Pipeline Executed'}
          </h3>
        </div>
        <button
          onClick={() => setShowConsole(!showConsole)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>{showConsole ? 'Hide Execution Log' : 'View Execution Log'}</span>
          {showConsole ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Visual Step Progress Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 my-5">
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const isDone = activeIndex > idx || currentStep === 'completed';
          const isCurrent = activeIndex === idx && currentStep !== 'completed';

          return (
            <div
              key={phase.key}
              className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all duration-300 ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                  : isCurrent
                  ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300 shadow-md shadow-indigo-500/10 scale-102 ring-1 ring-indigo-500/30'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
              }`}
            >
              <div className={`p-2 rounded-lg mb-2 ${
                isDone ? 'bg-emerald-500/20' : isCurrent ? 'bg-indigo-500/20 animate-pulse' : 'bg-slate-800'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium leading-tight">{phase.label}</span>
              <span className="text-[10px] mt-1 opacity-70">
                {isDone ? 'Completed' : isCurrent ? 'Processing...' : 'Waiting'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Terminal Step Logs */}
      {showConsole && (
        <div className="mt-3 bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs max-h-48 overflow-y-auto">
          {timeline.length === 0 ? (
            <p className="text-slate-600">Initializing agent pipeline...</p>
          ) : (
            <div className="space-y-1.5">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-300">
                  <span className="text-indigo-400 select-none">›</span>
                  <span className="text-slate-500 text-[11px] select-none">
                    [{new Date(item.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="font-semibold text-slate-400 uppercase text-[10px]">
                    [{item.step}]
                  </span>
                  <span className="flex-1">{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
