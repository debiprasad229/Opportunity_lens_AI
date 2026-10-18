import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const researchRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Please wait a minute before starting another research session.`,
  },
});
