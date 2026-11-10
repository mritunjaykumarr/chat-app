import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase/client.js'

export function useRoomChannel(roomCode, identity, onKicked) {
  const [channelStatus, setChannelStatus] = useState('CONNECTING')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])

  const roomChannelRef = useRef(null)
  const typingTimersRef = useRef({})

  const sendTyping = useCallback(
    (isTyping) => {
      if (!roomChannelRef.current) return

      roomChannelRef.current.send({
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

  const sendKicked = useCallback(
    (targetUserId) => {
      if (!roomChannelRef.current || !targetUserId) return

      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'kicked',
        payload: {
          user_id: targetUserId,
        },
      })
    },
    [],
  )

  useEffect(() => {
    if (!roomCode || !identity?.id) return

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
            if (user?.sender_id) {
              map.set(user.sender_id, user)
            }
            return map
          }, new Map())

        setOnlineUsers([...users.values()])
      })
      .on('broadcast', { event: 'kicked' }, ({ payload }) => {
        if (payload?.user_id && payload.user_id === identity.id) {
          onKicked?.()
        }
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
  }, [identity.id, identity.name, onKicked, roomCode])

  return {
    channelStatus,
    onlineUsers,
    typingUsers,
    sendTyping,
    sendKicked,
  }
}

