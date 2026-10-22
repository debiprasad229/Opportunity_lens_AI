import { Router, Request, Response } from 'express';
import { geminiAdapter } from '../services/geminiAdapter.js';
import { searchProvider } from '../services/searchProvider.js';
import { config } from '../config.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'OpportunityLens AI Research Engine',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    capabilities: {
      geminiLlmConfigured: geminiAdapter.isAvailable(),
      model: config.geminiModel,
      searchProvider: searchProvider.getActiveProviderName(),
      keylessSearchActive: true,
      ssrfGuardActive: true,
      streamingSseSupported: true,
      followVacancyLinks: config.followVacancyLinks,
    },
  });
});

export default router;
