import React from 'react';
import { Search, Compass, ShieldCheck, Zap, RefreshCw, FilterX } from 'lucide-react';

interface EmptyStateProps {
  onSelectQuery: (query: string) => void;
  isFilterEmpty?: boolean;
  onResetFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onSelectQuery,
  isFilterEmpty = false,
  onResetFilters,
}) => {
  if (isFilterEmpty) {
    return (
      <div className="max-w-lg mx-auto my-12 text-center p-8 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
          <FilterX className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No Opportunities Match Current Filters</h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Your active filters (e.g. verified-only, keyword search) filtered out all discovered postings.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
        <Compass className="w-8 h-8 animate-pulse-subtle" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        Ground Truth Retrieval for Graduate Careers
      </h2>
      <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
        OpportunityLens AI crawls public tech career portals and job listings in real-time.
        Every extracted stipend, deadline, and eligibility requirement is audited against source quotes to guarantee zero hallucinations.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => onSelectQuery('Software engineering intern 2026 batch stipend')}
          className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition"
        >
          Try: 2026 SDE Internships →
        </button>
        <button
          onClick={() => onSelectQuery('Frontend developer React internship with stipend')}
          className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 transition"
        >
          Try: Frontend React Roles →
        </button>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-left">
        <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-800/80">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit mb-2">
            <Search className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">Query Planner</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Engineers targeted search query variations targeting genuine career portals and applicant tracking systems.
          </p>
        </div>

        <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-800/80">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">Evidence Verifier</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Inspects verbatim HTML quotes. Never guesses — undisclosed fields are honestly marked unknown.
          </p>
        </div>

        <div className="rounded-xl p-4 bg-slate-900/40 border border-slate-800/80">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 w-fit mb-2">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">SSRF & Safety Guard</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Validates IP ranges, intercepts redirects, caps response sizes, and respects access restrictions.
          </p>
        </div>
      </div>
    </div>
  );
};
