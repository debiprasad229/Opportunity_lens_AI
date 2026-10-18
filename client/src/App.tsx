import { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  Table,
  Globe,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
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
import {
  fetchHealth,
  HealthInfo,
  conductResearchStream,
  conductResearchRest,
} from './services/api';

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

  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Check health on mount
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
              console.warn('Pipeline warning:', data.message);
            },
            onComplete: (completedResult) => {
              setResult(completedResult);
              setCurrentStep('completed');
              setIsLoading(false);
            },
            onError: (err) => {
              console.warn('SSE failed, falling back to REST pipeline:', err);
              // Fallback to REST if SSE encountered an issue
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

  // Filter opportunities
  const displayedOpportunities = (result ? result.opportunities : streamingOpportunities).filter(
    (opp) => {
      if (onlyVerified) {
        const hasVerifiedStipendOrDeadline =
          opp.stipend.status === 'verified' || opp.deadline.status === 'verified';
        if (!hasVerifiedStipendOrDeadline) return false;
      }

      if (filterQuery.trim()) {
        const queryTerm = filterQuery.toLowerCase();
        const text = `
          ${opp.companyName.value || ''}
          ${opp.roleTitle.value || ''}
          ${opp.eligibility.value || ''}
          ${opp.sourceDomain}
        `.toLowerCase();
        return text.includes(queryTerm);
      }

      return true;
    }
  );

  // Export results as JSON
  const handleExportJson = () => {
    if (!result) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `opportunity-lens-results-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <Navbar health={health} onOpenArchitectureModal={() => setIsModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <span>Autonomous Web Research Agent</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
            <span>Zero Hallucination Fact Grounding</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Verify Software Internships from the Public Web
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            OpportunityLens searches the live web for fresh graduate roles, extracts eligibility, stipend, and deadlines, and verifies every claim against verbatim source quotes.
          </p>
        </div>

        {/* Search Bar & Suggestions */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        <SuggestedQueries onSelectQuery={(q) => handleSearch(q)} disabled={isLoading} />

        {/* Error Notification */}
        {error && (
          <div className="max-w-4xl mx-auto my-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded text-rose-400 hover:text-rose-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Progress Tracker */}
        {(isLoading || timeline.length > 1) && (
          <ProgressTracker
            currentStep={currentStep}
            timeline={result ? result.timeline : timeline}
            isStreaming={isLoading}
          />
        )}

        {/* Metrics Banner */}
        {result && <MetricsBanner result={result} />}

        {/* Results Container */}
        {(result || streamingOpportunities.length > 0) && (
          <div className="mt-8">
            {/* View Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              {/* Tab navigation */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 w-fit">
                <button
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

              {/* In-view search and filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter by company or role..."
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
                  />
                </div>

                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                    onlyVerified
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Only</span>
                </button>

                {result && (
                  <button
                    onClick={handleExportJson}
                    className="p-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition"
                    title="Export Research Data as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Tab View */}
            {activeTab === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                {displayedOpportunities.map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            )}

            {activeTab === 'table' && (
              <ComparisonTable opportunities={displayedOpportunities} />
            )}

            {activeTab === 'sources' && result && (
              <SourcesConsulted sources={result.sourcesConsulted} />
            )}
          </div>
        )}

        {/* Empty State when no results and not loading */}
        {!result && streamingOpportunities.length === 0 && !isLoading && (
          <EmptyState onSelectQuery={(q) => handleSearch(q)} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 OpportunityLens AI • AMD AI League Match 4 Intelligent Web Information Retrieval</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="hover:text-indigo-400 transition"
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
