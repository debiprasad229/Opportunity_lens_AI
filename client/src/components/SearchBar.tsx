import React, { useState } from 'react';
import { Search, MapPin, SlidersHorizontal, Loader2, X, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, locationFilter?: string, maxResults?: number) => void;
  isLoading: boolean;
  initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(8);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim(), location.trim() || undefined, maxResults);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        {/* Main Search Input Container */}
        <div className="glass-panel rounded-2xl p-2 sm:p-2.5 shadow-2xl shadow-indigo-500/5 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5 text-indigo-400" />
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Software developer internships 2026 for fresh graduates with stipend"
              disabled={isLoading}
              className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 text-sm sm:text-base font-normal"
            />

            {query && !isLoading && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                showAdvanced
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Toggle filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-4 sm:px-6 py-2.5 rounded-xl font-medium text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 flex items-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Retrieving...</span>
                </>
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Advanced Filters Expandable Drawer */}
          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 px-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <label className="text-slate-400 shrink-0">Location / Remote:</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, Bangalore, London"
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-400 shrink-0">Candidates Limit:</label>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5 Sites (Fastest)</option>
                  <option value={8}>8 Sites (Recommended)</option>
                  <option value={12}>12 Sites (Deep Retrieval)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
