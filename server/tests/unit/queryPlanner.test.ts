import { describe, it, expect } from 'vitest';
import { queryPlanner } from '../../src/services/queryPlanner.js';

describe('QueryPlanner', () => {
  it('should generate multiple search variants for a raw prompt', () => {
    const plan = queryPlanner.plan('React developer internship for fresh graduates 2026');
    expect(plan.originalQuery).toBe('React developer internship for fresh graduates 2026');
    expect(plan.searchVariants.length).toBeGreaterThan(1);
    expect(plan.intent.specificTech).toContain('react');
  });

  it('should detect location filter when provided', () => {
    const plan = queryPlanner.plan('Python intern', 'London');
    expect(plan.intent.location).toBe('London');
    const hasLocation = plan.searchVariants.some(v => v.includes('London'));
    expect(hasLocation).toBe(true);
  });
});
