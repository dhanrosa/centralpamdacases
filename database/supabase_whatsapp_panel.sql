create extension if not exists "pgcrypto";

create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete cascade,
  phone text not null,
  direction text check (direction in ('inbound','outbound')) not null,
  type text default 'text',
  body text,
  meta_message_id text,
  status text,
  raw jsonb,
  created_at timestamptz default now()
);

create index if not exists conversas_last_message_at_idx on conversas(last_message_at desc);
create index if not exists mensagens_conversa_created_idx on mensagens(conversa_id, created_at);
create index if not exists mensagens_meta_message_id_idx on mensagens(meta_message_id);

do $$
begin
  alter publication supabase_realtime add table conversas;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table mensagens;
exception
  when duplicate_object then null;
end $$;
