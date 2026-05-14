import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8)
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'supervisor', 'agent']),
  active: z.boolean().default(true)
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({ password: z.string().min(8).max(128).optional() })
  .partial();

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1).max(4096)
});

export const updateConversationSchema = z.object({
  status: z.enum(['new', 'in_progress', 'closed']).optional(),
  assignedUserId: z.string().uuid().nullable().optional()
});

export const noteSchema = z.object({
  note: z.string().trim().min(1).max(5000)
});

export const settingsSchema = z.object({
  whatsappPhoneNumberId: z.string().trim().min(1).optional(),
  whatsappApiVersion: z.string().trim().min(1).optional()
});

