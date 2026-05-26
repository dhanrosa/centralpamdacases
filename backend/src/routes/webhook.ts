import { Router } from 'express';
import { env } from '../config.js';

export const webhookRouter = Router();

webhookRouter.get('/', (req, res) => {
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
});

webhookRouter.post('/', (req, res) => {
  console.log('WhatsApp webhook POST received', JSON.stringify(req.body, null, 2));
  return res.sendStatus(200);
});
