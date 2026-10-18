import React from 'react';
import { Globe, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { ResearchResult } from '../../../shared/types';

interface SourcesConsultedProps {
  sources: ResearchResult['sourcesConsulted'];
}

export const SourcesConsulted: React.FC<SourcesConsultedProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 text-sm">
        No candidate web sources registered yet.
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl my-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Sources Consulted & Audit Trail ({sources.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full audit log of public candidate pages inspected during this autonomous retrieval run.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SSRF Guard Verified</span>
        </div>
      </div>

      <div className="space-y-2">
        {sources.map((src, idx) => (
          <div
            key={idx}
            className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {src.fetchedSuccessfully ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-slate-200 truncate">
                  {src.title || src.domain}
                </h4>
                <span className="text-[11px] text-slate-500 block truncate font-mono">
                  {src.url}
                </span>
                {src.errorReason && (
                  <span className="text-[11px] text-rose-400 block mt-0.5 font-medium">
                    Fetch note: {src.errorReason}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  src.fetchedSuccessfully
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {src.fetchedSuccessfully ? 'Fetched & Extracted' : 'Fetch Blocked / Failed'}
              </span>

              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Open source URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
