import { Router } from 'express';
import { z } from 'zod';
import { sendWhatsAppTextMessage } from '../services/whatsapp.js';
import { requireAuth } from '../middleware/auth.js';
import { insertMensagem, normalizePhone, upsertConversa } from '../supabase.js';

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
    console.log('WhatsApp message sent successfully', { phone, metaMessageId });

    const conversa = await upsertConversa({
      phone,
      lastMessage: input.text,
      lastMessageAt: new Date().toISOString()
    });

    const data = await insertMensagem({
      conversaId: conversa.id,
      phone,
      direction: 'outbound',
      type: 'text',
      body: input.text,
      metaMessageId,
      status: 'sent',
      raw: result
    });

    console.log('Outbound message saved in Supabase', {
      conversaId: conversa.id,
      phone,
      metaMessageId
    });

    return res.status(201).json({ conversa, message: data });
  } catch (error) {
    return next(error);
  }
});
