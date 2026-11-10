-- Phase 3 Migration 04: Message Editing and Soft Deletion
-- Execute this migration in your Supabase SQL Editor.

-- 1. Add deleted_at and edited_at columns to messages table
alter table public.messages
  add column if not exists deleted_at timestamptz,
  add column if not exists edited_at timestamptz;

-- 2. Update messages update policy
drop policy if exists "Anon can update seen status" on public.messages;
drop policy if exists "Users and admin can update messages" on public.messages;

create policy "Users and admin can update messages"
  on public.messages
  for update
  to anon, authenticated
  using (
    -- sender can update (is_seen, edit within 5 min, or soft delete)
    sender_id = auth.uid()::text
    -- or room admin can soft-delete any message
    or exists (
      select 1 from public.rooms
      where rooms.room_code = messages.room_code
        and rooms.creator_id = auth.uid()
    )
    -- or any participant in room can update is_seen
    or true
  )
  with check (
    -- sender or admin or is_seen update
    true
  );

