import { runEvaluationSuite } from './evaluationSuite.js';

async function main() {
  console.log('='.repeat(95));
  console.log(' OPPORTUNITYLENS AI — AMD MATCH 4 REPRODUCIBLE EVALUATION BENCHMARK');
  console.log(' Intelligent Web Information Retrieval & Fact-Grounding Audit');
  console.log('='.repeat(95));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Node.js: ${process.version}`);
  console.log('-'.repeat(95));

  const summary = await runEvaluationSuite();

  console.log('\nINDIVIDUAL TEST CASE RESULTS:');
  console.log('-'.repeat(95));
  console.log(
    'ID'.padEnd(7) +
    'Category'.padEnd(26) +
    'Status'.padEnd(10) +
    'Field Acc'.padEnd(12) +
    'Evidence'.padEnd(12) +
    'Latency'.padEnd(12) +
    'Notes'
  );
  console.log('-'.repeat(95));

  for (const r of summary.caseResults) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    const acc = `${r.fieldAccuracy.accuracyPercent}%`;
    const cov = `${r.evidenceCoverage.coveragePercent}%`;
    const lat = `${r.latencyMs}ms`;
    const note = r.notes.join('; ') || 'OK';

    console.log(
      r.id.padEnd(7) +
      r.category.padEnd(26) +
      status.padEnd(10) +
      acc.padEnd(12) +
      cov.padEnd(12) +
      lat.padEnd(12) +
      note.slice(0, 40)
    );
    if (!r.passed && Object.keys(r.fieldAccuracy.details).length > 0) {
      console.log('   Mismatch details:', JSON.stringify(r.fieldAccuracy.details));
    }
  }

  console.log('='.repeat(95));
  console.log('AGGREGATED EVALUATION METRICS:');
  console.log('-'.repeat(95));
  console.log(`• Test Cases Evaluated:       ${summary.totalCases} / ${summary.totalCases}`);
  console.log(`• Test Cases Passed:          ${summary.passedCases} / ${summary.totalCases} (${Math.round((summary.passedCases / summary.totalCases) * 100)}%)`);
  console.log(`• Field-Level Fact Accuracy:  ${summary.overallFieldAccuracyPercent}% (Grounded vs Ground Truth)`);
  console.log(`• Verbatim Evidence Coverage: ${summary.overallEvidenceCoveragePercent}% (Grounded in Source Quotes)`);
  console.log(`• Source Validity:            ${summary.sourceValidityPercent}% (SSRF & URL Safe)`);
  console.log(`• Retrieval Relevance:        ${summary.retrievalRelevancePercent}% (Internship vs Irrelevant Classification)`);
  console.log(`• Average Processing Latency: ${summary.averageLatencyMs}ms`);
  console.log('='.repeat(95));

  if (summary.passedCases < summary.totalCases) {
    console.error(`\nEvaluation failed: ${summary.totalCases - summary.passedCases} test case(s) did not meet ground truth.`);
    process.exit(1);
  } else {
    console.log('\nAll 10 evaluation test cases passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Benchmark crashed:', err);
  process.exit(1);
});
