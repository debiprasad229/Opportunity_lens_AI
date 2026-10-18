import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { VerificationBadge } from '../src/components/VerificationBadge';

describe('VerificationBadge Component', () => {
  it('renders verified state correctly', () => {
    render(<VerificationBadge status="verified" label="Verified Fact" />);
    expect(screen.getByText('Verified Fact')).toBeDefined();
  });

  it('renders unknown state correctly', () => {
    render(<VerificationBadge status="unknown" />);
    expect(screen.getByText('Unknown / Undisclosed')).toBeDefined();
  });

  it('renders confidence score when requested', () => {
    render(<VerificationBadge status="verified" confidenceScore={0.95} showScore={true} />);
    expect(screen.getByText('(95%)')).toBeDefined();
  });
});
