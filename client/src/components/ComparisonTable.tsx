import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Building2,
  Calendar,
  DollarSign,
  AlertOctagon,
} from 'lucide-react';
import { InternshipOpportunity, VerificationStatus } from '../../../shared/types';

interface ComparisonTableProps {
  opportunities: InternshipOpportunity[];
}

type SortField = 'score' | 'company' | 'role' | 'stipend' | 'deadline';
type SortDirection = 'asc' | 'desc';

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ opportunities }) => {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  const sortedOpportunities = useMemo(() => {
    return [...opportunities].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'score':
          comparison = a.overallScore - b.overallScore;
          break;
        case 'company':
          comparison = (a.companyName.value || '').localeCompare(b.companyName.value || '');
          break;
        case 'role':
          comparison = (a.roleTitle.value || '').localeCompare(b.roleTitle.value || '');
          break;
        case 'stipend':
          comparison = (a.stipend.value || '').localeCompare(b.stipend.value || '');
          break;
        case 'deadline':
          comparison = (a.deadline.normalizedDate || a.deadline.value || '').localeCompare(
            b.deadline.normalizedDate || b.deadline.value || ''
          );
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [opportunities, sortField, sortDirection]);

  const renderStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span title="Verified with verbatim source quote">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </span>
        );
      case 'partial':
        return (
          <span title="Partial match (synthesized or paraphrased)">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </span>
        );
      case 'unverified':
        return (
          <span title="Unverified against page text">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </span>
        );
      case 'unknown':
      default:
        return (
          <span title="Not disclosed on source page">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </span>
        );
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
    );
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/60 shadow-xl my-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300 font-semibold tracking-wider text-[11px] uppercase select-none">
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('score')}
                  className="flex items-center gap-1.5 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                  aria-label="Sort by Quality Score"
                >
                  <span>Score</span>
                  {renderSortIndicator('score')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('company')}
                  className="flex items-center gap-1.5 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                  aria-label="Sort by Company"
                >
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>Company</span>
                  {renderSortIndicator('company')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('role')}
                  className="flex items-center gap-1.5 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                  aria-label="Sort by Role Title"
                >
                  <span>Role Title</span>
                  {renderSortIndicator('role')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('stipend')}
                  className="flex items-center gap-1.5 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                  aria-label="Sort by Stipend"
                >
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <span>Stipend / Pay</span>
                  {renderSortIndicator('stipend')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('deadline')}
                  className="flex items-center gap-1.5 hover:text-white transition focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                  aria-label="Sort by Application Deadline"
                >
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Application Deadline</span>
                  {renderSortIndicator('deadline')}
                </button>
              </th>
              <th className="py-3 px-4">Eligibility & Batch</th>
              <th className="py-3 px-4 text-right">Official Application</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedOpportunities.map((opp) => (
              <tr
                key={opp.id}
                className={`hover:bg-slate-850/60 transition-colors duration-150 ${
                  opp.isStaleOrClosed ? 'opacity-70 bg-rose-950/10' : ''
                }`}
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

                {/* Company & Domain */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    {renderStatusIcon(opp.companyName.status)}
                    <span>{opp.companyName.value || 'Unknown Organization'}</span>
                    {opp.isStaleOrClosed && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5 font-medium">
                        <AlertOctagon className="w-2.5 h-2.5" /> Closed
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">{opp.sourceDomain}</span>
                </td>

                {/* Role Title */}
                <td className="py-3.5 px-4">
                  <div className="font-medium text-slate-200 line-clamp-1 max-w-[220px]">
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
                    <div>
                      <span
                        className={
                          opp.deadline.value ? 'text-slate-100 font-medium' : 'text-slate-500 italic text-xs'
                        }
                      >
                        {opp.deadline.value || 'Rolling / Unspecified'}
                      </span>
                      {opp.deadline.normalizedDate && opp.deadline.normalizedDate !== opp.deadline.value && (
                        <span className="text-[10px] text-indigo-400 block font-mono">
                          ISO: {opp.deadline.normalizedDate}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Eligibility */}
                <td className="py-3.5 px-4">
                  <div className="text-xs text-slate-300 line-clamp-2 max-w-[240px]">
                    {opp.eligibility.value || <span className="text-slate-500 italic">No strict batch requirements cited</span>}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <a
                    href={opp.officialApplicationLink.value || opp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm shadow-indigo-600/20"
                  >
                    <span>Apply Official</span>
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
