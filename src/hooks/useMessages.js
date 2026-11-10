import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase/client.js'

const PAGE_SIZE = 30

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
  if (file.type.startsWith('audio/')) {
    return 'audio'
  }
  return 'document'
}

function getDeletedForMeSet(roomCode) {
  try {
    const raw = localStorage.getItem(`deleted_for_me_${roomCode}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveDeletedForMeId(roomCode, id) {
  try {
    const set = getDeletedForMeSet(roomCode)
    set.add(id)
    localStorage.setItem(`deleted_for_me_${roomCode}`, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export function useMessages(roomCode, identity, options = {}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const isInitialLoadRef = useRef(true)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  // 1. Initial Load: fetch latest 30 messages ordered by created_at DESC
  useEffect(() => {
    let ignore = false

    async function loadInitial() {
      setLoading(true)
      setError('')
      isInitialLoadRef.current = true

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (ignore) return

      if (fetchError) {
        setError(fetchError.message)
      } else if (data) {
        const deletedForMe = getDeletedForMeSet(roomCode)
        // Reverse to chronological order (oldest to newest)
        const chronological = [...data]
          .reverse()
          .filter((msg) => !deletedForMe.has(msg.id))
          .map((msg) => ({
            ...msg,
            status: 'sent',
          }))
        setMessages(chronological)
        setHasMore(data.length === PAGE_SIZE)
      }

      setLoading(false)
      isInitialLoadRef.current = false
    }

    loadInitial()

    return () => {
      ignore = true
    }
  }, [roomCode])

  // 2. Pagination: fetch older messages prior to the oldest currently loaded
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) {
      return 0
    }

    // Find oldest persistent message with valid created_at
    const oldest = messages.find((m) => !m.id.startsWith('temp-'))
    if (!oldest) return 0

    setLoadingOlder(true)

    const { data, error: olderError } = await supabase
      .from('messages')
      .select('*')
      .eq('room_code', roomCode)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    setLoadingOlder(false)

    if (olderError) {
      setError(olderError.message)
      return 0
    }

    if (!data || data.length === 0) {
      setHasMore(false)
      return 0
    }

    if (data.length < PAGE_SIZE) {
      setHasMore(false)
    }

    const deletedForMe = getDeletedForMeSet(roomCode)
    const olderChronological = [...data]
      .reverse()
      .filter((msg) => !deletedForMe.has(msg.id))
      .map((msg) => ({
        ...msg,
        status: 'sent',
      }))

    setMessages((current) => {
      const existingIds = new Set(current.map((m) => m.id))
      const dedupedOlder = olderChronological.filter(
        (m) => !existingIds.has(m.id),
      )
      return [...dedupedOlder, ...current]
    })

    return olderChronological.length
  }, [hasMore, loadingOlder, messages, roomCode])

  // 3. Realtime CDC subscription for INSERT and UPDATE
  useEffect(() => {
    const channel = supabase
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
          const newMsg = { ...payload.new, status: 'sent' }

          setMessages((current) => {
            // Check if already in list (e.g. from optimistic send)
            const exists = current.some((m) => m.id === newMsg.id)
            if (exists) {
              return current.map((m) => (m.id === newMsg.id ? newMsg : m))
            }

            // Check if this incoming message matches our pending optimistic message
            if (newMsg.sender_id === identity.id) {
              const pendingIdx = current.findIndex(
                (m) =>
                  m.id.startsWith('temp-') &&
                  m.message === newMsg.message &&
                  m.sender_id === newMsg.sender_id,
              )
              if (pendingIdx !== -1) {
                const next = [...current]
                next[pendingIdx] = newMsg
                return next
              }
            }

            return [...current, newMsg]
          })

          if (newMsg.sender_id !== identity.id) {
            optionsRef.current?.onIncomingMessage?.(newMsg)
          }
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
          const updated = { ...payload.new, status: 'sent' }
          setMessages((current) =>
            current.map((m) => (m.id === updated.id ? updated : m)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [identity.id, roomCode])

  // 4. Read receipts: automatically mark incoming unseen messages as seen
  useEffect(() => {
    const unseenIds = messages
      .filter(
        (m) =>
          m.sender_id !== identity.id && !m.is_seen && !m.id.startsWith('temp-'),
      )
      .map((m) => m.id)

    if (!unseenIds.length) return

    supabase.from('messages').update({ is_seen: true }).in('id', unseenIds)
  }, [identity.id, messages])

  // 5. Send message with Optimistic UI
  const performSend = useCallback(
    async (tempId, payload) => {
      const { text, file, isAudio, audioBlob, duration, ext, mimeType, replyTo } = payload
      let mediaUrl = null
      let computedMediaType = isAudio ? 'audio' : null
      let messageText = (text || '').trim()

      try {
        if (isAudio && audioBlob) {
          computedMediaType = 'audio'
          const filePath = `${roomCode}/${identity.id}/${Date.now()}.${ext || 'webm'}`

          const { error: uploadError } = await supabase.storage
            .from('chat-media')
            .upload(filePath, audioBlob, {
              cacheControl: '3600',
              contentType: mimeType || 'audio/webm',
              upsert: false,
            })

          if (uploadError) throw uploadError

          const { data } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath)
          mediaUrl = data.publicUrl
          messageText = 'Voice message'
        } else if (file) {
          computedMediaType = getMediaType(file)
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

          if (uploadError) throw uploadError

          const { data } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath)
          mediaUrl = data.publicUrl

          if (!messageText && computedMediaType === 'document') {
            messageText = file.name
          }
        }

        const insertRecord = {
          room_code: roomCode,
          sender_id: identity.id,
          sender_name: identity.name,
          message: messageText,
          media_url: mediaUrl,
          media_type: computedMediaType,
          reply_to: replyTo || null,
          is_seen: false,
        }

        if (isAudio && duration) {
          insertRecord.duration = Math.round(duration)
        }

        const { data, error: insertError } = await supabase
          .from('messages')
          .insert(insertRecord)
          .select('*')
          .single()

        if (insertError) throw insertError

        // Replace optimistic message with server record
        setMessages((current) =>
          current.map((m) =>
            m.id === tempId ? { ...data, status: 'sent' } : m,
          ),
        )
      } catch (err) {
        // Mark optimistic message as failed
        setMessages((current) =>
          current.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  status: 'failed',
                  _error: err.message || 'Failed to send',
                }
              : m,
          ),
        )
      }
    },
    [identity.id, identity.name, roomCode],
  )

  const sendMessage = useCallback(
    ({ text, file, previewUrl, replyTo }) => {
      const trimmed = (text || '').trim()
      if (!trimmed && !file) return

      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`
      const mediaType = file ? getMediaType(file) : null

      const optimisticMsg = {
        id: tempId,
        room_code: roomCode,
        sender_id: identity.id,
        sender_name: identity.name,
        message: trimmed || (mediaType === 'document' ? file.name : ''),
        media_url: previewUrl || null,
        media_type: mediaType,
        reply_to: replyTo || null,
        is_seen: false,
        created_at: new Date().toISOString(),
        status: 'sending',
        _payload: { text: trimmed, file, mediaType, replyTo },
      }

      setMessages((current) => [...current, optimisticMsg])
      performSend(tempId, optimisticMsg._payload)
    },
    [identity.id, identity.name, performSend, roomCode],
  )

  const sendVoiceMessage = useCallback(
    ({ audioBlob, duration, ext, mimeType }) => {
      if (!audioBlob) return

      const tempId = `temp-audio-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`
      const localUrl = URL.createObjectURL(audioBlob)

      const optimisticMsg = {
        id: tempId,
        room_code: roomCode,
        sender_id: identity.id,
        sender_name: identity.name,
        message: 'Voice message',
        media_url: localUrl,
        media_type: 'audio',
        duration: Math.round(duration || 0),
        is_seen: false,
        created_at: new Date().toISOString(),
        status: 'sending',
        _payload: {
          isAudio: true,
          audioBlob,
          duration,
          ext,
          mimeType,
          localUrl,
        },
      }

      setMessages((current) => [...current, optimisticMsg])
      performSend(tempId, optimisticMsg._payload)
    },
    [identity.id, identity.name, performSend, roomCode],
  )

  const retryMessage = useCallback(
    (failedMsg) => {
      if (!failedMsg?._payload) return

      // Set status back to sending
      setMessages((current) =>
        current.map((m) =>
          m.id === failedMsg.id ? { ...m, status: 'sending', _error: null } : m,
        ),
      )

      performSend(failedMsg.id, failedMsg._payload)
    },
    [performSend],
  )

  const deleteForMe = useCallback(
    (messageId) => {
      saveDeletedForMeId(roomCode, messageId)
      setMessages((curr) => curr.filter((m) => m.id !== messageId))
    },
    [roomCode],
  )

  const deleteForEveryone = useCallback(
    async (messageId) => {
      try {
        const deletedTimestamp = new Date().toISOString()
        const { error: delError } = await supabase
          .from('messages')
          .update({ deleted_at: deletedTimestamp })
          .eq('id', messageId)

        if (delError) throw delError

        setMessages((curr) =>
          curr.map((m) =>
            m.id === messageId ? { ...m, deleted_at: deletedTimestamp } : m,
          ),
        )
      } catch (err) {
        setError(err.message || 'Failed to delete message')
      }
    },
    [],
  )

  const editMessage = useCallback(
    async (messageId, newText) => {
      const trimmed = (newText || '').trim()
      if (!trimmed) return

      try {
        const editedTimestamp = new Date().toISOString()
        const { error: editError } = await supabase
          .from('messages')
          .update({
            message: trimmed,
            edited_at: editedTimestamp,
          })
          .eq('id', messageId)

        if (editError) throw editError

        setMessages((curr) =>
          curr.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  message: trimmed,
                  edited_at: editedTimestamp,
                }
              : m,
          ),
        )
      } catch (err) {
        setError(err.message || 'Failed to edit message')
      }
    },
    [],
  )

  const toggleReaction = useCallback(
    async (messageId, emoji) => {
      if (!messageId || !emoji) return

      const target = messages.find((m) => m.id === messageId)
      if (!target || target.id.startsWith('temp-')) return

      const prevReactions =
        target.reactions && typeof target.reactions === 'object'
          ? { ...target.reactions }
          : {}
      const userList = Array.isArray(prevReactions[emoji])
        ? [...prevReactions[emoji]]
        : []

      const userIndex = userList.indexOf(identity.id)
      if (userIndex >= 0) {
        userList.splice(userIndex, 1)
      } else {
        userList.push(identity.id)
      }

      const nextReactions = { ...prevReactions }
      if (userList.length === 0) {
        delete nextReactions[emoji]
      } else {
        nextReactions[emoji] = userList
      }

      // Optimistic update
      setMessages((curr) =>
        curr.map((m) =>
          m.id === messageId ? { ...m, reactions: nextReactions } : m,
        ),
      )

      try {
        const { error: reactionError } = await supabase
          .from('messages')
          .update({ reactions: nextReactions })
          .eq('id', messageId)

        if (reactionError) throw reactionError
      } catch (err) {
        // Revert on error
        setMessages((curr) =>
          curr.map((m) =>
            m.id === messageId ? { ...m, reactions: target.reactions } : m,
          ),
        )
        setError(err.message || 'Failed to update reaction')
      }
    },
    [identity.id, messages],
  )

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    sendMessage,
    sendVoiceMessage,
    retryMessage,
    loadOlderMessages,
    deleteForEveryone,
    deleteForMe,
    editMessage,
    toggleReaction,
  }
}

