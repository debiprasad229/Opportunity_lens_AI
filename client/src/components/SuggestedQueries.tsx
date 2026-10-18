import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestedQueriesProps {
  onSelectQuery: (query: string) => void;
  disabled?: boolean;
}

const PRESET_QUERIES = [
  {
    label: '2026 Batch SDE Internships',
    query: 'Software engineer internship 2026 batch fresh graduates stipend eligibility',
  },
  {
    label: 'React / Frontend Internships',
    query: 'Frontend developer React intern fresh graduates stipend apply',
  },
  {
    label: 'Backend Python / Node Interns',
    query: 'Backend software developer intern Python Node freshers 2025 2026',
  },
  {
    label: 'AI / ML Engineering Internships',
    query: 'Machine Learning AI engineer intern fresh graduates apply deadline',
  },
];

export const SuggestedQueries: React.FC<SuggestedQueriesProps> = ({
  onSelectQuery,
  disabled = false,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-3 flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium mr-1">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        Suggested Prompts:
      </span>
      {PRESET_QUERIES.map((item, idx) => (
        <button
          key={idx}
          onClick={() => onSelectQuery(item.query)}
          disabled={disabled}
          className="text-xs px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
