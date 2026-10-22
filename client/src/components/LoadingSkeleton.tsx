import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-5 sm:p-6 bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between space-y-4"
        >
          {/* Header skeleton */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 bg-slate-800 rounded-md"></div>
                <div className="h-4 w-28 bg-slate-800/60 rounded"></div>
              </div>
              <div className="h-6 w-3/4 bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-12 w-12 bg-slate-800 rounded-xl"></div>
          </div>

          {/* Fact grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
            <div className="h-16 bg-slate-800/50 rounded-xl border border-slate-800/40 p-3 space-y-2">
              <div className="h-3 w-16 bg-slate-700/60 rounded"></div>
              <div className="h-4 w-24 bg-slate-700/80 rounded"></div>
            </div>
            <div className="h-16 bg-slate-800/50 rounded-xl border border-slate-800/40 p-3 space-y-2">
              <div className="h-3 w-16 bg-slate-700/60 rounded"></div>
              <div className="h-4 w-28 bg-slate-700/80 rounded"></div>
            </div>
            <div className="sm:col-span-2 h-16 bg-slate-800/50 rounded-xl border border-slate-800/40 p-3 space-y-2">
              <div className="h-3 w-28 bg-slate-700/60 rounded"></div>
              <div className="h-4 w-full bg-slate-700/80 rounded"></div>
            </div>
          </div>

          {/* Action skeleton */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-slate-800 rounded-xl"></div>
              <div className="h-8 w-24 bg-slate-800 rounded-xl"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
