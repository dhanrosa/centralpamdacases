create extension if not exists "pgcrypto";

create type user_role as enum ('admin', 'supervisor', 'agent');
create type conversation_status as enum ('new', 'in_progress', 'closed');
create type message_direction as enum ('inbound', 'outbound');

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role user_role not null default 'agent',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  assigned_user_id uuid references users(id) on delete set null,
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
  direction message_direction not null,
  provider_message_id text unique,
  body text not null,
  message_type text not null default 'text',
  status text not null default 'received',
  provider_payload jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create index conversations_status_idx on conversations(status);
create index messages_conversation_created_idx on messages(conversation_id, created_at);
create index contacts_phone_number_idx on contacts(phone_number);

-- Usuário inicial. Troque a senha depois do primeiro acesso.
insert into users (name, email, password_hash, role)
values (
  'Administrador',
  'pamdacases@gmail.com',
  '$2a$12$F4WLwZyJI6AQI3r7OsgVVOmyHislYVfzpX8FEmPQWM7lPYqWxbfxO',
  'admin'
)
on conflict (email) do nothing;
