import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import researchRouter from './routes/research.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security and middleware
app.use(cors({
  origin: '*', // In development; adjust as necessary
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Route handlers
app.use('/api/health', healthRouter);
app.use('/api/research', researchRouter);

// Central error handling
app.use(errorHandler);
