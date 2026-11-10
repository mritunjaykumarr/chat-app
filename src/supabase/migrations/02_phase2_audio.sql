-- Phase 2 Migration: Voice Messages Support
-- Execute this migration in your Supabase SQL Editor.

-- 1. Drop existing media_type constraint and re-add with 'audio' permitted
alter table public.messages
  drop constraint if exists messages_media_type_check;

alter table public.messages
  add constraint messages_media_type_check check (
    media_type is null or media_type in ('image', 'video', 'document', 'audio')
  );

-- 2. Add duration column (in seconds) for voice/audio messages
alter table public.messages
  add column if not exists duration integer;

