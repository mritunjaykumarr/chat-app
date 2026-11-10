import { createContext, useContext, useEffect, useState } from 'react'

const SETTINGS_KEY = 'anonymous_chat_app_settings'
const USER_NAME_KEY = 'anonymous_chat_user_name'

// eslint-disable-next-line react-refresh/only-export-components
export const AVATAR_COLOR_PRESETS = [
  { name: 'Sky Blue', hex: '0ea5e9' },
  { name: 'Emerald', hex: '10b981' },
  { name: 'Purple', hex: '8b5cf6' },
  { name: 'Rose', hex: 'f43f5e' },
  { name: 'Amber', hex: 'f59e0b' },
  { name: 'Indigo', hex: '6366f1' },
]

const DEFAULT_SETTINGS = {
  nickname: '',
  avatarColor: '0ea5e9',
  theme: 'dark',
  notificationSound: true,
  vibration: true,
  enterToSend: true,
  fontSize: 'M',
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      const nickname = localStorage.getItem(USER_NAME_KEY) || ''
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        nickname: parsed.nickname || nickname,
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })

  // 1. Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      if (settings.nickname) {
        localStorage.setItem(USER_NAME_KEY, settings.nickname)
      }
    } catch {
      // ignore
    }
  }, [settings])

  // 2. Apply theme (dark / light / system)
  useEffect(() => {
    const root = document.documentElement
    const theme = settings.theme || 'dark'

    const applyTheme = (isDark) => {
      if (isDark) {
        root.classList.add('dark')
        root.classList.remove('light')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      const handleChange = (e) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    applyTheme(theme === 'dark')
  }, [settings.theme])

  // 3. Apply font size (S / M / L)
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-font-size', settings.fontSize || 'M')
  }, [settings.fontSize])

  const updateSettings = (partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      if (partial.nickname !== undefined && partial.nickname.trim()) {
        localStorage.setItem(USER_NAME_KEY, partial.nickname.trim())
      }
      return next
    })
  }

  const updateNickname = (name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    updateSettings({ nickname: trimmed })
  }

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission
    } catch {
      return 'denied'
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateNickname,
        notificationPermission,
        requestNotificationPermission,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
