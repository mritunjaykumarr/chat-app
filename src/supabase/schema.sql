-- Anonymous room-code chat schema for Supabase.
-- Run this in a fresh Supabase project's SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms (room_code) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  message text,
  media_url text,
  media_type text check (
    media_type is null or media_type in ('image', 'video', 'document')
  ),
  is_seen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rooms_room_code_idx
  on public.rooms (room_code);

create index if not exists messages_room_code_created_at_idx
  on public.messages (room_code, created_at);

alter table public.rooms enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Anon can read rooms" on public.rooms;
drop policy if exists "Anon can create rooms" on public.rooms;
drop policy if exists "Anon can read messages" on public.messages;
drop policy if exists "Anon can send messages" on public.messages;
drop policy if exists "Anon can update seen status" on public.messages;

create policy "Anon can read rooms"
  on public.rooms
  for select
  to anon
  using (true);

create policy "Anon can create rooms"
  on public.rooms
  for insert
  to anon
  with check (true);

create policy "Anon can read messages"
  on public.messages
  for select
  to anon
  using (true);

create policy "Anon can send messages"
  on public.messages
  for insert
  to anon
  with check (true);

create policy "Anon can update seen status"
  on public.messages
  for update
  to anon
  using (true)
  with check (true);

grant usage on schema public to anon;
grant select, insert on public.rooms to anon;
grant select, insert on public.messages to anon;
grant update (is_seen) on public.messages to anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-media', 'chat-media', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Anon can read chat media" on storage.objects;
drop policy if exists "Anon can upload chat media" on storage.objects;

create policy "Anon can read chat media"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'chat-media');

create policy "Anon can upload chat media"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'chat-media');

alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
