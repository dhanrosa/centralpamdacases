import express from 'express';
import { pinoHttp } from 'pino-http';
import { ZodError } from 'zod';
import { authRouter } from './routes/auth.js';
import { conversationsRouter } from './routes/conversations.js';
import { messagesRouter } from './routes/messages.js';
import { settingsRouter } from './routes/settings.js';
import { usersRouter } from './routes/users.js';
import { handleWebhookVerification, webhookRouter } from './routes/webhook.js';
import { apiLimiter, corsMiddleware, helmetMiddleware } from './middleware/security.js';
import { logger } from './logger.js';

export const app = express();

app.use(pinoHttp({ logger }));
app.use((req, _res, next) => {
  console.log(`Request received: ${req.method} ${req.originalUrl}`);
  next();
});
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(apiLimiter);
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = Buffer.from(buf);
    }
  })
);

app.get('/', (req, res) => {
  if (req.query['hub.mode'] || req.query['hub.verify_token'] || req.query['hub.challenge']) {
    return handleWebhookVerification(req, res);
  }

  return res.json({
    status: 'ok',
    service: 'central-pamda-backend',
    webhook: '/api/webhook'
  });
});
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/webhook', webhookRouter);

app.use('/api/auth', authRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/settings', settingsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Dados inválidos.', issues: error.flatten() });
  }

  logger.error(error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
});
