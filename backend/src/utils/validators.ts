import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(2).max(80),
  password: z.string().min(6)
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().min(2).max(80),
  password: z.string().min(6).max(128),
  role: z.enum(['admin', 'supervisor', 'agent']),
  active: z.boolean().default(true)
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({ password: z.string().min(6).max(128).optional() })
  .partial();

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4096)
});

export const updateConversationSchema = z.object({
  status: z.enum(['new', 'in_progress', 'closed']).optional(),
  assigned_user_id: z.string().uuid().nullable().optional()
});

export const noteSchema = z.object({
  note: z.string().trim().min(1).max(5000)
});

export const settingsSchema = z.object({
  whatsappPhoneNumberId: z.string().trim().min(1).optional(),
  whatsappApiVersion: z.string().trim().min(1).optional()
});
