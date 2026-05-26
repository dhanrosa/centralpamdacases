import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendWhatsAppTextMessage } from '../services/whatsapp.js';
import { emitSocketEvent } from '../socket.js';
import { sendMessageSchema } from '../utils/validators.js';
import type { AuthRequest } from '../types.js';

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

messagesRouter.post('/send', async (req: AuthRequest, res, next) => {
  try {
    const input = sendMessageSchema.parse(req.body);
    const conversation = await query<{ wa_id: string }>(
      `select ct.wa_id
       from conversations c
       join contacts ct on ct.id = c.contact_id
       where c.id = $1`,
      [input.conversation_id]
    );

    if (conversation.rowCount === 0) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const result = await sendWhatsAppTextMessage({
      to: conversation.rows[0].wa_id,
      text: input.body
    });

    const providerId = result.messages?.[0]?.id ?? null;
    const { rows } = await query(
      `insert into messages (conversation_id, wa_message_id, direction, type, body, from_wa_id, to_wa_id, sent_by_user_id, status, raw_payload)
       values ($1, $2, 'outbound', 'text', $3, $4, $5, $6, 'sent', $7)
       returning id, conversation_id, wa_message_id, direction, type, body, from_wa_id, to_wa_id, sent_by_user_id, status, created_at`,
      [
        input.conversation_id,
        providerId,
        input.body,
        null,
        conversation.rows[0].wa_id,
        req.user?.id ?? null,
        result
      ]
    );

    await query('update conversations set status = $2, last_message_at = now(), updated_at = now() where id = $1', [
      input.conversation_id,
      'in_progress'
    ]);

    emitSocketEvent('message:sent', {
      conversation_id: input.conversation_id,
      message: { ...rows[0], sent_by_user_name: req.user?.name ?? null }
    });
    emitSocketEvent('conversation:updated', { id: input.conversation_id });

    return res.status(201).json(rows[0]);
  } catch (error) {
    return next(error);
  }
});
