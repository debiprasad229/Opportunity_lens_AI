import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('GET /api/health', () => {
  it('should return 200 OK with service status and capabilities', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('OpportunityLens AI');
    expect(res.body.capabilities.keylessSearchActive).toBe(true);
    expect(res.body.capabilities.ssrfGuardActive).toBe(true);
  });
});
