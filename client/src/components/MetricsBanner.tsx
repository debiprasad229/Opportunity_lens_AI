import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Clock } from 'lucide-react';
import { ResearchResult } from '../../../shared/types';

interface MetricsBannerProps {
  result: ResearchResult;
}

export const MetricsBanner: React.FC<MetricsBannerProps> = ({ result }) => {
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
      {/* Total Discovered */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 text-center">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Opportunities
        </span>
        <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">
          {result.totalDiscovered}
        </span>
      </div>

      {/* Verified Claims */}
      <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-center">
        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified Facts
        </span>
        <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 block">
          {result.verifiedCount}
        </span>
      </div>

      {/* Partial Claims */}
      <div className="glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 text-center">
        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Partial Match
        </span>
        <span className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5 block">
          {result.partialCount}
        </span>
      </div>

      {/* Unknown Claims */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-700/40 bg-slate-900/30 text-center">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Undisclosed
        </span>
        <span className="text-xl sm:text-2xl font-black text-slate-400 mt-0.5 block">
          {result.unknownCount}
        </span>
      </div>

      {/* Latency */}
      <div className="col-span-2 sm:col-span-1 glass-panel p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-950/10 text-center">
        <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center justify-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Retrieval Time
        </span>
        <span className="text-xl sm:text-2xl font-black text-indigo-300 mt-0.5 block">
          {(result.executionTimeMs / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
};
