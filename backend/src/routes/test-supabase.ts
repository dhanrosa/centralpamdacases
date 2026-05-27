import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSupabaseTestMessage, logSupabaseError } from '../supabase.js';

export const testSupabaseRouter = Router();

testSupabaseRouter.use(requireAuth);

testSupabaseRouter.post('/', async (_req, res) => {
  try {
    const result = await createSupabaseTestMessage();
    return res.status(201).json(result);
  } catch (error) {
    logSupabaseError('test supabase route', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: `Falha no teste do Supabase: ${errorMessage}`,
      error: errorMessage,
      details: error
    });
  }
});
