import { Router } from 'express';
import { env } from '../config.js';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { settingsSchema } from '../utils/validators.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

function publicSettings() {
  return {
    whatsappApiVersion: env.WHATSAPP_API_VERSION,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    webhookPath: '/webhook',
    tokenExposedToFrontend: false
  };
}

settingsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query('select key, value, updated_at from settings order by key asc');
    const values = Object.fromEntries(rows.map((row: any) => [row.key, row.value]));

    return res.json({
      whatsappApiVersion: values.whatsappApiVersion ?? env.WHATSAPP_API_VERSION,
      whatsappPhoneNumberId: values.whatsappPhoneNumberId ?? env.WHATSAPP_PHONE_NUMBER_ID,
      webhookPath: '/webhook',
      tokenExposedToFrontend: false
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return res.json(publicSettings());
    }

    return next(error);
  }
});

settingsRouter.put('/', requireRole(['admin']), async (req, res, next) => {
  try {
    const input = settingsSchema.parse(req.body);
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of entries) {
      await query(
        `insert into settings (key, value)
         values ($1, $2)
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, String(value)]
      );
    }

    return res.json({ message: 'Configurações salvas.' });
  } catch (error) {
    return next(error);
  }
});
