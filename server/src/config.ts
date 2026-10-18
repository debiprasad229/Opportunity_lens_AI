import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or server
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS || '8', 10),
  fetchTimeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS || '8000', 10),
  maxResponseSizeBytes: parseInt(process.env.MAX_RESPONSE_SIZE_BYTES || '2097152', 10), // 2MB
  maxConcurrentFetches: parseInt(process.env.MAX_CONCURRENT_FETCHES || '5', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10),
};
