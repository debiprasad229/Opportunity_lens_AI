import { app } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

app.listen(config.port, () => {
  logger.info(`=======================================================`);
  logger.info(` OpportunityLens AI Server running on port ${config.port}`);
  logger.info(` Environment: ${config.nodeEnv}`);
  logger.info(` Gemini Model: ${config.geminiModel}`);
  logger.info(` API Key Status: ${config.geminiApiKey ? 'Configured' : 'Missing (Heuristic Fallback Active)'}`);
  logger.info(`=======================================================`);
});
