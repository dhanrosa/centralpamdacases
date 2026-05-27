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

export function logSupabaseError(operation: string, error: unknown, details?: unknown) {
  console.error(`Supabase error: ${operation}`, {
    error,
    details
  });
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
    logSupabaseError('upsert conversas', error, payload);
    throw error;
  }

  return data;
}

export async function insertMensagem(params: {
  conversaId: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  type?: string;
  body?: string | null;
  metaMessageId?: string | null;
  status?: string | null;
  raw?: unknown;
  createdAt?: string;
}) {
  const supabase = requireSupabaseAdmin();
  const payload = {
    conversa_id: params.conversaId,
    phone: params.phone,
    direction: params.direction,
    type: params.type ?? 'text',
    body: params.body ?? null,
    meta_message_id: params.metaMessageId ?? null,
    status: params.status ?? null,
    raw: params.raw ?? null,
    ...(params.createdAt ? { created_at: params.createdAt } : {})
  };

  const { data, error } = await supabase.from('mensagens').insert(payload).select('*').single<Mensagem>();

  if (error) {
    logSupabaseError('insert mensagens', error, payload);
    throw error;
  }

  return data;
}

export async function createSupabaseTestMessage() {
  const phone = `550000000${Date.now().toString().slice(-4)}`;
  const text = `Teste Supabase ${new Date().toISOString()}`;
  const conversa = await upsertConversa({
    phone,
    name: 'Teste Supabase',
    lastMessage: text,
    lastMessageAt: new Date().toISOString()
  });
  const message = await insertMensagem({
    conversaId: conversa.id,
    phone,
    direction: 'inbound',
    type: 'text',
    body: text,
    status: 'test',
    raw: { source: 'api/test-supabase' }
  });

  return { conversa, message };
}
