create extension if not exists "pgcrypto";

create type user_role as enum ('admin', 'supervisor', 'agent');
create type conversation_status as enum ('new', 'in_progress', 'closed');
create type message_direction as enum ('inbound', 'outbound');

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password_hash text not null,
  role user_role not null default 'agent',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  phone text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  assigned_user_id uuid,
  status conversation_status not null default 'new',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index conversations_one_open_per_contact
  on conversations(contact_id)
  where status <> 'closed';

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  wa_message_id text unique,
  direction message_direction not null,
  type text not null default 'text',
  body text not null,
  from_wa_id text,
  to_wa_id text,
  sent_by_user_id uuid,
  status text not null default 'received',
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table internal_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid,
  note text not null,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create index conversations_status_idx on conversations(status);
create index conversations_assigned_user_idx on conversations(assigned_user_id);
create index contacts_wa_id_idx on contacts(wa_id);
create index messages_conversation_created_idx on messages(conversation_id, created_at);
create index messages_wa_message_id_idx on messages(wa_message_id);
