-- NARA BACK — esquema Vercel Postgres
-- Ejecutar una vez en: Vercel → Storage → (tu base Postgres) → pestaña "Query".
-- El acceso a la DB es solo desde las funciones /api con POSTGRES_URL (no expuesta
-- públicamente), por eso no hace falta RLS.

create table if not exists site_content (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  subject     text,
  message     text not null,
  read        boolean not null default false,
  archived    boolean not null default false,
  meta        jsonb
);

create index if not exists messages_created_at_idx on messages (created_at desc);
create index if not exists messages_unread_idx on messages (read) where read = false;

insert into site_content (id, data) values ('home', '{}'::jsonb)
on conflict (id) do nothing;
