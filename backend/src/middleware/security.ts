import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config.js';

export const helmetMiddleware = helmet();

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  credentials: true
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

