# Anon Room Chat

A simple anonymous real-time chat app built with React, Vite, Supabase Realtime, Supabase Storage, Tailwind CSS, Framer Motion, and React Icons.

## Features

- No authentication, login, signup, profiles, or accounts
- Create a unique room code like `CHAT-82XK91`
- Join by room code after validating it in Supabase
- Anonymous local identity stored in `localStorage`
- Realtime messages with auto-scroll and motion transitions
- Supabase Realtime presence for delivered ticks
- Seen ticks by updating `messages.is_seen`
- Realtime typing indicator with animated dots
- Image, video, and document uploads through Supabase Storage

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

3. Add your Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
```

4. Open Supabase SQL Editor and run:

```text
src/supabase/schema.sql
```

Use a fresh Supabase project, or reset/drop the old authenticated chat tables before running this schema.

5. Run the app:

```bash
npm run dev
```

## Supabase Notes

- Auth is not used.
- The app uses public anon policies so anonymous users can create rooms, read/send messages, update `is_seen`, and upload media.
- The `chat-media` bucket is public so uploaded media can be opened from message bubbles.
- Realtime database changes are enabled for `public.messages`.
- Typing and online status use Supabase Realtime channels, not extra tables.

## Main Structure

```text
src/
├── components/
│   ├── ChatBox.jsx
│   ├── MessageBubble.jsx
│   ├── TypingIndicator.jsx
│   ├── RoomCard.jsx
├── pages/
│   ├── Home.jsx
│   ├── ChatRoom.jsx
├── supabase/
│   ├── client.js
│   └── schema.sql
├── utils/
│   ├── anonymousIdentity.js
│   └── generateRoomCode.js
```
