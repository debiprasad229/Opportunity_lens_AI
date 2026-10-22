import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  GraduationCap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Globe,
  Quote,
  HelpCircle,
  Clock,
  AlertOctagon,
} from 'lucide-react';
import { InternshipOpportunity, FieldEvidence } from '../../../shared/types';
import { VerificationBadge } from './VerificationBadge';

interface OpportunityCardProps {
  opportunity: InternshipOpportunity;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 50) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  };

  const renderField = (
    label: string,
    evidence: FieldEvidence,
    icon: React.ReactNode,
    placeholderText: string = 'Not Disclosed on Source Page'
  ) => {
    const isUnknown = evidence.status === 'unknown' || !evidence.value;
    const isUnverified = evidence.status === 'unverified';

    return (
      <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80 flex flex-col justify-between transition hover:border-slate-700/80">
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            {icon}
            {label}
          </span>
          <VerificationBadge
            status={evidence.status}
            confidenceScore={evidence.confidenceScore}
            showScore={false}
          />
        </div>

        <div className="mt-1">
          {isUnknown ? (
            <p className="text-xs text-slate-500 italic flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-600 shrink-0" />
              {placeholderText}
            </p>
          ) : (
            <div>
              <p
                className={`text-sm font-medium ${
                  isUnverified ? 'text-rose-300' : 'text-slate-100'
                } line-clamp-2`}
              >
                {evidence.value}
              </p>
              {evidence.normalizedDate && evidence.normalizedDate !== evidence.value && (
                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-mono mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  Normalized: {evidence.normalizedDate}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-slate-900/50 border border-slate-800/90 hover:border-indigo-500/40 transition-all duration-200 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-black/20">
      {/* Top Banner: Company, Title, Score */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-400" />
                {opportunity.companyName.value || 'Unknown Organization'}
              </span>

              <span className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                <Globe className="w-3 h-3 text-slate-500" />
                {opportunity.sourceDomain}
              </span>

              {opportunity.isStaleOrClosed && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  Stale / Closed Listing
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight hover:text-indigo-200 transition">
              {opportunity.roleTitle.value || 'Software Developer Internship'}
            </h3>
          </div>

          {/* Quality Score Ring */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${getScoreColor(
              opportunity.overallScore
            )}`}
            title="Quality & Grounding Confidence Score (0-100)"
          >
            <span className="text-[10px] uppercase font-semibold block opacity-75">
              Score
            </span>
            <span className="text-lg font-black">{opportunity.overallScore}</span>
          </div>
        </div>

        {/* Fact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          {renderField(
            'Stipend / Pay',
            opportunity.stipend,
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
            'Not Disclosed by Employer'
          )}
          {renderField(
            'Deadline',
            opportunity.deadline,
            <Calendar className="w-3.5 h-3.5 text-amber-400" />,
            'Rolling / Unspecified'
          )}
          <div className="sm:col-span-2">
            {renderField(
              'Eligibility & Fresh Grad Criteria',
              opportunity.eligibility,
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />,
              'No strict batch or qualification criteria cited on source page'
            )}
          </div>
        </div>
      </div>

      {/* Action Bar & Evidence Drawer Toggle */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Toggle Evidence Grounding */}
        <button
          type="button"
          onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center sm:justify-start gap-1 py-1 font-medium transition focus:outline-none focus:underline"
          aria-expanded={isEvidenceExpanded}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isEvidenceExpanded ? 'Hide Evidence Audit' : 'Inspect Grounded Source Quotes'}</span>
          {isEvidenceExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Official Application & Source Links */}
        <div className="flex items-center gap-2">
          <a
            href={opportunity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white transition flex items-center justify-center gap-1.5 border border-slate-700/60"
            title="Inspect original source webpage"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Source Page</span>
          </a>

          <a
            href={opportunity.officialApplicationLink.value || opportunity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
          >
            <span>Apply Official</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Expanded Evidence Audit Panel */}
      {isEvidenceExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-950/70 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-indigo-400" />
              Verbatim Evidence Grounding Audit
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Domain: {opportunity.sourceDomain}
            </span>
          </div>

          {/* Detailed field quotes */}
          {[
            { label: 'Role Title', field: opportunity.roleTitle },
            { label: 'Company Name', field: opportunity.companyName },
            { label: 'Stipend', field: opportunity.stipend },
            { label: 'Deadline', field: opportunity.deadline },
            { label: 'Eligibility', field: opportunity.eligibility },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/70">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-300">{item.label}</span>
                <VerificationBadge
                  status={item.field.status}
                  confidenceScore={item.field.confidenceScore}
                  showScore={true}
                />
              </div>

              {item.field.sourceText ? (
                <div className="mt-1 text-slate-300 bg-slate-950/90 p-2.5 rounded border border-slate-800 text-[11px] font-mono leading-relaxed">
                  <span className="text-indigo-400 mr-1 font-sans font-bold">"</span>
                  {item.field.sourceText}
                  <span className="text-indigo-400 ml-1 font-sans font-bold">"</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  {item.field.notes || 'Information not disclosed on the source page.'}
                </p>
              )}

              {item.field.notes && item.field.sourceText && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Audit note: {item.field.notes}
                </p>
              )}
            </div>
          ))}

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Discovered: {new Date(opportunity.discoveredAt).toLocaleString()}</span>
            <a
              href={opportunity.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              Verify on origin URL <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
