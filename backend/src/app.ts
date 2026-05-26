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

  return res.type('html').send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Central Pamda Cases</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef5f2;
        color: #10211c;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(100%, 560px);
        background: #ffffff;
        border: 1px solid #d8e6e1;
        border-radius: 8px;
        padding: 32px;
        box-shadow: 0 18px 45px rgba(16, 33, 28, 0.08);
      }

      .mark {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: #16845c;
        color: #ffffff;
        font-weight: 800;
        margin-bottom: 24px;
      }

      h1 {
        margin: 0 0 10px;
        font-size: clamp(30px, 6vw, 44px);
        line-height: 1.05;
        letter-spacing: 0;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 28px;
        color: #24624d;
        font-weight: 700;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #20b879;
      }

      .webhook {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border: 1px solid #d8e6e1;
        border-radius: 8px;
        padding: 14px 16px;
        background: #f7faf9;
      }

      .webhook span {
        color: #60746d;
        font-size: 14px;
      }

      code {
        color: #10211c;
        font-weight: 800;
        font-size: 15px;
      }

      @media (max-width: 520px) {
        main {
          padding: 24px;
        }

        .webhook {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">P</div>
      <h1>Central Pamda Cases</h1>
      <p class="status"><span class="dot"></span>Backend online</p>
      <div class="webhook">
        <span>Webhook WhatsApp</span>
        <code>/api/webhook</code>
      </div>
    </main>
  </body>
</html>`);
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
