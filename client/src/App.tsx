import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutGrid,
  Table,
  Globe,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  DollarSign,
  ShieldCheck,
  Search,
} from 'lucide-react';
import {
  ResearchResult,
  ResearchPlanStep,
  InternshipOpportunity,
} from '../../shared/types';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { SuggestedQueries } from './components/SuggestedQueries';
import { ProgressTracker } from './components/ProgressTracker';
import { OpportunityCard } from './components/OpportunityCard';
import { ComparisonTable } from './components/ComparisonTable';
import { SourcesConsulted } from './components/SourcesConsulted';
import { MetricsBanner } from './components/MetricsBanner';
import { EmptyState } from './components/EmptyState';
import { ArchitectureModal } from './components/ArchitectureModal';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import {
  fetchHealth,
  HealthInfo,
  conductResearchStream,
  conductResearchRest,
} from './services/api';

type StatusFilter = 'all' | 'verified' | 'hasStipend' | 'activeOnly';
type SortOption = 'score' | 'company' | 'deadline';

export function App() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ResearchPlanStep['step']>('planning');
  const [timeline, setTimeline] = useState<ResearchPlanStep[]>([]);
  const [streamingOpportunities, setStreamingOpportunities] = useState<InternshipOpportunity[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'table' | 'sources'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search & Filter State
  const [lastQuery, setLastQuery] = useState<{ query: string; location?: string; maxResults?: number } | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('score');

  // Check backend health on mount
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Health check failed:', err));
  }, []);

  const handleSearch = useCallback(
    async (queryText: string, locationFilter?: string, maxResults: number = 8) => {
      setIsLoading(true);
      setError(null);
      setStreamingOpportunities([]);
      setResult(null);
      setCurrentStep('planning');
      setLastQuery({ query: queryText, location: locationFilter, maxResults });

      setTimeline([
        {
          step: 'planning',
          message: `Deconstructing query: "${queryText}"`,
          timestamp: new Date().toISOString(),
        },
      ]);

      const appendStep = (step: ResearchPlanStep['step'], message: string) => {
        setCurrentStep(step);
        setTimeline((prev) => [
          ...prev,
          { step, message, timestamp: new Date().toISOString() },
        ]);
      };

      // Attempt SSE streaming first
      try {
        conductResearchStream(
          { query: queryText, locationFilter, maxResults },
          {
            onStep: (data) => {
              appendStep(data.step as ResearchPlanStep['step'], data.message);
            },
            onOpportunity: (opp) => {
              setStreamingOpportunities((prev) => [...prev, opp]);
            },
            onWarning: (data) => {
              console.warn('Pipeline notice:', data.message);
            },
            onComplete: (completedResult) => {
              setResult(completedResult);
              setCurrentStep('completed');
              setIsLoading(false);
            },
            onError: (err) => {
              console.warn('SSE disconnected, falling back to REST pipeline:', err);
              // Fallback to standard REST if SSE fails
              conductResearchRest({ query: queryText, locationFilter, maxResults })
                .then((restResult) => {
                  setResult(restResult);
                  setCurrentStep('completed');
                  setIsLoading(false);
                })
                .catch((restErr) => {
                  setError(restErr.message || 'Retrieval failed');
                  setIsLoading(false);
                });
            },
          }
        );
      } catch (err: any) {
        // Fallback to REST
        try {
          const restResult = await conductResearchRest({
            query: queryText,
            locationFilter,
            maxResults,
          });
          setResult(restResult);
          setCurrentStep('completed');
        } catch (restErr: any) {
          setError(restErr.message || 'Retrieval failed');
        } finally {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const handleRetry = () => {
    if (lastQuery) {
      handleSearch(lastQuery.query, lastQuery.location, lastQuery.maxResults);
    }
  };

  const handleResetFilters = () => {
    setFilterQuery('');
    setStatusFilter('all');
    setSortBy('score');
  };

  // Base opportunities list from either final result or live stream
  const baseOpportunities = result ? result.opportunities : streamingOpportunities;

  // Filter and sort opportunities
  const displayedOpportunities = useMemo(() => {
    const filtered = baseOpportunities.filter((opp) => {
      // 1. Status Filter
      if (statusFilter === 'verified') {
        const hasVerifiedCore =
          opp.stipend.status === 'verified' || opp.deadline.status === 'verified' || opp.eligibility.status === 'verified';
        if (!hasVerifiedCore) return false;
      } else if (statusFilter === 'hasStipend') {
        if (!opp.stipend.value || opp.stipend.status === 'unknown') return false;
      } else if (statusFilter === 'activeOnly') {
        if (opp.isStaleOrClosed) return false;
      }

      // 2. Free text search
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const haystack = `
          ${opp.companyName.value || ''}
          ${opp.roleTitle.value || ''}
          ${opp.eligibility.value || ''}
          ${opp.sourceDomain}
        `.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // 3. Sorting
    return filtered.sort((a, b) => {
      if (sortBy === 'company') {
        return (a.companyName.value || '').localeCompare(b.companyName.value || '');
      }
      if (sortBy === 'deadline') {
        const dateA = a.deadline.normalizedDate || a.deadline.value || '';
        const dateB = b.deadline.normalizedDate || b.deadline.value || '';
        return dateA.localeCompare(dateB);
      }
      // Default: score
      return b.overallScore - a.overallScore;
    });
  }, [baseOpportunities, statusFilter, filterQuery, sortBy]);

  // Export results as JSON
  const handleExportJson = () => {
    if (!result) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `opportunity-lens-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans">
      {/* Navigation Bar */}
      <Navbar health={health} onOpenArchitectureModal={() => setIsModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autonomous Web Research Agent</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
            <span>Zero Hallucination Fact Grounding</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Verify Software Internships from the Public Web
          </h1>

          <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            OpportunityLens AI retrieves live tech internships for fresh graduates, parses official career pages, and grounds eligibility, stipend, and deadline facts in verbatim source quotes.
          </p>
        </div>

        {/* Search Bar & Suggested Queries */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        <SuggestedQueries onSelectQuery={(q) => handleSearch(q)} disabled={isLoading} />

        {/* Error Notification with Retry Action */}
        {error && (
          <div className="max-w-4xl mx-auto my-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold text-rose-200">Information Retrieval Encountered an Error</p>
                <p className="text-rose-300/80 mt-0.5">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              {lastQuery && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-3 py-1.5 rounded-xl font-semibold bg-rose-900/60 hover:bg-rose-850 text-white border border-rose-700/60 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Search</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setError(null)}
                className="p-1.5 rounded-xl text-rose-400 hover:text-white hover:bg-rose-900/40 transition"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Live Research Progress Tracker */}
        {(isLoading || timeline.length > 1) && (
          <ProgressTracker
            currentStep={currentStep}
            timeline={result ? result.timeline : timeline}
            isStreaming={isLoading}
          />
        )}

        {/* Summary Metrics Banner */}
        {result && <MetricsBanner result={result} />}

        {/* Loading Skeletons */}
        {isLoading && baseOpportunities.length === 0 && <LoadingSkeleton />}

        {/* Results Container */}
        {(result || baseOpportunities.length > 0) && (
          <div className="mt-8">
            {/* View Switcher and Filter Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/90">
              {/* Tab Navigation */}
              <div
                role="tablist"
                aria-label="View switch"
                className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 w-fit"
              >
                <button
                  role="tab"
                  aria-selected={activeTab === 'cards'}
                  onClick={() => setActiveTab('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'cards'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards ({displayedOpportunities.length})</span>
                </button>

                <button
                  role="tab"
                  aria-selected={activeTab === 'table'}
                  onClick={() => setActiveTab('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'table'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Matrix Table</span>
                </button>

                <button
                  role="tab"
                  aria-selected={activeTab === 'sources'}
                  onClick={() => setActiveTab('sources')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'sources'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Sources ({result ? result.sourcesConsulted.length : 0})</span>
                </button>
              </div>

              {/* Filters & Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search in results */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter in results..."
                    className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-44 sm:w-52"
                    aria-label="Filter opportunities by keyword"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'verified' ? 'all' : 'verified')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      statusFilter === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Show only postings with verified grounded claims"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Verified</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'hasStipend' ? 'all' : 'hasStipend')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      statusFilter === 'hasStipend'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Show postings with disclosed stipend"
                  >
                    <DollarSign className="w-3 h-3 text-indigo-400" />
                    <span>Paid</span>
                  </button>
                </div>

                {/* Sort Option Dropdown */}
                <div className="flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    aria-label="Sort opportunities"
                  >
                    <option value="score">Sort: Quality Score</option>
                    <option value="company">Sort: Company</option>
                    <option value="deadline">Sort: Deadline</option>
                  </select>
                </div>

                {/* Export JSON Button */}
                {result && (
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="p-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition"
                    title="Export audited research data as JSON"
                    aria-label="Export results as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Results Count Banner */}
            <div className="py-2.5 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing <strong className="text-slate-200">{displayedOpportunities.length}</strong> of{' '}
                <strong className="text-slate-200">{baseOpportunities.length}</strong> retrieved opportunities
              </span>
              {(filterQuery || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Active Tab View */}
            {activeTab === 'cards' && (
              <>
                {displayedOpportunities.length === 0 ? (
                  <EmptyState
                    onSelectQuery={(q) => handleSearch(q)}
                    isFilterEmpty={true}
                    onResetFilters={handleResetFilters}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                    {displayedOpportunities.map((opp) => (
                      <OpportunityCard key={opp.id} opportunity={opp} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'table' && (
              <>
                {displayedOpportunities.length === 0 ? (
                  <EmptyState
                    onSelectQuery={(q) => handleSearch(q)}
                    isFilterEmpty={true}
                    onResetFilters={handleResetFilters}
                  />
                ) : (
                  <ComparisonTable opportunities={displayedOpportunities} />
                )}
              </>
            )}

            {activeTab === 'sources' && result && (
              <SourcesConsulted sources={result.sourcesConsulted} />
            )}
          </div>
        )}

        {/* Initial Empty State when no results and not loading */}
        {!result && baseOpportunities.length === 0 && !isLoading && (
          <EmptyState onSelectQuery={(q) => handleSearch(q)} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 OpportunityLens AI • AMD AI League Match 4 Intelligent Web Information Retrieval</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-slate-400 hover:text-indigo-400 transition underline underline-offset-2"
            >
              Grounding & Safety Architecture
            </button>
          </div>
        </div>
      </footer>

      {/* Architecture Modal */}
      <ArchitectureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;
