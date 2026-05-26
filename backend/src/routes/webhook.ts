import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../config.js';
import { ingestWhatsAppWebhook } from '../whatsapp-store.js';

export const webhookRouter = Router();

export function handleWebhookVerification(req: Request, res: Response) {
  console.log('Webhook verification request received', {
    mode: req.query['hub.mode'],
    hasVerifyToken: Boolean(req.query['hub.verify_token']),
    challenge: req.query['hub.challenge']
  });

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN && typeof challenge === 'string') {
    console.log('Webhook verified successfully');
    return res.status(200).type('text/plain').send(challenge);
  }

  console.log('Webhook verification failed');
  return res.sendStatus(403);
}

webhookRouter.get('/', handleWebhookVerification);

webhookRouter.post('/', (req, res) => {
  console.log('WEBHOOK RECEBIDO');
  console.log(JSON.stringify(req.body, null, 2));
  const result = ingestWhatsAppWebhook(req.body);
  if (result.foundMessages === 0) {
    console.log('Nenhuma mensagem encontrada no payload');
  }
  return res.status(200).json({ received: true });
});
