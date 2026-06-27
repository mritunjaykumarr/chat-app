import { motion } from 'framer-motion'
import {
  FiDownload,
  FiEye,
  FiExternalLink,
  FiFileText,
  FiPlayCircle,
  FiShare2,
} from 'react-icons/fi'
import { FaCheck, FaCheckDouble } from 'react-icons/fa'

function formatTime(value) {
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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

function MessageStatus({ message, isDelivered }) {
  if (message.is_seen) {
    return (
      <span title="Seen" className="flex items-center gap-1 text-cyan-300">
        <FaCheckDouble />
        <span className="sr-only">Seen</span>
      </span>
    )
  }

  if (isDelivered) {
    return (
      <span title="Delivered" className="flex items-center gap-1 text-white/70">
        <FaCheckDouble />
        <span className="sr-only">Delivered</span>
      </span>
    )
  }

  return (
    <span title="Sent" className="flex items-center gap-1 text-white/70">
      <FaCheck />
      <span className="sr-only">Sent</span>
    </span>
  )
}

function MediaBlock({ message, isOwn }) {
  if (!message.media_url) {
    return null
  }

  const frameClass = isOwn
    ? 'border-white/15 bg-black/10'
    : 'border-slate-200 bg-slate-50'

  if (message.media_type === 'image') {
    return (
      <a href={message.media_url} target="_blank" rel="noreferrer">
        <img
          src={message.media_url}
          alt={message.message || 'Shared image'}
          className="mb-2 max-h-72 w-full rounded-lg object-cover"
        />
      </a>
    )
  }

  if (message.media_type === 'video') {
    return (
      <div className={`mb-2 rounded-lg border p-2 ${frameClass}`}>
        <video
          src={message.media_url}
          controls
          className="max-h-72 w-full rounded-md"
        />
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
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
      className={`mb-2 block rounded-lg border p-3 transition ${frameClass}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <FiFileText />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {getFileName(message)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs opacity-75">
            <FiExternalLink />
            Document
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-current pt-2 text-xs opacity-80 mix-blend-normal">
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

function MessageBubble({ message, isOwn, isDelivered }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[86%] rounded-lg px-4 py-3 shadow-soft sm:max-w-[68%] ${
          isOwn
            ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white'
            : 'border border-white/60 bg-white/90 text-slate-950'
        }`}
      >
        {!isOwn && (
          <div className="mb-1 text-xs font-semibold text-teal-700">
            {message.sender_name}
          </div>
        )}

        <MediaBlock message={message} isOwn={isOwn} />

        {message.message && message.media_type !== 'document' && (
          <p
            className={`whitespace-pre-wrap break-words text-sm leading-6 ${
              isOwn ? 'text-white' : 'text-slate-900'
            }`}
          >
            {message.message}
          </p>
        )}

        <div
          className={`mt-2 flex items-center justify-end gap-2 text-[11px] ${
            isOwn ? 'text-white/75' : 'text-slate-500'
          }`}
        >
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <MessageStatus message={message} isDelivered={isDelivered} />
          )}
        </div>
      </div>
      
      {/* Reactions Bar - Mocked to match wireframe */}
      <div
        className={`mt-1 flex items-center gap-1 text-sm opacity-90 ${
          isOwn ? 'justify-end pr-2' : 'justify-start pl-2'
        }`}
      >
        <span className="cursor-pointer rounded-full bg-slate-800/50 px-2 py-0.5 transition hover:scale-110">❤️</span>
        <span className="cursor-pointer rounded-full bg-slate-800/50 px-2 py-0.5 transition hover:scale-110">👍</span>
        <span className="cursor-pointer rounded-full bg-slate-800/50 px-2 py-0.5 transition hover:scale-110">😂</span>
      </div>
    </motion.div>
  )
}

export default MessageBubble
