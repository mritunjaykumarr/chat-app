-- Phase 4 Migration 06: Message Replies
-- Execute this migration in your Supabase SQL Editor.

-- Add reply_to jsonb column to public.messages
alter table public.messages
  add column if not exists reply_to jsonb;

-- Grant select and insert for reply_to
grant update (reply_to) on public.messages to anon, authenticated;

