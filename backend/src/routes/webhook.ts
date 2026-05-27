import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../config.js';
import { requireSupabaseAdmin, normalizePhone, upsertConversa } from '../supabase.js';

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

  const verifyToken = env.VERIFY_TOKEN || env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && typeof challenge === 'string') {
    console.log('Webhook verified successfully');
    return res.status(200).type('text/plain').send(challenge);
  }

  console.log('Webhook verification failed');
  return res.sendStatus(403);
}

webhookRouter.get('/', handleWebhookVerification);

function isoFromMetaTimestamp(timestamp: string | number | undefined) {
  const date = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
}

function extractMessageBody(message: any) {
  if (message?.type === 'text' && message?.text?.body) return String(message.text.body);
  if (message?.button?.text) return String(message.button.text);
  if (message?.interactive?.button_reply?.title) return String(message.interactive.button_reply.title);
  if (message?.interactive?.list_reply?.title) return String(message.interactive.list_reply.title);
  return `[${message?.type ?? 'mensagem'}]`;
}

async function ingestWebhookPayload(payload: any) {
  const supabase = requireSupabaseAdmin();
  const changes = payload?.entry?.flatMap((entry: any) => entry.changes ?? []) ?? [];
  let foundMessages = 0;

  console.log('Meta webhook processing started', {
    entries: payload?.entry?.length ?? 0,
    changes: changes.length
  });

  for (const change of changes) {
    const value = change?.value;
    const contacts = value?.contacts ?? [];
    const messages = value?.messages ?? [];
    const statuses = value?.statuses ?? [];

    if (statuses.length > 0) {
      console.log('Meta webhook statuses received', { count: statuses.length });
    }

    for (const message of messages) {
      const phone = normalizePhone(String(message.from ?? ''));
      if (!phone) {
        console.log('Meta webhook message ignored without phone', { id: message?.id });
        continue;
      }

      foundMessages += 1;
      const contact = contacts.find((item: any) => normalizePhone(String(item?.wa_id ?? '')) === phone);
      const name = contact?.profile?.name ? String(contact.profile.name) : null;
      const type = String(message.type ?? 'text');
      const body = extractMessageBody(message);
      const createdAt = isoFromMetaTimestamp(message.timestamp);
      const metaMessageId = message.id ? String(message.id) : null;

      const conversa = await upsertConversa({
        phone,
        name,
        lastMessage: body,
        lastMessageAt: createdAt
      });

      const { error } = await supabase.from('mensagens').insert({
        conversa_id: conversa.id,
        phone,
        direction: 'inbound',
        type,
        body,
        meta_message_id: metaMessageId,
        status: 'received',
        raw: message,
        created_at: createdAt
      });

      if (error) {
        throw error;
      }

      console.log('Meta webhook inbound message saved', {
        conversaId: conversa.id,
        phone,
        type,
        metaMessageId
      });
    }
  }

  return { foundMessages };
}

webhookRouter.post('/', (req, res) => {
  console.log('WEBHOOK RECEBIDO', {
    object: req.body?.object,
    entries: req.body?.entry?.length ?? 0
  });

  res.status(200).json({ received: true });

  void ingestWebhookPayload(req.body)
    .then((result) => {
      if (result.foundMessages === 0) {
        console.log('Nenhuma mensagem encontrada no payload');
      }
    })
    .catch((error) => {
      console.error('Falha ao processar webhook da Meta', error);
    });
});
