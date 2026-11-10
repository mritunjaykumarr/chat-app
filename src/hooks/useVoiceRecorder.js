import { useCallback, useEffect, useRef, useState } from 'react'

export function getSupportedAudioMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { mimeType: '', ext: 'webm' }
  }

  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/mp4', ext: 'm4a' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/ogg', ext: 'ogg' },
  ]

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate
    }
  }

  return { mimeType: '', ext: 'webm' }
}

function checkSecureContext() {
  if (typeof window === 'undefined') return true
  if (window.isSecureContext) return true
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return true
  }
  return false
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const durationRef = useRef(0)
  const mimeTypeInfoRef = useRef({ mimeType: '', ext: 'webm' })
  const isCancelledRef = useRef(false)
  const resolveStopRef = useRef(null)

  // Release mic stream tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      streamRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current)
      stopTracks()
    }
  }, [stopTracks])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const startRecording = useCallback(async () => {
    clearError()
    isCancelledRef.current = false

    // Check secure context
    if (!checkSecureContext()) {
      const msg =
        'Microphone recording requires a secure context (HTTPS). Please open this app via HTTPS or localhost.'
      setError(msg)
      return false
    }

    // Check getUserMedia support
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = 'Microphone recording is not supported in this browser.'
      setError(msg)
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      const mimeInfo = getSupportedAudioMimeType()
      mimeTypeInfoRef.current = mimeInfo

      const options = mimeInfo.mimeType ? { mimeType: mimeInfo.mimeType } : {}
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        stopTracks()
        window.clearInterval(timerRef.current)

        if (isCancelledRef.current) {
          chunksRef.current = []
          setIsRecording(false)
          setRecordingDuration(0)
          if (resolveStopRef.current) {
            resolveStopRef.current(null)
            resolveStopRef.current = null
          }
          return
        }

        const effectiveMimeType =
          mimeInfo.mimeType || recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, {
          type: effectiveMimeType,
        })
        const finalDuration = Math.max(1, durationRef.current)

        setIsRecording(false)
        setRecordingDuration(0)
        chunksRef.current = []

        if (resolveStopRef.current) {
          resolveStopRef.current({
            blob: audioBlob,
            duration: finalDuration,
            ext: mimeInfo.ext,
            mimeType: effectiveMimeType,
          })
          resolveStopRef.current = null
        }
      }

      recorder.start(100) // 100ms timeslice chunks
      setIsRecording(true)
      durationRef.current = 0
      setRecordingDuration(0)

      timerRef.current = window.setInterval(() => {
        durationRef.current += 1
        setRecordingDuration(durationRef.current)
      }, 1000)

      return true
    } catch (err) {
      stopTracks()
      let friendlyError = 'Could not access microphone.'

      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        friendlyError =
          'Microphone permission denied. Please allow microphone access in your browser settings.'
      } else if (
        err.name === 'NotFoundError' ||
        err.name === 'DevicesNotFoundError'
      ) {
        friendlyError = 'No microphone device was detected on your system.'
      } else if (
        err.name === 'NotReadableError' ||
        err.name === 'TrackStartError'
      ) {
        friendlyError = 'Microphone is currently in use by another application.'
      } else if (err.message) {
        friendlyError = err.message
      }

      setError(friendlyError)
      return false
    }
  }, [clearError, stopTracks])

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        stopTracks()
        setIsRecording(false)
        resolve(null)
        return
      }

      resolveStopRef.current = resolve
      isCancelledRef.current = false
      recorder.stop()
    })
  }, [stopTracks])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    isCancelledRef.current = true

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      stopTracks()
      setIsRecording(false)
      setRecordingDuration(0)
    }
  }, [stopTracks])

  return {
    isRecording,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  }
}

