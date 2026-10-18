import React from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';
import { InternshipOpportunity, VerificationStatus } from '../../../shared/types';

interface ComparisonTableProps {
  opportunities: InternshipOpportunity[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ opportunities }) => {
  const renderStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span title="Verified Grounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </span>
        );
      case 'partial':
        return (
          <span title="Partial Match">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </span>
        );
      case 'unverified':
        return (
          <span title="Unverified">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </span>
        );
      case 'unknown':
      default:
        return (
          <span title="Undisclosed / Unknown">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </span>
        );
    }
  };

  return (
    <div className="w-full glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl my-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-semibold tracking-wider text-[11px] uppercase">
              <th className="py-3.5 px-4">Score</th>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-4">Role Title</th>
              <th className="py-3.5 px-4">Stipend / Pay</th>
              <th className="py-3.5 px-4">Application Deadline</th>
              <th className="py-3.5 px-4">Eligibility & Batch</th>
              <th className="py-3.5 px-4 text-right">Apply Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {opportunities.map((opp) => (
              <tr
                key={opp.id}
                className="hover:bg-slate-900/40 transition-colors duration-150"
              >
                {/* Score */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                      opp.overallScore >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : opp.overallScore >= 50
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {opp.overallScore}
                  </span>
                </td>

                {/* Company */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    {renderStatusIcon(opp.companyName.status)}
                    <span>{opp.companyName.value || 'Unknown Organization'}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">{opp.sourceDomain}</span>
                </td>

                {/* Role */}
                <td className="py-3.5 px-4">
                  <div className="font-medium text-slate-200 line-clamp-1 max-w-[200px]">
                    {opp.roleTitle.value || 'Software Developer Intern'}
                  </div>
                </td>

                {/* Stipend */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {renderStatusIcon(opp.stipend.status)}
                    <span
                      className={
                        opp.stipend.value ? 'text-slate-100 font-medium' : 'text-slate-500 italic text-xs'
                      }
                    >
                      {opp.stipend.value || 'Not Disclosed'}
                    </span>
                  </div>
                </td>

                {/* Deadline */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {renderStatusIcon(opp.deadline.status)}
                    <span
                      className={
                        opp.deadline.value ? 'text-slate-100 font-medium' : 'text-slate-500 italic text-xs'
                      }
                    >
                      {opp.deadline.value || 'Rolling / Unspecified'}
                    </span>
                  </div>
                </td>

                {/* Eligibility */}
                <td className="py-3.5 px-4">
                  <div className="text-xs text-slate-300 line-clamp-2 max-w-[240px]">
                    {opp.eligibility.value || <span className="text-slate-500 italic">Unspecified</span>}
                  </div>
                </td>

                {/* Action */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <a
                    href={opp.officialApplicationLink.value || opp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
                  >
                    <span>Apply</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
