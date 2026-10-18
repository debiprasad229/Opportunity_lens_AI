import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import { VerificationStatus } from '../../../shared/types';

interface VerificationBadgeProps {
  status: VerificationStatus;
  confidenceScore?: number;
  label?: string;
  showScore?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  confidenceScore,
  label,
  showScore = false,
}) => {
  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label || 'Verified Grounded'}</span>
          {showScore && confidenceScore !== undefined && (
            <span className="opacity-75 text-[10px]">({Math.round(confidenceScore * 100)}%)</span>
          )}
        </span>
      );

    case 'partial':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{label || 'Partial Match'}</span>
          {showScore && confidenceScore !== undefined && (
            <span className="opacity-75 text-[10px]">({Math.round(confidenceScore * 100)}%)</span>
          )}
        </span>
      );

    case 'unverified':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{label || 'Unverified'}</span>
        </span>
      );

    case 'unknown':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/40 text-slate-400 border border-slate-600/30">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{label || 'Unknown / Undisclosed'}</span>
        </span>
      );
  }
};
