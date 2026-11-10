-- Phase 1 Migration: Composite index for efficient paginated message retrieval
-- Execute this migration in your Supabase SQL Editor.

create index if not exists messages_room_code_created_at_desc_idx
  on public.messages (room_code, created_at desc);

