import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiDownload, FiShare, FiSmartphone, FiX } from 'react-icons/fi'
import { usePWAInstall } from '../../hooks/usePWAInstall.js'

export default function InstallPromptModal({ forceOpen = false, onClose }) {
  const { isInstallable, isInstalled, isIOS, hasDeferredPrompt, promptInstall } =
    usePWAInstall()

  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    return Boolean(sessionStorage.getItem('anon_pwa_dismissed'))
  })
  const [timedPromptOpen, setTimedPromptOpen] = useState(false)

  useEffect(() => {
    if (isInstalled || dismissed || !isInstallable) return

    const timer = setTimeout(() => {
      setTimedPromptOpen(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [dismissed, isInstallable, isInstalled])

  const isVisible = (forceOpen || timedPromptOpen) && !dismissed && !isInstalled

  const handleDismiss = () => {
    setDismissed(true)
    setTimedPromptOpen(false)
    sessionStorage.setItem('anon_pwa_dismissed', 'true')
    onClose?.()
  }

  const handleInstallClick = async () => {
    if (hasDeferredPrompt) {
      const ok = await promptInstall()
      if (ok) {
        handleDismiss()
      }
    }
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4 backdrop-blur-sm">
        {/* Backdrop dismiss */}
        <div className="absolute inset-0" onClick={handleDismiss} />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-sm rounded-t-3xl border border-white/15 bg-slate-900/95 p-5 text-white shadow-card backdrop-blur-2xl sm:rounded-2xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-slate-400 hover:text-white"
            title="Close"
          >
            <FiX className="text-lg" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 shadow-glow">
              <FiSmartphone className="text-2xl" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Install Anon Chat
              </h3>
              <p className="text-xs text-slate-300">
                Install on your home screen
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">
            Get the full native app experience with full-screen chatting, zero browser address bars, and instant notifications.
          </p>

          {isIOS ? (
            <div className="mt-3.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
              <p className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                <FiShare className="text-sm" /> To install on iPhone/iPad:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                <li>Tap the Share button at bottom of Safari</li>
                <li>Scroll down and select <span className="font-bold text-white">Add to Home Screen</span></li>
              </ol>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="secondary-button flex-1 py-2 text-xs"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="primary-button flex-1 py-2 text-xs font-bold"
              >
                <FiDownload className="text-sm" />
                <span>Install App</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
