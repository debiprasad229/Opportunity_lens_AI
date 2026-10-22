import { describe, it, expect } from 'vitest';
import { runEvaluationSuite } from '../../src/evaluation/evaluationSuite.js';

describe('AMD Match 4 Evaluation Benchmark Suite', () => {
  it('should run 10 reproducible evaluation queries and achieve >=90% field accuracy and evidence coverage', async () => {
    const summary = await runEvaluationSuite();

    expect(summary.totalCases).toBeGreaterThanOrEqual(10);
    expect(summary.passedCases).toBe(summary.totalCases);
    expect(summary.overallFieldAccuracyPercent).toBeGreaterThanOrEqual(90);
    expect(summary.overallEvidenceCoveragePercent).toBeGreaterThanOrEqual(90);
    expect(summary.sourceValidityPercent).toBe(100);
    expect(summary.retrievalRelevancePercent).toBe(100);

    // Verify all individual cases passed
    for (const r of summary.caseResults) {
      expect(r.passed).toBe(true);
      expect(r.fieldAccuracy.accuracyPercent).toBeGreaterThanOrEqual(80);
    }
  }, 25000);
});
