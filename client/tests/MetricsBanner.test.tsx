import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MetricsBanner } from '../src/components/MetricsBanner';
import { ResearchResult } from '../../shared/types';

describe('MetricsBanner Component', () => {
  it('renders research metrics correctly', () => {
    const mockResult: ResearchResult = {
      query: 'React Intern',
      generatedQueryVariants: [],
      opportunities: [],
      sourcesConsulted: [],
      timeline: [],
      totalDiscovered: 7,
      verifiedCount: 14,
      partialCount: 3,
      unknownCount: 5,
      executionTimeMs: 4200,
    };

    render(<MetricsBanner result={mockResult} />);
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('14')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('4.2s')).toBeDefined();
  });
});
