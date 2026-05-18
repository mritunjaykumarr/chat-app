import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiCopy,
  FiFileText,
  FiImage,
  FiLogOut,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiVideo,
  FiWifi,
  FiWifiOff,
  FiX,
} from 'react-icons/fi'
import MessageBubble from './MessageBubble.jsx'
import TypingIndicator from './TypingIndicator.jsx'
import { supabase } from '../supabase/client.js'

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🙏', '💬', '✨']
const MAX_FILE_SIZE = 25 * 1024 * 1024

function sortMessages(messages) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function upsertMessage(messages, nextMessage) {
  const exists = messages.some((message) => message.id === nextMessage.id)
  if (exists) {
    return sortMessages(
      messages.map((message) =>
        message.id === nextMessage.id ? nextMessage : message,
      ),
    )
  }

  return sortMessages([...messages, nextMessage])
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function getMediaType(file) {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  return 'document'
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function ChatBox({ roomCode, identity, onLeave }) {
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [channelStatus, setChannelStatus] = useState('CONNECTING')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const roomChannelRef = useRef(null)
  const typingStopRef = useRef(null)
  const typingTimersRef = useRef({})
  const previewUrlRef = useRef('')

  const otherUsers = useMemo(
    () => onlineUsers.filter((user) => user.sender_id !== identity.id),
    [identity.id, onlineUsers],
  )

  const connectionLabel = useMemo(() => {
    if (channelStatus !== 'SUBSCRIBED') {
      return 'Connecting'
    }

    return otherUsers.length ? 'Connected' : 'Waiting for guest'
  }, [channelStatus, otherUsers.length])

  const isConnected = channelStatus === 'SUBSCRIBED'

  const sendTyping = useCallback(
    (isTyping) => {
      roomChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          sender_id: identity.id,
          sender_name: identity.name,
          is_typing: isTyping,
        },
      })
    },
    [identity.id, identity.name],
  )

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode)
  }

  useEffect(() => {
    let ignore = false

    async function loadMessages() {
      setLoadingMessages(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: true })

      if (ignore) {
        return
      }

      if (loadError) {
        setError(loadError.message)
      } else {
        setMessages(data || [])
      }

      setLoadingMessages(false)
    }

    loadMessages()

    return () => {
      ignore = true
    }
  }, [roomCode])

  useEffect(() => {
    const messageChannel = supabase
      .channel(`messages:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          setMessages((current) => upsertMessage(current, payload.new))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          setMessages((current) => upsertMessage(current, payload.new))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
    }
  }, [roomCode])

  useEffect(() => {
    const roomChannel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: identity.id },
      },
    })

    roomChannelRef.current = roomChannel

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState()
        const users = Object.values(state)
          .flat()
          .reduce((map, user) => {
            map.set(user.sender_id, user)
            return map
          }, new Map())

        setOnlineUsers([...users.values()])
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.sender_id === identity.id) {
          return
        }

        window.clearTimeout(typingTimersRef.current[payload.sender_id])

        if (payload.is_typing) {
          setTypingUsers((current) => {
            const others = current.filter(
              (user) => user.sender_id !== payload.sender_id,
            )
            return [...others, payload]
          })

          typingTimersRef.current[payload.sender_id] = window.setTimeout(() => {
            setTypingUsers((current) =>
              current.filter((user) => user.sender_id !== payload.sender_id),
            )
          }, 1800)
        } else {
          setTypingUsers((current) =>
            current.filter((user) => user.sender_id !== payload.sender_id),
          )
        }
      })
      .subscribe(async (status) => {
        setChannelStatus(status)

        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            sender_id: identity.id,
            sender_name: identity.name,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      Object.values(typingTimersRef.current).forEach(window.clearTimeout)
      typingTimersRef.current = {}
      roomChannelRef.current = null
      supabase.removeChannel(roomChannel)
    }
  }, [identity.id, identity.name, roomCode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers.length])

  useEffect(() => {
    const unseenIds = messages
      .filter((message) => message.sender_id !== identity.id && !message.is_seen)
      .map((message) => message.id)

    if (!unseenIds.length) {
      return
    }

    supabase.from('messages').update({ is_seen: true }).in('id', unseenIds)
  }, [identity.id, messages])

  useEffect(() => {
    return () => {
      window.clearTimeout(typingStopRef.current)
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const handleTextChange = (event) => {
    setText(event.target.value)
    sendTyping(true)
    window.clearTimeout(typingStopRef.current)
    typingStopRef.current = window.setTimeout(() => sendTyping(false), 1000)
  }

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 25 MB.')
      event.target.value = ''
      return
    }

    setError('')
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }

    const nextPreviewUrl = selectedFile.type.startsWith('image/')
      ? URL.createObjectURL(selectedFile)
      : ''

    previewUrlRef.current = nextPreviewUrl
    setPreviewUrl(nextPreviewUrl)
    setFile(selectedFile)
    event.target.value = ''
  }

  const clearFile = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = ''
    setPreviewUrl('')
    setFile(null)
  }

  const sendMessage = async () => {
    const trimmedText = text.trim()

    if (!trimmedText && !file) {
      return
    }

    setUploading(true)
    setError('')

    try {
      let mediaUrl = null
      let mediaType = null
      let messageText = trimmedText

      if (file) {
        mediaType = getMediaType(file)
        const filePath = `${roomCode}/${identity.id}/${Date.now()}-${sanitizeFileName(
          file.name,
        )}`

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filePath)

        mediaUrl = data.publicUrl

        if (!messageText && mediaType === 'document') {
          messageText = file.name
        }
      }

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          room_code: roomCode,
          sender_id: identity.id,
          sender_name: identity.name,
          message: messageText,
          media_url: mediaUrl,
          media_type: mediaType,
          is_seen: false,
        })
        .select('*')
        .single()

      if (insertError) {
        throw insertError
      }

      setMessages((current) => upsertMessage(current, data))
      setText('')
      clearFile()
      setEmojiOpen(false)
      sendTyping(false)
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.')
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const addEmoji = (emoji) => {
    setText((current) => `${current}${emoji}`)
  }

  return (
    <div className="app-background flex min-h-screen p-3 text-white sm:p-5">
      <section className="mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/15 bg-slate-950/55 shadow-card backdrop-blur-2xl sm:h-[calc(100vh-2.5rem)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.08] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase text-slate-300">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-300' : 'bg-amber-300'
                }`}
              />
              <span>{connectionLabel}</span>
            </div>
            <h1 className="mt-1 truncate font-display text-lg font-semibold text-white sm:text-2xl">
              {roomCode}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyRoomCode}
              title="Copy room code"
              className="icon-button"
            >
              <FiCopy />
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-slate-200 sm:flex">
              {isConnected ? <FiWifi /> : <FiWifiOff />}
              <span>{otherUsers.length + 1} online</span>
            </div>
            <button
              type="button"
              onClick={onLeave}
              title="Leave room"
              className="icon-button border-rose-300/25 text-rose-100 hover:bg-rose-500/20"
            >
              <FiLogOut />
            </button>
          </div>
        </header>

        <main className="message-scroll flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {loadingMessages ? (
            <div className="grid h-full place-items-center text-sm text-slate-300">
              Loading messages...
            </div>
          ) : messages.length ? (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender_id === identity.id}
                    isDelivered={otherUsers.length > 0}
                  />
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-2xl">
                  <FiWifi />
                </div>
                <h2 className="font-display text-2xl font-semibold text-white">
                  Room is ready
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                  Share the room code and start chatting as soon as the other
                  person joins.
                </p>
              </div>
              <div ref={bottomRef} />
            </div>
          )}
        </main>

        <AnimatePresence>
          <TypingIndicator users={typingUsers} />
        </AnimatePresence>

        <footer className="border-t border-white/10 bg-slate-950/70 p-3 sm:p-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-3 rounded-lg border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-3 flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 p-3"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900/80">
                  {getMediaType(file) === 'image' && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Selected preview"
                      className="h-full w-full object-cover"
                    />
                  ) : getMediaType(file) === 'video' ? (
                    <FiVideo className="text-2xl text-cyan-100" />
                  ) : (
                    <FiFileText className="text-2xl text-cyan-100" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {getMediaType(file)} - {formatSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  title="Remove attachment"
                  className="icon-button"
                >
                  <FiX />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute bottom-full left-0 mb-3 grid grid-cols-4 gap-2 rounded-lg border border-white/15 bg-slate-900/95 p-3 shadow-card backdrop-blur-xl"
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-xl transition hover:bg-white/20"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setEmojiOpen((current) => !current)}
                title="Add emoji"
                className="icon-button"
              >
                <FiSmile />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                className="icon-button"
              >
                <FiPaperclip />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.xlsx,.ppt,.pptx"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Type a message"
                  className="max-h-28 min-h-8 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={sendMessage}
                disabled={uploading || (!text.trim() && !file)}
                title="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
              >
                {uploading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : file ? (
                  <FiImage />
                ) : (
                  <FiSend />
                )}
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default ChatBox
