import { Router } from 'express';
import { env } from '../config.js';
import { query } from '../db.js';
import { logger } from '../logger.js';
import { isValidMetaSignature } from '../utils/crypto.js';
import type { AuthRequest } from '../types.js';

export const webhookRouter = Router();

webhookRouter.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN && typeof challenge === 'string') {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

webhookRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const signature = req.header('x-hub-signature-256');

    if (!isValidMetaSignature(req.rawBody, signature)) {
      return res.status(401).json({ message: 'Assinatura do webhook inválida.' });
    }

    const payload = req.body;
    const changes = payload?.entry?.flatMap((entry: any) => entry.changes ?? []) ?? [];

    for (const change of changes) {
      const value = change.value;
      const contacts = value?.contacts ?? [];
      const messages = value?.messages ?? [];
      const statuses = value?.statuses ?? [];

      for (const status of statuses) {
        await query(
          `update messages
           set status = $2, updated_at = now()
           where provider_message_id = $1`,
          [status.id, status.status]
        );
      }

      for (const message of messages) {
        if (message.type !== 'text') {
          logger.info({ providerMessageId: message.id, type: message.type }, 'Mensagem não textual registrada como evento.');
        }

        const contactInfo = contacts.find((contact: any) => contact.wa_id === message.from);
        const contactName = contactInfo?.profile?.name ?? null;
        const phoneNumber = message.from;
        const body = message.text?.body ?? `[${message.type}]`;

        const contact = await query<{ id: string }>(
          `insert into contacts (phone_number, name)
           values ($1, $2)
           on conflict (phone_number) do update
             set name = coalesce(excluded.name, contacts.name),
                 updated_at = now()
           returning id`,
          [phoneNumber, contactName]
        );

        const conversation = await query<{ id: string }>(
          `insert into conversations (contact_id, status, last_message_at)
           values ($1, 'new', now())
           on conflict (contact_id) where status <> 'closed' do update
             set last_message_at = now(),
                 updated_at = now()
           returning id`,
          [contact.rows[0].id]
        );

        await query(
          `insert into messages (conversation_id, direction, provider_message_id, body, message_type, status, provider_payload)
           values ($1, 'inbound', $2, $3, $4, 'received', $5)
           on conflict (provider_message_id) do nothing`,
          [conversation.rows[0].id, message.id, body, message.type, value]
        );
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
});

