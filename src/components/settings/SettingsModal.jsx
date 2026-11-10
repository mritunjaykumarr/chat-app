import { memo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiBell,
  FiCheck,
  FiCornerDownLeft,
  FiCopy,
  FiDownload,
  FiGlobe,
  FiLogOut,
  FiMoon,
  FiSun,
  FiUser,
  FiVolume2,
  FiVolumeX,
  FiX,
} from 'react-icons/fi'
import { AVATAR_COLOR_PRESETS, useSettings } from '../../context/SettingsContext.jsx'
import { usePWAInstall } from '../../hooks/usePWAInstall.js'

function SettingsModal({ isOpen, onClose, roomCode, onLeaveRoom }) {
  const {
    settings,
    updateSettings,
    updateNickname,
    notificationPermission,
    requestNotificationPermission,
  } = useSettings()

  const { isInstallable, isInstalled, promptInstall } = usePWAInstall()

  const [nameInput, setNameInput] = useState(settings.nickname || '')
  const [copiedLink, setCopiedLink] = useState(false)
  const [savedNameNotice, setSavedNameNotice] = useState(false)

  if (!isOpen) return null

  const handleSaveNickname = (e) => {
    e.preventDefault()
    if (nameInput.trim()) {
      updateNickname(nameInput.trim())
      setSavedNameNotice(true)
      setTimeout(() => setSavedNameNotice(false), 1500)
    }
  }

  const handleCopyInvite = async () => {
    try {
      const inviteUrl = `${window.location.origin}/room/${roomCode}`
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-0 sm:p-4 backdrop-blur-sm">
        {/* Backdrop Click Dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal / Bottom Sheet Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900/95 p-4 sm:p-6 text-white shadow-card backdrop-blur-2xl sm:rounded-2xl"
        >
          {/* Mobile Drag Handle */}
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">
              Settings & Preferences
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="icon-button h-8 w-8 text-sm"
              title="Close"
            >
              <FiX />
            </button>
          </div>

          <div className="mt-4 space-y-5 text-sm">
            {/* 1. Profile & Avatar */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <FiUser /> Profile & Avatar
              </h3>

              <div className="flex items-center gap-3.5">
                <img
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    nameInput || settings.nickname || 'User',
                  )}&backgroundColor=${settings.avatarColor || '0ea5e9'}&textColor=ffffff`}
                  alt="Avatar preview"
                  className="h-14 w-14 shrink-0 rounded-full border-2 border-white/20 bg-slate-800 shadow-soft"
                />

                <form onSubmit={handleSaveNickname} className="flex-1">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your nickname"
                      maxLength={24}
                      className="field-input min-h-[2.4rem] py-1.5 text-xs sm:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!nameInput.trim() || nameInput.trim() === settings.nickname}
                      className="primary-button min-h-[2.4rem] px-3 text-xs"
                    >
                      {savedNameNotice ? <FiCheck /> : 'Save'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Avatar Color Presets */}
              <div className="mt-3">
                <span className="block text-[11px] text-slate-400 mb-1.5">
                  Avatar Accent Color
                </span>
                <div className="flex items-center gap-2.5">
                  {AVATAR_COLOR_PRESETS.map((preset) => {
                    const isSelected = settings.avatarColor === preset.hex
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => updateSettings({ avatarColor: preset.hex })}
                        title={preset.name}
                        style={{ backgroundColor: `#${preset.hex}` }}
                        className={`h-7 w-7 rounded-full transition-transform active:scale-95 ${
                          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 2. Chat Preferences */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <FiCornerDownLeft /> Chat Preferences
              </h3>

              {/* Enter to Send Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-medium text-xs sm:text-sm text-slate-200">
                    Enter key to send
                  </span>
                  <span className="text-[11px] text-slate-400">
                    When off, Enter creates a newline
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ enterToSend: !settings.enterToSend })}
                  className={`h-6 w-11 rounded-full p-1 transition-colors ${
                    settings.enterToSend ? 'bg-cyan-400' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-slate-950 transition-transform ${
                      settings.enterToSend ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Font Size Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <span className="block font-medium text-xs sm:text-sm text-slate-200">
                    Chat Font Size
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Adjust text scaling
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs font-semibold">
                  {['S', 'M', 'L'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateSettings({ fontSize: size })}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        settings.fontSize === size
                          ? 'bg-cyan-400 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Notifications & Sounds */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <FiBell /> Sounds & Feedback
              </h3>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.notificationSound ? (
                    <FiVolume2 className="text-cyan-300" />
                  ) : (
                    <FiVolumeX className="text-slate-500" />
                  )}
                  <div>
                    <span className="block font-medium text-xs sm:text-sm text-slate-200">
                      Message Sounds
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Play audio on send & receive
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      notificationSound: !settings.notificationSound,
                    })
                  }
                  className={`h-6 w-11 rounded-full p-1 transition-colors ${
                    settings.notificationSound ? 'bg-cyan-400' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-slate-950 transition-transform ${
                      settings.notificationSound ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Vibration Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <span className="block font-medium text-xs sm:text-sm text-slate-200">
                    Vibration
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Vibrate on incoming messages (mobile)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({ vibration: !settings.vibration })
                  }
                  className={`h-6 w-11 rounded-full p-1 transition-colors ${
                    settings.vibration ? 'bg-cyan-400' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-slate-950 transition-transform ${
                      settings.vibration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Browser Push Permission */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <span className="block font-medium text-xs sm:text-sm text-slate-200">
                    Browser Notifications
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Alert when browser tab is in background
                  </span>
                </div>
                {notificationPermission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-semibold">
                    <FiCheck /> Allowed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>

            {/* 4. Appearance */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <FiMoon /> Appearance
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dark', label: 'Dark', icon: FiMoon },
                  { id: 'light', label: 'Light', icon: FiSun },
                  { id: 'system', label: 'System', icon: FiGlobe },
                ].map(({ id, label, icon: Icon }) => {
                  const isSelected = settings.theme === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateSettings({ theme: id })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200'
                          : 'border-white/10 bg-black/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="text-sm" />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Room Actions: Copy Invite Link, Install App & Leave */}
            <div className="space-y-2 pt-2">
              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={promptInstall}
                  className="primary-button w-full text-xs sm:text-sm py-2.5 font-bold"
                >
                  <FiDownload className="text-base" />
                  <span>Install App to Home Screen</span>
                </button>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="secondary-button w-full text-xs sm:text-sm"
                >
                  {copiedLink ? <FiCheck className="text-cyan-300" /> : <FiCopy />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="flex items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/20 py-2.5 text-xs sm:text-sm font-bold text-rose-200 hover:bg-rose-500/30 hover:text-white transition"
                >
                  <FiLogOut />
                  <span>Leave Room</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default memo(SettingsModal)
