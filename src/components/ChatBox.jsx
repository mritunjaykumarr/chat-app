import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiCheck,
  FiCopy,
  FiLock,
  FiLogOut,
  FiSettings,
  FiSlash,
  FiTrash2,
  FiUnlock,
  FiUserMinus,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { FaCrown } from 'react-icons/fa'
import MessageList from './chat/MessageList.jsx'
import MessageInput from './chat/MessageInput.jsx'
import SettingsModal from './settings/SettingsModal.jsx'
import { useRoomChannel } from '../hooks/useRoomChannel.js'
import { useMessages } from '../hooks/useMessages.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { playReceiveSound, playSendSound } from '../utils/soundEffects.js'
import { supabase } from '../supabase/client.js'

function ChatBox({ roomCode, identity, roomData: initialRoomData, onLeave }) {
  const { settings, notificationPermission } = useSettings()

  const [roomData, setRoomData] = useState(initialRoomData)
  const [showUsersList, setShowUsersList] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)
  const [memberToRemove, setMemberToRemove] = useState(null)
  const [memberToTransfer, setMemberToTransfer] = useState(null)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [kickedNotice, setKickedNotice] = useState(false)

  // Combine identity with real-time settings nickname
  const effectiveIdentity = useMemo(
    () => ({
      ...identity,
      name: settings.nickname || identity.name,
    }),
    [identity, settings.nickname],
  )

  // Mobile virtual keyboard height handling
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' && window.visualViewport
      ? window.visualViewport.height
      : null,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const updateViewport = () => {
      setViewportHeight(window.visualViewport.height)
    }
    window.visualViewport.addEventListener('resize', updateViewport)
    window.visualViewport.addEventListener('scroll', updateViewport)
    return () => {
      window.visualViewport.removeEventListener('resize', updateViewport)
      window.visualViewport.removeEventListener('scroll', updateViewport)
    }
  }, [])

  const handleKicked = useCallback(() => {
    setKickedNotice(true)
    setTimeout(() => {
      onLeave?.()
    }, 2500)
  }, [onLeave])

  // Track unread messages when window/tab is hidden
  const unreadHiddenCountRef = useRef(0)

  // Real-time sound, vibration, and background tab notifications for incoming messages
  const handleIncomingMessage = useCallback(
    (newMsg) => {
      // 1. Web Audio API chime
      if (settings.notificationSound) {
        playReceiveSound()
      }

      // 2. Mobile vibration
      if (
        settings.vibration &&
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {
        try {
          navigator.vibrate(100)
        } catch {
          // ignore
        }
      }

      // 3. Document title badge & browser push notification when tab is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        unreadHiddenCountRef.current += 1
        document.title = `(${unreadHiddenCountRef.current}) ${roomCode} - Anon Room Chat`

        if (
          notificationPermission === 'granted' &&
          typeof Notification !== 'undefined'
        ) {
          try {
            new Notification(newMsg.sender_name || 'New message', {
              body:
                newMsg.media_type === 'audio'
                  ? '🎤 Voice message'
                  : newMsg.message || 'Shared an attachment',
              icon: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                newMsg.sender_name || 'User',
              )}&backgroundColor=${settings.avatarColor || '0ea5e9'}&textColor=ffffff`,
              tag: `msg-${newMsg.id}`,
            })
          } catch {
            // ignore
          }
        }
      }
    },
    [
      notificationPermission,
      roomCode,
      settings.avatarColor,
      settings.notificationSound,
      settings.vibration,
    ],
  )

  // Reset tab title counter when user focuses or returns to window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        unreadHiddenCountRef.current = 0
        document.title = 'Anon Room Chat'
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (typeof document !== 'undefined') {
        document.title = 'Anon Room Chat'
      }
    }
  }, [])

  // 1. Hook for real-time presence, user list, kicked events, and typing
  const { channelStatus, onlineUsers, typingUsers, sendTyping, sendKicked } =
    useRoomChannel(roomCode, effectiveIdentity, handleKicked)

  // 2. Hook for paginated messages, optimistic sends, retries, edit, delete, and reactions
  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error: messagesError,
    sendMessage,
    sendVoiceMessage,
    retryMessage,
    loadOlderMessages,
    deleteForEveryone,
    deleteForMe,
    editMessage,
    toggleReaction,
  } = useMessages(roomCode, effectiveIdentity, {
    onIncomingMessage: handleIncomingMessage,
  })

  // Play send pop sound on message dispatch
  const handleSendMessage = useCallback(
    (payload) => {
      if (settings.notificationSound) {
        playSendSound()
      }
      sendMessage(payload)
    },
    [sendMessage, settings.notificationSound],
  )

  const handleSendVoiceMessage = useCallback(
    (payload) => {
      if (settings.notificationSound) {
        playSendSound()
      }
      sendVoiceMessage(payload)
    },
    [sendVoiceMessage, settings.notificationSound],
  )

  const creatorId = roomData?.creator_id
  const isCurrentUserAdmin = Boolean(
    creatorId && effectiveIdentity?.id && creatorId === effectiveIdentity.id,
  )
  const isLocked = Boolean(roomData?.is_locked)

  const otherUsers = useMemo(
    () => onlineUsers.filter((user) => user.sender_id !== effectiveIdentity.id),
    [effectiveIdentity.id, onlineUsers],
  )

  const isConnected = channelStatus === 'SUBSCRIBED'

  const connectionLabel = useMemo(() => {
    if (!isConnected) return 'Connecting'
    return otherUsers.length ? 'Connected' : 'Waiting for guest'
  }, [isConnected, otherUsers.length])

  // Live typing user names for subtitle
  const typingNames = useMemo(() => {
    const othersTyping = typingUsers.filter(
      (u) => u.sender_id !== effectiveIdentity.id,
    )
    if (!othersTyping.length) return null
    return othersTyping.map((u) => u.sender_name).join(', ')
  }, [effectiveIdentity.id, typingUsers])

  // Find admin's nickname from online users or fallback
  const adminNickname = useMemo(() => {
    if (!creatorId) return null
    if (creatorId === effectiveIdentity.id) return effectiveIdentity.name
    const found = otherUsers.find((u) => u.sender_id === creatorId)
    return found?.sender_name || 'Admin'
  }, [creatorId, effectiveIdentity.id, effectiveIdentity.name, otherUsers])

  // Sorted members list: Admin ALWAYS listed first
  const sortedMembers = useMemo(() => {
    const list = [
      { sender_id: effectiveIdentity.id, sender_name: effectiveIdentity.name },
      ...otherUsers,
    ]

    return list.sort((a, b) => {
      if (creatorId && a.sender_id === creatorId) return -1
      if (creatorId && b.sender_id === creatorId) return 1
      return 0
    })
  }, [creatorId, effectiveIdentity.id, effectiveIdentity.name, otherUsers])

  const copyRoomCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }, [roomCode])

  const handleToggleLock = useCallback(async () => {
    if (!isCurrentUserAdmin) return
    const nextLocked = !isLocked
    const { error } = await supabase
      .from('rooms')
      .update({ is_locked: nextLocked })
      .eq('room_code', roomCode)

    if (!error) {
      setRoomData((prev) => ({ ...prev, is_locked: nextLocked }))
    }
  }, [isCurrentUserAdmin, isLocked, roomCode])

  const handleConfirmRemove = useCallback(async () => {
    if (!memberToRemove || !isCurrentUserAdmin) return

    try {
      // 1. Insert into room_bans table
      await supabase.from('room_bans').insert({
        room_code: roomCode,
        user_id: memberToRemove.sender_id,
      })

      // 2. Broadcast kick event
      sendKicked(memberToRemove.sender_id)
      setMemberToRemove(null)
    } catch (err) {
      console.error('Failed to ban user:', err)
      setMemberToRemove(null)
    }
  }, [isCurrentUserAdmin, memberToRemove, roomCode, sendKicked])

  const handleConfirmTransfer = useCallback(async () => {
    if (!memberToTransfer || !isCurrentUserAdmin) return

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ creator_id: memberToTransfer.sender_id })
        .eq('room_code', roomCode)

      if (!error) {
        setRoomData((prev) => ({
          ...prev,
          creator_id: memberToTransfer.sender_id,
        }))
      }
      setMemberToTransfer(null)
    } catch (err) {
      console.error('Failed to transfer admin:', err)
      setMemberToTransfer(null)
    }
  }, [isCurrentUserAdmin, memberToTransfer, roomCode])

  const handleConfirmDelete = useCallback(() => {
    if (!messageToDelete) return
    if (messageToDelete.mode === 'everyone') {
      deleteForEveryone(messageToDelete.message.id)
    } else {
      deleteForMe(messageToDelete.message.id)
    }
    setMessageToDelete(null)
  }, [deleteForEveryone, deleteForMe, messageToDelete])

  const handleSaveEdit = useCallback(
    (messageId, newText) => {
      editMessage(messageId, newText)
      setEditingMessage(null)
    },
    [editMessage],
  )

  const roomInitials = roomCode.replace('CHAT-', '').slice(0, 2) || 'RM'

  return (
    <div
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      className="app-background flex h-[100dvh] w-full flex-col overflow-hidden text-white sm:p-4"
    >
      <section className="mx-auto flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col overflow-hidden rounded-none border-0 bg-slate-950/70 shadow-card backdrop-blur-2xl sm:rounded-xl sm:border sm:border-white/15">
        {/* Kicked Alert Overlay */}
        <AnimatePresence>
          {kickedNotice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-md"
            >
              <div className="glass-card max-w-sm w-full p-6 text-center">
                <FiSlash className="mx-auto mb-3 text-4xl text-rose-400" />
                <h3 className="font-display text-lg font-bold text-white">
                  You were removed
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  The room admin has removed you from this chat. You cannot re-join.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp-Style Polished Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#202c33]/90 px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-lg">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Room Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 font-display text-xs font-bold text-white shadow-sm ring-2 ring-white/10">
              {roomInitials}
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <h1 className="truncate font-display text-sm font-semibold text-white sm:text-base">
                  {roomCode}
                </h1>

                {/* Admin Badge in Header */}
                {isCurrentUserAdmin ? (
                  <span className="hidden xs:inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    <FaCrown className="text-amber-400 text-[10px]" />
                    <span>You're the admin</span>
                  </span>
                ) : adminNickname ? (
                  <span className="hidden xs:inline-flex items-center gap-1 text-[11px] text-amber-300/80">
                    <FaCrown className="text-amber-400 text-[10px]" />
                    <span className="truncate max-w-[120px]">
                      Admin: {adminNickname}
                    </span>
                  </span>
                ) : null}

                {isLocked && (
                  <span
                    title="Room is locked"
                    className="flex items-center gap-1 text-xs text-amber-300"
                  >
                    <FiLock />
                  </span>
                )}
              </div>

              {/* Subtitle: Live Typing Notice or Status */}
              <span className="truncate text-[11px]">
                {typingNames ? (
                  <span className="font-medium text-emerald-400 animate-pulse">
                    {typingNames} is typing...
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {otherUsers.length + 1} online • {connectionLabel}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-1 sm:gap-1.5">
            {/* Admin Lock/Unlock Button */}
            {isCurrentUserAdmin && (
              <button
                type="button"
                onClick={handleToggleLock}
                title={
                  isLocked
                    ? 'Room is locked (Click to unlock)'
                    : 'Room is open (Click to lock)'
                }
                className={`icon-button h-8 w-8 text-sm sm:h-9 sm:w-9 ${
                  isLocked
                    ? 'border-amber-400/40 bg-amber-500/20 text-amber-300'
                    : ''
                }`}
              >
                {isLocked ? <FiLock /> : <FiUnlock />}
              </button>
            )}

            {/* Online Members Pill */}
            <button
              type="button"
              onClick={() => setShowUsersList((curr) => !curr)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.08] px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10 sm:px-2.5 sm:py-1.5"
              title="Online Members"
            >
              <FiUsers />
              <span>{otherUsers.length + 1}</span>
            </button>

            {/* Copy Room Code Button */}
            <button
              type="button"
              onClick={copyRoomCode}
              title={copied ? 'Copied!' : 'Copy room code'}
              className="icon-button h-8 w-8 text-sm sm:h-9 sm:w-9"
            >
              {copied ? (
                <FiCheck className="text-cyan-300" />
              ) : (
                <FiCopy />
              )}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Settings & Preferences"
              className="icon-button h-8 w-8 text-sm sm:h-9 sm:w-9"
            >
              <FiSettings />
            </button>

            {/* Online Members Dropdown Menu */}
            <AnimatePresence>
              {showUsersList && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-white/15 bg-slate-900/95 p-3 shadow-card backdrop-blur-xl"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Room Members ({sortedMembers.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowUsersList(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <FiX className="text-sm" />
                    </button>
                  </div>

                  <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {sortedMembers.map((user) => {
                      const isUserAdmin = Boolean(
                        creatorId && user.sender_id === creatorId,
                      )
                      const isSelf = user.sender_id === effectiveIdentity.id

                      return (
                        <li
                          key={user.sender_id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <img
                              src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                                user.sender_name,
                              )}&backgroundColor=${
                                isSelf
                                  ? settings.avatarColor || '0ea5e9'
                                  : '0ea5e9'
                              }&textColor=ffffff`}
                              alt={user.sender_name}
                              className="h-7 w-7 shrink-0 rounded-full bg-slate-800"
                            />
                            <div className="min-w-0 flex-1 truncate">
                              <span className="truncate text-xs font-medium text-white">
                                {user.sender_name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] text-slate-400 ml-1">
                                  (You)
                                </span>
                              )}
                            </div>
                            {isUserAdmin && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-amber-400/30 bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                                <FaCrown className="text-[9px] text-amber-400" />
                                Admin
                              </span>
                            )}
                          </div>

                          {/* Admin Actions on other members */}
                          {isCurrentUserAdmin && !isUserAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setMemberToTransfer(user)}
                                title="Transfer admin to this user"
                                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-amber-300"
                              >
                                <FaCrown className="text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberToRemove(user)}
                                title="Remove / ban this user"
                                className="rounded p-1 text-rose-300 hover:bg-rose-500/20 hover:text-rose-100"
                              >
                                <FiUserMinus className="text-xs" />
                              </button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Leave Room Button */}
            <button
              type="button"
              onClick={onLeave}
              title="Leave room"
              className="icon-button h-8 w-8 border-rose-300/25 text-rose-100 hover:bg-rose-500/20 sm:h-9 sm:w-9"
            >
              <FiLogOut />
            </button>
          </div>
        </header>

        {/* Global Error Notice if any */}
        {messagesError && (
          <div className="bg-rose-500/20 px-4 py-2 text-center text-xs text-rose-200">
            {messagesError}
          </div>
        )}

        {/* Virtualized Message Stream with Smart Auto-Scroll & WhatsApp Polish */}
        <MessageList
          messages={messages}
          loading={loading}
          loadingOlder={loadingOlder}
          hasMore={hasMore}
          currentUserId={effectiveIdentity.id}
          creatorId={creatorId}
          otherUsersCount={otherUsers.length}
          typingUsers={typingUsers}
          onLoadOlder={loadOlderMessages}
          onRetry={retryMessage}
          onEdit={(msg) => setEditingMessage(msg)}
          onDelete={(msg, mode) => setMessageToDelete({ message: msg, mode })}
          onToggleReaction={toggleReaction}
        />

        {/* Message Input Footer with Safe-Area Padding & Edit Support */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onSendVoiceMessage={handleSendVoiceMessage}
          onTyping={sendTyping}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={handleSaveEdit}
        />
      </section>

      {/* Settings Bottom Sheet / Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomCode={roomCode}
        onLeaveRoom={onLeave}
      />

      {/* Confirmation Modal: Remove/Ban Member */}
      <AnimatePresence>
        {memberToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-sm w-full p-5 text-center"
            >
              <FiUserMinus className="mx-auto mb-3 text-3xl text-rose-400" />
              <h3 className="font-display text-base font-bold text-white">
                Remove {memberToRemove.sender_name}?
              </h3>
              <p className="mt-1.5 text-xs text-slate-300">
                This will disconnect them and ban them from re-entering this room.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemberToRemove(null)}
                  className="secondary-button flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-500"
                >
                  Remove & Ban
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Transfer Admin */}
      <AnimatePresence>
        {memberToTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-sm w-full p-5 text-center"
            >
              <FaCrown className="mx-auto mb-3 text-3xl text-amber-400" />
              <h3 className="font-display text-base font-bold text-white">
                Transfer Admin Rights?
              </h3>
              <p className="mt-1.5 text-xs text-slate-300">
                Make{' '}
                <span className="font-semibold text-white">
                  {memberToTransfer.sender_name}
                </span>{' '}
                the new admin? You will become a regular member.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMemberToTransfer(null)}
                  className="secondary-button flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  className="primary-button flex-1 py-2 text-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Delete Message */}
      <AnimatePresence>
        {messageToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-sm w-full p-5 text-center"
            >
              <FiTrash2 className="mx-auto mb-3 text-3xl text-rose-400" />
              <h3 className="font-display text-base font-bold text-white">
                {messageToDelete.mode === 'everyone'
                  ? 'Delete for everyone?'
                  : 'Delete for me?'}
              </h3>
              <p className="mt-1.5 text-xs text-slate-300">
                {messageToDelete.mode === 'everyone'
                  ? 'This message will be deleted for all participants in this room.'
                  : 'This message will be removed from your view only.'}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  className="secondary-button flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-500"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default React.memo(ChatBox)
