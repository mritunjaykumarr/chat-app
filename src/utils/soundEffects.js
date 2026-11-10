let audioContext = null

/**
 * Initializes and unlocks AudioContext upon user gesture
 * to comply with modern mobile autoplay restrictions.
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) {
      audioContext = new AudioCtx()
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }

  return audioContext
}

// Global unlock listener on first user interaction
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }

  window.addEventListener('click', unlock, { once: true, passive: true })
  window.addEventListener('touchstart', unlock, { once: true, passive: true })
  window.addEventListener('keydown', unlock, { once: true, passive: true })
}

/**
 * Plays a pleasant WhatsApp-like two-tone receive chime
 */
export function playReceiveSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)

    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.18)

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.1)

    gain2.gain.setValueAtTime(0.001, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.1)
    osc2.stop(now + 0.35)
  } catch (err) {
    console.warn('Audio playback note:', err)
  }
}

/**
 * Plays a light, subtle sent pop
 */
export function playSendSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(784, now) // G5
    osc.frequency.exponentialRampToValueAtTime(988, now + 0.06) // B5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  } catch (err) {
    console.warn('Audio playback note:', err)
  }
}

/**
 * Fun Easter Egg "F99":
 * Plays an urgent retro phone ringtone / siren tune for 20 seconds
 * and triggers phone vibration continuously until finished or stopped.
 * Returns { stop: () => void }
 */
export function playF99Alarm(onStop) {
  let isRunning = true
  const ctx = getAudioContext()
  const startTime = Date.now()
  const DURATION_MS = 20000

  // 1. Phone Vibration
  const startVibration = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 150, 400, 150, 600, 200])
      } catch {
        // ignore
      }
    }
  }

  startVibration()
  const vibInterval = setInterval(() => {
    if (!isRunning) return
    startVibration()
  }, 2000)

  // 2. Synthesized Energetic Phone Ringtone / Siren
  const playRingCycle = () => {
    if (!ctx || !isRunning) return
    try {
      const now = ctx.currentTime
      const notes = [880, 1174.66, 1318.51, 1760]

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const noteStart = now + idx * 0.08

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, noteStart)

        gain.gain.setValueAtTime(0.001, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.3, noteStart + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.075)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteStart)
        osc.stop(noteStart + 0.075)
      })
    } catch {
      // ignore
    }
  }

  playRingCycle()
  const ringInterval = setInterval(() => {
    if (!isRunning) return
    if (Date.now() - startTime >= DURATION_MS) {
      stop()
      return
    }
    playRingCycle()
  }, 420)

  const stop = () => {
    if (!isRunning) return
    isRunning = false
    clearInterval(vibInterval)
    clearInterval(ringInterval)

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0)
      } catch {
        // ignore
      }
    }

    onStop?.()
  }

  // 20-second timeout safeguard
  const timer = setTimeout(() => {
    stop()
  }, DURATION_MS)

  return {
    stop: () => {
      clearTimeout(timer)
      stop()
    },
  }
}

