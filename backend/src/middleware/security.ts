import cors from 'cors';
import { createRequire } from 'module';
import type { RequestHandler } from 'express';
import type { Options as RateLimitOptions } from 'express-rate-limit';
import { env } from '../config.js';

const require = createRequire(import.meta.url);

type HelmetFactory = () => RequestHandler;
type RateLimitFactory = (options?: Partial<RateLimitOptions>) => RequestHandler;

const helmet = require('helmet') as HelmetFactory;
const rateLimit = require('express-rate-limit') as RateLimitFactory;

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
