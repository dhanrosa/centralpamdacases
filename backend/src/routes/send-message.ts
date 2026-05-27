import { Router } from 'express';
import { z } from 'zod';
import { sendWhatsAppTextMessage } from '../services/whatsapp.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizePhone, requireSupabaseAdmin, upsertConversa } from '../supabase.js';

export const sendMessageRouter = Router();

const schema = z.object({
  phone: z.string().trim().min(10).max(30),
  text: z.string().trim().min(1).max(4096)
});

sendMessageRouter.use(requireAuth);

sendMessageRouter.post('/', async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const phone = normalizePhone(input.phone);

    if (phone.length < 10) {
      return res.status(400).json({ message: 'Telefone invalido. Use DDI, DDD e numero.' });
    }

    const result = await sendWhatsAppTextMessage({ to: phone, text: input.text });
    const metaMessageId = result.messages?.[0]?.id ?? null;
    const conversa = await upsertConversa({
      phone,
      lastMessage: input.text,
      lastMessageAt: new Date().toISOString()
    });

    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('mensagens')
      .insert({
        conversa_id: conversa.id,
        phone,
        direction: 'outbound',
        type: 'text',
        body: input.text,
        meta_message_id: metaMessageId,
        status: 'sent',
        raw: result
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({ conversa, message: data });
  } catch (error) {
    return next(error);
  }
});
