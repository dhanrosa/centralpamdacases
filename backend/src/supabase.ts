import { createClient } from '@supabase/supabase-js';
import { env } from './config.js';

export interface Conversa {
  id: string;
  phone: string;
  name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  type: string;
  body: string | null;
  meta_message_id: string | null;
  status: string | null;
  raw: unknown;
  created_at: string;
}

export const supabaseAdmin =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios no backend.');
  }

  return supabaseAdmin;
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export async function upsertConversa(params: {
  phone: string;
  name?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string;
}) {
  const supabase = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const payload = {
    phone: params.phone,
    last_message: params.lastMessage ?? null,
    last_message_at: params.lastMessageAt ?? now,
    updated_at: now,
    ...(params.name !== undefined ? { name: params.name || null } : {})
  };

  const { data, error } = await supabase
    .from('conversas')
    .upsert(payload, { onConflict: 'phone' })
    .select('*')
    .single<Conversa>();

  if (error) {
    throw error;
  }

  return data;
}
