-- Phase 4 Migration 05: Real-time Message Reactions
-- Execute this migration in your Supabase SQL Editor.

-- 1. Add reactions jsonb column to public.messages
alter table public.messages
  add column if not exists reactions jsonb default '{}'::jsonb;

-- 2. Grant column update on reactions
grant update (reactions) on public.messages to anon, authenticated;
