-- Phase 3 Migration 03: Anonymous Auth Identity, Room Creator (Admin), and Room Bans
-- Execute this migration in your Supabase SQL Editor.

-- 1. Add creator_id and is_locked columns to public.rooms
alter table public.rooms
  add column if not exists creator_id uuid default auth.uid(),
  add column if not exists is_locked boolean not null default false;

-- 2. Create room_bans table
create table if not exists public.room_bans (
  room_code text not null references public.rooms (room_code) on delete cascade,
  user_id uuid not null,
  banned_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

create index if not exists room_bans_room_code_idx
  on public.room_bans (room_code);

-- 3. Enable RLS
alter table public.room_bans enable row level security;

-- Grant permissions to anon and authenticated
grant usage on schema public to anon, authenticated;
grant all on public.room_bans to anon, authenticated;
grant select, insert, update on public.rooms to anon, authenticated;
grant select, insert, update on public.messages to anon, authenticated;

-- 4. RLS policies for room_bans
drop policy if exists "Anyone can check bans" on public.room_bans;
create policy "Anyone can check bans"
  on public.room_bans
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can ban members" on public.room_bans;
create policy "Admin can ban members"
  on public.room_bans
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.rooms
      where rooms.room_code = room_bans.room_code
        and (rooms.creator_id = auth.uid() or rooms.creator_id is null)
    )
  );

drop policy if exists "Admin can unban members" on public.room_bans;
create policy "Admin can unban members"
  on public.room_bans
  for delete
  to anon, authenticated
  using (
    exists (
      select 1 from public.rooms
      where rooms.room_code = room_bans.room_code
        and (rooms.creator_id = auth.uid() or rooms.creator_id is null)
    )
  );

-- 5. Update rooms policies
drop policy if exists "Anon can read rooms" on public.rooms;
create policy "Anon can read rooms"
  on public.rooms
  for select
  to anon, authenticated
  using (
    not exists (
      select 1 from public.room_bans
      where room_bans.room_code = rooms.room_code
        and room_bans.user_id = auth.uid()
    )
  );

drop policy if exists "Anon can create rooms" on public.rooms;
create policy "Anon can create rooms"
  on public.rooms
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admin can update room" on public.rooms;
create policy "Admin can update room"
  on public.rooms
  for update
  to anon, authenticated
  using (creator_id = auth.uid() or creator_id is null)
  with check (creator_id = auth.uid() or creator_id is null);

-- 6. Update messages policies
drop policy if exists "Anon can read messages" on public.messages;
create policy "Anon can read messages"
  on public.messages
  for select
  to anon, authenticated
  using (
    not exists (
      select 1 from public.room_bans
      where room_bans.room_code = messages.room_code
        and room_bans.user_id = auth.uid()
    )
  );

drop policy if exists "Anon can send messages" on public.messages;
create policy "Anon can send messages"
  on public.messages
  for insert
  to anon, authenticated
  with check (
    not exists (
      select 1 from public.room_bans
      where room_bans.room_code = messages.room_code
        and room_bans.user_id = auth.uid()
    )
    and not exists (
      select 1 from public.rooms
      where rooms.room_code = messages.room_code
        and rooms.is_locked = true
        and rooms.creator_id != auth.uid()
    )
  );

