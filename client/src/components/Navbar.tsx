import React from 'react';
import { Compass, ShieldCheck, Cpu } from 'lucide-react';
import { HealthInfo } from '../services/api';

interface NavbarProps {
  health: HealthInfo | null;
  onOpenArchitectureModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, onOpenArchitectureModal }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Compass className="w-6 h-6 text-white animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                OpportunityLens
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Intelligent Web Retrieval • Fresh Graduate Internships
            </p>
          </div>
        </div>

        {/* Challenge & Status Badges */}
        <div className="flex items-center gap-3">
          {/* Match 4 Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-950/40 text-red-300 border border-red-500/30">
            <Cpu className="w-3.5 h-3.5 text-red-400" />
            <span>AMD AI League • Match 4</span>
          </div>

          {/* Engine Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${health ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-300 hidden sm:inline">
              {health ? (health.capabilities.geminiLlmConfigured ? (health.capabilities.model ? `Gemini ${health.capabilities.model.replace('gemini-', '')}` : 'Gemini 3.8 Flash') : 'Heuristic Mode') : 'Connecting...'}
            </span>
          </div>

          {/* Architecture / Grounding Info Button */}
          <button
            onClick={onOpenArchitectureModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
            title="Inspect Grounding Engine & SSRF Architecture"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Audit Guard</span>
          </button>
        </div>
      </div>
    </header>
  );
};
