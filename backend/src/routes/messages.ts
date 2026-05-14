import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendWhatsAppTextMessage } from '../services/whatsapp.js';
import { sendMessageSchema } from '../utils/validators.js';
import type { AuthRequest } from '../types.js';

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

messagesRouter.post('/send', async (req: AuthRequest, res, next) => {
  try {
    const input = sendMessageSchema.parse(req.body);
    const conversation = await query<{ phone_number: string }>(
      `select ct.phone_number
       from conversations c
       join contacts ct on ct.id = c.contact_id
       where c.id = $1`,
      [input.conversationId]
    );

    if (conversation.rowCount === 0) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const result = await sendWhatsAppTextMessage({
      to: conversation.rows[0].phone_number,
      text: input.text
    });

    const providerId = result.messages?.[0]?.id ?? null;
    const { rows } = await query(
      `insert into messages (conversation_id, direction, provider_message_id, body, message_type, status, created_by)
       values ($1, 'outbound', $2, $3, 'text', 'sent', $4)
       returning *`,
      [input.conversationId, providerId, input.text, req.user?.id ?? null]
    );

    await query('update conversations set status = $2, last_message_at = now(), updated_at = now() where id = $1', [
      input.conversationId,
      'in_progress'
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    return next(error);
  }
});
