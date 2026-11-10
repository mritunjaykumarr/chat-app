let currentPlayingId = null
const listeners = new Set()

/**
 * Global audio playback coordinator to ensure only one audio note
 * plays across all message bubbles simultaneously.
 */
export const audioPlaybackManager = {
  play(id) {
    if (currentPlayingId && currentPlayingId !== id) {
      listeners.forEach((callback) => {
        try {
          callback(currentPlayingId)
        } catch {
          // ignore
        }
      })
    }
    currentPlayingId = id
  },

  stop(id) {
    if (currentPlayingId === id) {
      currentPlayingId = null
    }
  },

  onStop(callback) {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  },
}

