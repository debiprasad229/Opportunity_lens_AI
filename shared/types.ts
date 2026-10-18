export type VerificationStatus = 'verified' | 'partial' | 'unverified' | 'unknown';

export interface FieldEvidence {
  value: string | null;
  status: VerificationStatus;
  sourceText?: string;
  sourceUrl?: string;
  confidenceScore?: number; // 0.0 - 1.0
  notes?: string;
}

export interface InternshipOpportunity {
  id: string;
  companyName: FieldEvidence;
  roleTitle: FieldEvidence;
  eligibility: FieldEvidence;
  stipend: FieldEvidence;
  deadline: FieldEvidence;
  officialApplicationLink: FieldEvidence;
  sourceDomain: string;
  sourceUrl: string;
  overallScore: number; // 0 - 100
  discoveredAt: string; // ISO string
  summary: string;
  isStaleOrClosed?: boolean;
}

export interface ResearchPlanStep {
  step: 'planning' | 'searching' | 'fetching' | 'extracting' | 'verifying' | 'ranking' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ResearchResult {
  query: string;
  generatedQueryVariants: string[];
  opportunities: InternshipOpportunity[];
  sourcesConsulted: Array<{
    title: string;
    url: string;
    domain: string;
    fetchedSuccessfully: boolean;
    errorReason?: string;
  }>;
  timeline: ResearchPlanStep[];
  totalDiscovered: number;
  verifiedCount: number;
  partialCount: number;
  unknownCount: number;
  executionTimeMs: number;
}

export interface ResearchRequest {
  query: string;
  maxResults?: number;
  locationFilter?: string;
  includeRemoteOnly?: boolean;
}

export interface StreamEvent {
  type: 'step' | 'opportunity' | 'warning' | 'complete' | 'error';
  data: any;
}
