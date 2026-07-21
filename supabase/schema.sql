-- NARA BACK — esquema Supabase
-- Ejecutar en Supabase → SQL Editor (una vez).
--
-- Modelo de seguridad: TODO el acceso a datos pasa por las funciones
-- serverless (/api/*) usando la SERVICE_ROLE key en el servidor. El cliente
-- (home y /admin) nunca consulta la DB directamente. Por eso activamos RLS y
-- NO creamos políticas para anon/authenticated: la service_role omite RLS, y
-- cualquier otra vía queda denegada por defecto.

-- ─────────────────────────────────────────────────────────────
-- Contenido editable del sitio (un documento JSON por página)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.site_content (
  id          text primary key,              -- 'home'
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.site_content enable row level security;
-- sin políticas: solo service_role (servidor) puede leer/escribir.

-- ─────────────────────────────────────────────────────────────
-- Bandeja de entrada del formulario de contacto
-- ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  subject     text,
  message     text not null,
  read        boolean not null default false,
  archived    boolean not null default false,
  meta        jsonb                            -- ip/ua/utm opcional
);

create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists messages_unread_idx on public.messages (read) where read = false;

alter table public.messages enable row level security;
-- sin políticas: solo service_role (servidor). El form entra por /api/contact.

-- ─────────────────────────────────────────────────────────────
-- Storage: bucket público para imágenes subidas desde el admin
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Lectura pública de los objetos del bucket 'media'
drop policy if exists "media public read" on storage.objects;
create policy "media public read"
  on storage.objects for select
  using ( bucket_id = 'media' );

-- Subida/actualización/borrado solo para usuarios autenticados (admin logueado)
drop policy if exists "media authenticated write" on storage.objects;
create policy "media authenticated write"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'media' );

drop policy if exists "media authenticated update" on storage.objects;
create policy "media authenticated update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'media' );

drop policy if exists "media authenticated delete" on storage.objects;
create policy "media authenticated delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'media' );

-- ─────────────────────────────────────────────────────────────
-- Semilla del documento de contenido (se sobreescribe desde el admin).
-- El contenido real por defecto vive en content.default.json y lo carga
-- la función /api/content si esta fila está vacía.
-- ─────────────────────────────────────────────────────────────
insert into public.site_content (id, data)
values ('home', '{}'::jsonb)
on conflict (id) do nothing;
