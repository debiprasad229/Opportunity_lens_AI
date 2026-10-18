import { ResearchRequest, ResearchResult, InternshipOpportunity } from '../../../shared/types';

export interface HealthInfo {
  status: string;
  service: string;
  uptimeSeconds: number;
  capabilities: {
    geminiLlmConfigured: boolean;
    model: string;
    keylessSearchActive: boolean;
    ssrfGuardActive: boolean;
    streamingSseSupported: boolean;
  };
}

export async function fetchHealth(): Promise<HealthInfo> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Failed to check server health: ${response.statusText}`);
  }
  return response.json();
}

export async function conductResearchRest(params: ResearchRequest): Promise<ResearchResult> {
  const response = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Research request failed with HTTP ${response.status}`);
  }

  return response.json();
}

export interface StreamCallbacks {
  onStep: (data: { step: string; message: string; variants?: string[]; count?: number }) => void;
  onOpportunity: (opp: InternshipOpportunity) => void;
  onWarning: (data: { message: string }) => void;
  onComplete: (result: ResearchResult) => void;
  onError: (err: Error) => void;
}

export function conductResearchStream(
  params: ResearchRequest,
  callbacks: StreamCallbacks
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser or empty response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          let eventType = 'message';
          let dataStr = '';

          const subLines = line.split('\n');
          for (const sub of subLines) {
            if (sub.startsWith('event: ')) {
              eventType = sub.replace('event: ', '').trim();
            } else if (sub.startsWith('data: ')) {
              dataStr = sub.replace('data: ', '').trim();
            }
          }

          if (dataStr) {
            try {
              const parsedData = JSON.parse(dataStr);
              if (eventType === 'step') {
                callbacks.onStep(parsedData);
              } else if (eventType === 'opportunity') {
                callbacks.onOpportunity(parsedData);
              } else if (eventType === 'warning') {
                callbacks.onWarning(parsedData);
              } else if (eventType === 'complete') {
                callbacks.onComplete(parsedData);
              } else if (eventType === 'error') {
                callbacks.onError(new Error(parsedData.message));
              }
            } catch (err) {
              console.warn('Could not parse SSE message:', dataStr, err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    }
  })();

  return () => {
    controller.abort();
  };
}
