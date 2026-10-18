import React from 'react';
import { X, ShieldCheck, Cpu, Terminal, Lock } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-indigo-500/30 p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System Architecture & Grounding Protocol</h2>
            <p className="text-xs text-indigo-300">AMD AI League Match 4 — Intelligent Web Information Retrieval</p>
          </div>
        </div>

        <div className="mt-6 space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              1. Anti-Hallucination & Evidence Grounding
            </h3>
            <p className="text-slate-400 mb-2">
              The application strictly complies with Match 4 guidelines prohibiting fabricated opportunities or mock data.
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              <li><strong className="text-white">Strict Refusal Logic:</strong> If an employer does not disclose stipend or deadline, the field is permanently tagged <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">unknown</code>.</li>
              <li><strong className="text-white">Verbatim Quote Audit:</strong> The Evidence Verifier audits candidate claims against clean page text. Claims without verbatim proof are marked <code className="text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded font-mono">partial</code> or <code className="text-rose-300 bg-rose-950/40 px-1.5 py-0.5 rounded font-mono">unverified</code>.</li>
              <li><strong className="text-white">Attribution Guarantee:</strong> Every opportunity includes origin domain, direct source URL, and candidate apply link.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              2. Defense-in-Depth & SSRF Protection
            </h3>
            <p className="text-slate-400 mb-2">
              Autonomous web agents must prevent malicious targets from pivoting onto internal infrastructure.
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              <li><strong className="text-white">DNS Pre-Resolution:</strong> Target hostnames are resolved before connection and checked against RFC 1918, RFC 3927 (AWS/GCP metadata IP <code className="text-slate-300 bg-slate-800 px-1 font-mono">169.254.169.254</code>), loopback, carrier-grade NAT, and IPv6 unique-local addresses.</li>
              <li><strong className="text-white">Redirect Interception:</strong> Every 3xx redirect is stopped and independently re-validated through the SSRF guard before following.</li>
              <li><strong className="text-white">Hard Resource Bounds:</strong> 8-second fetch timeout and 2MB stream size cap prevent slowloris and memory exhaustion.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              3. Modular Pipeline
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold">Query Planner:</span> Decomposes prompt into 4 search variants.
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold">Search Provider:</span> Keyless DuckDuckGo HTML / Lite scraping.
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold">HTML Extractor:</span> Cheerio boilerplate stripper + JSON-LD tables.
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold">Gemini Adapter:</span> Zero-shot structured JSON extraction with quote grounding.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition"
          >
            Close Audit Guide
          </button>
        </div>
      </div>
    </div>
  );
};
