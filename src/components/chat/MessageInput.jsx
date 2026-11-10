import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiAlertCircle,
  FiChevronLeft,
  FiEdit2,
  FiFileText,
  FiImage,
  FiMic,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiTrash2,
  FiVideo,
  FiX,
} from 'react-icons/fi'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🙏', '💬', '✨']
const MAX_FILE_SIZE = 25 * 1024 * 1024

function getMediaType(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatTimer(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function MessageInput({
  onSendMessage,
  onSendVoiceMessage,
  onTyping,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [slideOffset, setSlideOffset] = useState(0)

  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const previewUrlRef = useRef('')
  const touchStartRef = useRef(0)

  const prevEditingIdRef = useRef(null)

  useEffect(() => {
    if (editingMessage && editingMessage.id !== prevEditingIdRef.current) {
      prevEditingIdRef.current = editingMessage.id
      requestAnimationFrame(() => {
        setText(editingMessage.message || '')
        setFile(null)
        setPreviewUrl('')
      })
    } else if (!editingMessage) {
      prevEditingIdRef.current = null
    }
  }, [editingMessage])

  // Voice recorder hook
  const {
    isRecording,
    recordingDuration,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: clearRecorderError,
  } = useVoiceRecorder()

  useEffect(() => {
    return () => {
      window.clearTimeout(typingTimeoutRef.current)
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const handleTextChange = useCallback(
    (e) => {
      setText(e.target.value)
      onTyping?.(true)

      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = window.setTimeout(() => {
        onTyping?.(false)
      }, 1000)
    },
    [onTyping],
  )

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 25 MB.')
      e.target.value = ''
      return
    }

    setError('')
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }

    const nextUrl = selectedFile.type.startsWith('image/')
      ? URL.createObjectURL(selectedFile)
      : ''

    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
    setFile(selectedFile)
    e.target.value = ''
  }

  const clearFile = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = ''
    setPreviewUrl('')
    setFile(null)
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && !file) return

    if (editingMessage) {
      onSaveEdit?.(editingMessage.id, trimmed)
      setText('')
      onCancelEdit?.()
      return
    }

    onSendMessage?.({
      text: trimmed,
      file,
      previewUrl,
    })

    setText('')
    clearFile()
    setEmojiOpen(false)
    window.clearTimeout(typingTimeoutRef.current)
    onTyping?.(false)
  }

  const { settings } = useSettings()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (settings?.enterToSend) {
        if (!e.shiftKey) {
          e.preventDefault()
          handleSend()
        }
      } else {
        // When enter-to-send is disabled, Enter creates a newline, Ctrl+Enter or Cmd+Enter sends
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          handleSend()
        }
      }
    }
  }

  const addEmoji = (emoji) => {
    setText((curr) => `${curr}${emoji}`)
  }

  // Voice recording triggers
  const handleStartVoice = async () => {
    setEmojiOpen(false)
    await startRecording()
  }

  const handleSendVoice = async () => {
    const res = await stopRecording()
    if (res?.blob) {
      onSendVoiceMessage?.({
        audioBlob: res.blob,
        duration: res.duration,
        ext: res.ext,
        mimeType: res.mimeType,
      })
    }
  }

  const handleCancelVoice = () => {
    cancelRecording()
    setSlideOffset(0)
  }

  // Touch handlers for slide-to-cancel
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    if (!isRecording) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartRef.current
    if (diff < 0) {
      setSlideOffset(diff)
      // Slide threshold to cancel (-100px)
      if (diff < -100) {
        handleCancelVoice()
      }
    }
  }

  const handleTouchEnd = () => {
    setSlideOffset(0)
  }

  const activeError = recorderError || error

  return (
    <footer className="border-t border-white/10 bg-slate-950/80 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      {/* Error Toast Banner */}
      <AnimatePresence>
        {activeError && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex items-center justify-between rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-100 shadow-soft backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <FiAlertCircle className="text-base shrink-0 text-rose-300" />
              <span>{activeError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('')
                clearRecorderError()
              }}
              className="ml-2 text-rose-200 hover:text-white"
            >
              <FiX className="text-sm" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing Message Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex items-center justify-between rounded-xl border border-cyan-400/40 bg-cyan-950/60 px-3 py-1.5 text-xs text-cyan-200 shadow-soft"
          >
            <div className="flex items-center gap-2 truncate">
              <FiEdit2 className="text-sm shrink-0 text-cyan-300" />
              <div className="truncate">
                <span className="font-semibold text-cyan-100">Editing:</span>{' '}
                <span className="opacity-80 italic">{editingMessage.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setText('')
                onCancelEdit?.()
              }}
              className="ml-2 text-cyan-300 hover:text-white"
              title="Cancel edit"
            >
              <FiX className="text-sm" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected File Preview Box */}
      <AnimatePresence>
        {file && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-2 flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-2.5"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900/80">
              {getMediaType(file) === 'image' && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="h-full w-full object-cover"
                />
              ) : getMediaType(file) === 'video' ? (
                <FiVideo className="text-xl text-cyan-200" />
              ) : (
                <FiFileText className="text-xl text-cyan-200" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {file.name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-300">
                {getMediaType(file)} • {formatSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              title="Remove attachment"
              className="icon-button h-8 w-8 text-sm"
            >
              <FiX />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Quick Emoji Bar */}
        <AnimatePresence>
          {emojiOpen && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="absolute bottom-full left-0 mb-2 grid grid-cols-4 gap-2 rounded-xl border border-white/15 bg-slate-900/95 p-2.5 shadow-card backdrop-blur-xl"
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg transition hover:bg-white/20 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Input Bar: Recording Mode vs Text Typing Mode */}
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ transform: `translateX(${slideOffset}px)` }}
            className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-white shadow-soft"
          >
            {/* Live Timer and Pulsing Indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
              </span>
              <span className="font-mono text-sm font-semibold text-rose-200">
                {formatTimer(recordingDuration)}
              </span>
            </div>

            {/* Slide to Cancel Hint & Cancel Button */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={handleCancelVoice}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100"
              >
                <FiTrash2 className="text-sm" />
                <span>Cancel</span>
              </button>
              <span className="hidden sm:inline text-slate-400 text-[11px] items-center gap-0.5">
                <FiChevronLeft className="inline animate-pulse" /> slide to cancel
              </span>
            </div>

            {/* Send Voice Note Button */}
            <button
              type="button"
              onClick={handleSendVoice}
              title="Send voice note"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-glow transition hover:bg-white active:scale-95"
            >
              <FiSend className="text-base" />
            </button>
          </motion.div>
        ) : (
          <div className="flex items-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setEmojiOpen((curr) => !curr)}
              title="Add emoji"
              className="icon-button h-10 w-10 sm:h-11 sm:w-11"
            >
              <FiSmile />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="icon-button h-10 w-10 sm:h-11 sm:w-11"
            >
              <FiPaperclip />
            </button>

            {/* Mic Button: Tap to start recording */}
            <button
              type="button"
              onClick={handleStartVoice}
              title="Record voice message"
              className="icon-button h-10 w-10 sm:h-11 sm:w-11 hover:text-cyan-300 hover:border-cyan-300/40"
            >
              <FiMic />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.xlsx,.ppt,.pptx"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 sm:py-2">
              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type a message"
                className="max-h-24 min-h-[1.75rem] w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() && !file}
              title="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40 active:scale-95 sm:h-11 sm:w-11"
            >
              {file ? (
                <FiImage className="text-base" />
              ) : (
                <FiSend className="text-base" />
              )}
            </button>
          </div>
        )}
      </div>
    </footer>
  )
}

export default React.memo(MessageInput)
