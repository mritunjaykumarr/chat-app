import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiCopy,
  FiCornerUpLeft,
  FiDownload,
  FiEdit2,
  FiEye,
  FiExternalLink,
  FiFileText,
  FiMoreVertical,
  FiPlayCircle,
  FiRotateCw,
  FiShare2,
  FiSlash,
  FiTrash2,
} from 'react-icons/fi'
import { FaCheck, FaCheckDouble, FaCrown } from 'react-icons/fa'
import AudioPlayer from './chat/AudioPlayer.jsx'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getFileName(message) {
  if (message.message) {
    return message.message
  }

  try {
    const url = new URL(message.media_url)
    return decodeURIComponent(url.pathname.split('/').pop() || 'Attachment')
  } catch {
    return 'Attachment'
  }
}

function MessageStatus({ message, isDelivered, onRetry }) {
  if (message.status === 'sending') {
    return (
      <span title="Sending..." className="inline-flex items-center text-white/50">
        <FiClock className="animate-spin text-[10px]" />
        <span className="sr-only">Sending</span>
      </span>
    )
  }

  if (message.status === 'failed') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRetry?.(message)
        }}
        title="Sending failed. Tap to retry."
        className="inline-flex items-center gap-1 text-rose-300 hover:text-white"
      >
        <FiAlertCircle className="text-xs text-rose-400" />
        <span className="underline text-[10px]">Retry</span>
      </button>
    )
  }

  if (message.is_seen) {
    return (
      <span title="Seen" className="inline-flex items-center text-[#53bdeb]">
        <FaCheckDouble className="text-[11px]" />
        <span className="sr-only">Seen</span>
      </span>
    )
  }

  if (isDelivered) {
    return (
      <span title="Delivered" className="inline-flex items-center text-[#8696a0]">
        <FaCheckDouble className="text-[11px]" />
        <span className="sr-only">Delivered</span>
      </span>
    )
  }

  return (
    <span title="Sent" className="inline-flex items-center text-[#8696a0]">
      <FaCheck className="text-[11px]" />
      <span className="sr-only">Sent</span>
    </span>
  )
}

function MediaBlock({ message, isOwn }) {
  if (!message.media_url || message.deleted_at) {
    return null
  }

  const frameClass = isOwn
    ? 'border-white/10 bg-black/15'
    : 'border-white/10 bg-slate-900/60'

  if (message.media_type === 'audio') {
    return (
      <AudioPlayer
        messageId={message.id}
        src={message.media_url}
        duration={message.duration}
        isOwn={isOwn}
      />
    )
  }

  if (message.media_type === 'image') {
    return (
      <a href={message.media_url} target="_blank" rel="noreferrer" className="block">
        <img
          src={message.media_url}
          alt={message.message || 'Shared image'}
          className="mb-1 max-h-72 w-full rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    )
  }

  if (message.media_type === 'video') {
    return (
      <div className={`mb-1.5 rounded-lg border p-2 ${frameClass}`}>
        <video
          src={message.media_url}
          controls
          className="max-h-72 w-full rounded-md"
        />
        <div className="mt-1.5 flex items-center gap-2 text-xs opacity-80">
          <FiPlayCircle />
          <span>Video attachment</span>
        </div>
      </div>
    )
  }

  return (
    <a
      href={message.media_url}
      target="_blank"
      rel="noreferrer"
      className={`mb-1.5 block rounded-lg border p-2.5 transition ${frameClass}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <FiFileText />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">
            {getFileName(message)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] opacity-75">
            <FiExternalLink />
            Document
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-current pt-1.5 text-[11px] opacity-80">
        <div className="flex items-center gap-1 hover:opacity-100">
          <FiEye /> Preview
        </div>
        <div className="flex items-center gap-1 hover:opacity-100">
          <FiDownload /> Download
        </div>
        <div className="flex items-center gap-1 hover:opacity-100">
          <FiShare2 /> Share
        </div>
      </div>
    </a>
  )
}

function MessageBubble({
  message,
  isOwn,
  isDelivered,
  isFirstInGroup = true,
  isLastInGroup = true,
  isAdminMessage = false,
  isCurrentUserAdmin = false,
  currentUserId,
  onRetry,
  onEdit,
  onDelete,
  onToggleReaction,
  onReply,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dragX, setDragX] = useState(0)
  const longPressTimerRef = useRef(null)

  const [now] = useState(() => Date.now())
  const isFailed = message.status === 'failed'
  const isSending = message.status === 'sending'
  const isDeleted = Boolean(message.deleted_at)

  // Edit window: only own text messages within 5 minutes of creation
  const canEdit =
    isOwn &&
    !message.media_type &&
    !isDeleted &&
    now - new Date(message.created_at).getTime() < 5 * 60 * 1000

  // Delete allowed if own message or user is room admin
  const canDeleteForEveryone = (isOwn || isCurrentUserAdmin) && !isDeleted

  // WhatsApp-like bubble corner radii & tails
  const bubbleShape = isOwn
    ? `rounded-2xl ${isLastInGroup && !isFailed ? 'rounded-br-none' : ''}`
    : `rounded-2xl ${isLastInGroup ? 'rounded-bl-none' : ''}`

  const handleCopy = useCallback(() => {
    if (message.message) {
      navigator.clipboard.writeText(message.message)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setMenuOpen(false)
      }, 1000)
    }
  }, [message.message])

  // Long press detection for mobile
  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setMenuOpen(true)
    }, 450)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
  }

  // Filter reaction entries that have at least one user
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, users]) => Array.isArray(users) && users.length > 0,
  )

  const hasMediaOnly = Boolean(
    message.media_type &&
      (!message.message ||
        message.message === 'Voice message' ||
        message.message === getFileName(message)),
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`group relative flex w-full flex-col min-h-0 h-fit ${
        isOwn ? 'items-end' : 'items-start'
      } ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}
    >
      {/* Quick Emoji Reaction Floating Bar on Desktop Hover */}
      {!isDeleted && !isFailed && !isSending && (
        <div
          className={`absolute -top-7 z-20 hidden items-center gap-1 rounded-full border border-white/10 bg-[#1f2c34]/95 px-2 py-0.5 shadow-lg backdrop-blur-md group-hover:flex ${
            isOwn ? 'right-2' : 'left-2'
          }`}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction?.(message.id, emoji)}
              className="transform text-sm px-0.5 transition hover:scale-130 active:scale-95"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Swipe to reply reveal icon */}
      {dragX > 15 && (
        <div
          className={`absolute ${
            isOwn ? 'right-[90%]' : 'left-[90%]'
          } top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md`}
        >
          <FiCornerUpLeft className="text-sm" />
        </div>
      )}

      {/* Main Bubble Container with Swipe to Reply */}
      <motion.div
        drag={isDeleted ? false : 'x'}
        dragConstraints={{ left: 0, right: 65 }}
        dragElastic={0.16}
        dragSnapToOrigin={true}
        onDrag={(e, info) => setDragX(Math.max(0, info.offset.x))}
        onDragEnd={(e, info) => {
          setDragX(0)
          if (info.offset.x > 40 && !isDeleted) {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(35)
              } catch {
                // ignore
              }
            }
            onReply?.(message)
          }
        }}
        className={`relative w-fit max-w-[85%] min-w-0 px-3 py-1.5 shadow-sm transition-all sm:max-w-[72%] ${bubbleShape} ${
          isOwn
            ? isFailed
              ? 'border border-rose-400/40 bg-gradient-to-br from-rose-900/90 to-red-800/90 text-white self-end mr-2 sm:mr-3'
              : 'bg-[#005c4b] text-[#e9edef] self-end mr-2 sm:mr-3'
            : 'border border-white/5 bg-[#202c33] text-[#e9edef] self-start ml-2 sm:ml-3'
        } ${isSending ? 'opacity-85' : 'opacity-100'}`}
      >
        {/* WhatsApp Tail: Outgoing */}
        {isOwn && isLastInGroup && !isFailed && !isDeleted && (
          <svg
            viewBox="0 0 8 13"
            width="8"
            height="13"
            className="absolute -bottom-[0.5px] -right-[7px] pointer-events-none fill-[#005c4b]"
          >
            <path d="M0 0 L0 13 L8 13 C4 13 1 9 0 0 Z" />
          </svg>
        )}

        {/* WhatsApp Tail: Incoming */}
        {!isOwn && isLastInGroup && !isDeleted && (
          <svg
            viewBox="0 0 8 13"
            width="8"
            height="13"
            className="absolute -bottom-[0.5px] -left-[7px] pointer-events-none fill-[#202c33]"
          >
            <path d="M8 0 L8 13 L0 13 C4 13 7 9 8 0 Z" />
          </svg>
        )}

        {/* Sender Name & Admin Badge */}
        {!isOwn && isFirstInGroup && (
          <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-teal-300">
            <span>{message.sender_name}</span>
            {isAdminMessage && (
              <span className="inline-flex items-center gap-0.5 rounded border border-amber-400/40 bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                <FaCrown className="text-[9px] text-amber-400" />
                Admin
              </span>
            )}
          </div>
        )}

        {/* Admin Badge for own message when first in group */}
        {isOwn && isFirstInGroup && isAdminMessage && (
          <div className="mb-0.5 flex items-center justify-end gap-1 text-[10px] font-semibold text-amber-200">
            <FaCrown className="text-[9px] text-amber-300" />
            <span>Admin (You)</span>
          </div>
        )}

        {/* Soft Deleted State */}
        {isDeleted ? (
          <div className="flex items-center gap-2 italic text-xs text-slate-300 py-0.5 select-none">
            <FiSlash className="text-sm text-slate-400 shrink-0" />
            <span>This message was deleted</span>
            <span className="text-[10px] text-slate-400 not-italic ml-2">
              {formatTime(message.created_at)}
            </span>
          </div>
        ) : (
          <>
            {/* Quoted Message Preview */}
            {message.reply_to && (
              <div className="mb-1.5 flex overflow-hidden rounded-md border-l-[3.5px] border-emerald-400 bg-black/25 text-left text-xs select-none">
                <div className="p-1.5 min-w-0 flex-1">
                  <span className="block truncate font-semibold text-emerald-300 text-[11px]">
                    {message.reply_to.sender_name || 'User'}
                  </span>
                  <span className="block truncate text-slate-200 text-[11px] opacity-85">
                    {message.reply_to.media_type === 'audio'
                      ? '🎤 Voice message'
                      : message.reply_to.message || 'Attachment'}
                  </span>
                </div>
              </div>
            )}

            <MediaBlock message={message} isOwn={isOwn} />

            {/* Message Body & Inline WhatsApp Timestamp */}
            {message.message &&
              message.media_type !== 'document' &&
              message.media_type !== 'audio' && (
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-[#e9edef]">
                  {message.message}
                  {/* WhatsApp Inline/Trailing Timestamp */}
                  <span className="float-right -mb-0.5 ml-2.5 inline-flex items-center gap-1 select-none pt-1 text-[10px] text-[#8696a0]">
                    {message.edited_at && (
                      <span className="italic text-[10px] text-cyan-300 mr-0.5">
                        edited
                      </span>
                    )}
                    <span>{formatTime(message.created_at)}</span>
                    {isOwn && (
                      <MessageStatus
                        message={message}
                        isDelivered={isDelivered}
                        onRetry={onRetry}
                      />
                    )}
                  </span>
                </p>
              )}

            {/* Standalone Timestamp for media or voice message */}
            {(hasMediaOnly || message.media_type === 'audio' || message.media_type === 'document') && (
              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                  isOwn ? 'text-white/70' : 'text-[#8696a0]'
                }`}
              >
                {message.edited_at && (
                  <span className="italic text-cyan-200 font-medium">edited</span>
                )}
                <span>{formatTime(message.created_at)}</span>
                {isOwn && (
                  <MessageStatus
                    message={message}
                    isDelivered={isDelivered}
                    onRetry={onRetry}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Failed Tap-to-Retry Banner */}
        {isFailed && (
          <button
            type="button"
            onClick={() => onRetry?.(message)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded bg-black/25 px-2 py-1 text-xs font-medium text-rose-200 transition hover:bg-black/40 hover:text-white"
          >
            <FiRotateCw className="text-xs" />
            <span>Failed to send. Tap to retry</span>
          </button>
        )}

        {/* Message Options Hover Trigger */}
        {!isDeleted && (
          <div
            className={`absolute top-1 z-10 ${
              isOwn ? 'left-1 -translate-x-full pr-1' : 'right-1 translate-x-full pl-1'
            } hidden group-hover:flex items-center`}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((curr) => !curr)}
              title="Message options"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:text-white shadow-sm"
            >
              <FiMoreVertical className="text-xs" />
            </button>
          </div>
        )}

        {/* Dropdown Action Menu */}
        <AnimatePresence>
          {menuOpen && !isDeleted && (
            <>
              {/* Invisible backdrop to dismiss on outside click / tap */}
              <div
                className="fixed inset-0 z-30 cursor-default"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`absolute top-full z-40 mt-1 min-w-[150px] rounded-xl border border-white/15 bg-slate-900/95 p-1.5 text-xs text-white shadow-card backdrop-blur-xl ${
                  isOwn ? 'right-0' : 'left-0'
                }`}
              >
                {/* Quick Reactions in Menu */}
                <div className="flex items-center justify-between gap-1 border-b border-white/10 px-1 py-1 mb-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onToggleReaction?.(message.id, emoji)
                        setMenuOpen(false)
                      }}
                      className="transform text-base p-0.5 transition hover:scale-125 active:scale-95"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Reply Action */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onReply?.(message)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-white/10 text-emerald-300"
                >
                  <FiCornerUpLeft className="text-sm" />
                  <span>Reply</span>
                </button>

                {message.message && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-white/10"
                  >
                    {copied ? (
                      <FiCheck className="text-cyan-300" />
                    ) : (
                      <FiCopy />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onEdit?.(message)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-white/10 text-cyan-200"
                  >
                    <FiEdit2 />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete?.(message, 'me')
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-white/10 text-slate-300"
                >
                  <FiTrash2 />
                  <span>Delete for me</span>
                </button>

                {canDeleteForEveryone && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete?.(message, 'everyone')
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-rose-500/20 text-rose-300"
                  >
                    <FiSlash />
                    <span>Delete for everyone</span>
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* WhatsApp Reaction Chips Overlapping Below Bubble */}
      {reactionEntries.length > 0 && !isDeleted && (
        <div
          className={`-mt-2 z-10 flex flex-wrap items-center gap-1 px-1 ${
            isOwn ? 'justify-end mr-3' : 'justify-start ml-3'
          }`}
        >
          {reactionEntries.map(([emoji, users]) => {
            const hasReacted = users.includes(currentUserId)
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction?.(message.id, emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm transition active:scale-95 ${
                  hasReacted
                    ? 'border-emerald-400/50 bg-[#005c4b] text-emerald-200'
                    : 'border-white/10 bg-[#1f2c34] text-slate-200 hover:bg-[#2a3942]'
                }`}
              >
                <span className="text-xs leading-none">{emoji}</span>
                {users.length > 1 && (
                  <span className="text-[10px] leading-none opacity-80">
                    {users.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default React.memo(MessageBubble)
