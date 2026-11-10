import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FiPause, FiPlay } from 'react-icons/fi'
import { audioPlaybackManager } from '../../utils/audioPlaybackManager.js'

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

const SPEED_OPTIONS = [1, 1.5, 2]

function AudioPlayer({ messageId, src, duration: initialDuration, isOwn }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [speedIndex, setSpeedIndex] = useState(0) // 0: 1x, 1: 1.5x, 2: 2x
  const [isSeeking, setIsSeeking] = useState(false)

  const audioRef = useRef(null)
  const progressContainerRef = useRef(null)

  const currentSpeed = SPEED_OPTIONS[speedIndex]

  // Enforce single-audio playback: listen to global coordinator
  useEffect(() => {
    const unsubscribe = audioPlaybackManager.onStop((playingId) => {
      if (playingId !== messageId && audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    })
    return () => {
      unsubscribe()
      audioPlaybackManager.stop(messageId)
    }
  }, [messageId])

  // Setup audio element listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(Math.round(audio.duration))
      }
    }

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      audioPlaybackManager.stop(messageId)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [isSeeking, messageId])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      audioPlaybackManager.stop(messageId)
    } else {
      audioPlaybackManager.play(messageId)
      audio.playbackRate = currentSpeed
      audio.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      )
    }
  }, [currentSpeed, isPlaying, messageId])

  const toggleSpeed = useCallback(() => {
    setSpeedIndex((curr) => {
      const next = (curr + 1) % SPEED_OPTIONS.length
      const newSpeed = SPEED_OPTIONS[next]
      if (audioRef.current) {
        audioRef.current.playbackRate = newSpeed
      }
      return next
    })
  }, [])

  const handleSeek = useCallback(
    (e) => {
      if (!progressContainerRef.current || !duration) return
      const rect = progressContainerRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percent = Math.max(0, Math.min(1, clickX / rect.width))
      const newTime = percent * duration

      setCurrentTime(newTime)
      if (audioRef.current) {
        audioRef.current.currentTime = newTime
      }
    },
    [duration],
  )

  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div
      className={`my-1 flex w-full min-w-[210px] sm:min-w-[260px] flex-col rounded-xl p-2.5 transition-colors select-none ${
        isOwn
          ? 'bg-black/20 text-white'
          : 'bg-slate-100 text-slate-900 border border-slate-200'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play voice message'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${
            isOwn
              ? 'bg-white text-slate-950 hover:bg-cyan-100'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {isPlaying ? (
            <FiPause className="text-sm fill-current" />
          ) : (
            <FiPlay className="ml-0.5 text-sm fill-current" />
          )}
        </button>

        {/* Progress Bar (Clickable / Seekable) */}
        <div className="flex-1 py-1">
          <div
            ref={progressContainerRef}
            onClick={handleSeek}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            className="group relative h-2 w-full cursor-pointer rounded-full bg-white/20"
          >
            <div
              className={`h-full rounded-full transition-all ${
                isOwn ? 'bg-white' : 'bg-teal-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            {/* Scrubber Knob */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full shadow-md transition-transform group-hover:scale-125 ${
                isOwn ? 'bg-cyan-200' : 'bg-teal-700'
              }`}
              style={{
                left: `calc(${progressPercent}% - 7px)`,
              }}
            />
          </div>

          {/* Time & Duration Display */}
          <div
            className={`mt-1 flex items-center justify-between text-[11px] font-mono ${
              isOwn ? 'text-white/80' : 'text-slate-600'
            }`}
          >
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Playback Speed Pill */}
        <button
          type="button"
          onClick={toggleSpeed}
          title="Change playback speed"
          className={`rounded-lg px-2 py-1 text-[11px] font-bold tracking-wider transition-colors ${
            isOwn
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
          }`}
        >
          {currentSpeed}x
        </button>
      </div>
    </div>
  )
}

export default React.memo(AudioPlayer)
