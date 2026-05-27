import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default(''),
  JWT_SECRET: z.string().default('chave-interna-deploy-sem-login-com-mais-de-32-caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WHATSAPP_API_VERSION: z.string().default('v25.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_TOKEN: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().default(''),
  VERIFY_TOKEN: z.string().default(''),
  WHATSAPP_APP_SECRET: z.string().optional().default(''),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('')
});

export const env = envSchema.parse(process.env);
