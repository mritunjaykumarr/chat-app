import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { FiArrowLeft, FiLoader } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import ChatBox from '../components/ChatBox.jsx'
import { hasSupabaseConfig, supabase } from '../supabase/client.js'
import { ensureAnonymousUser, getAnonymousIdentity } from '../utils/anonymousIdentity.js'

function ChatRoom() {
  const navigate = useNavigate()
  const { roomCode: routeRoomCode } = useParams()
  const roomCode = useMemo(
    () => decodeURIComponent(routeRoomCode || '').trim().toUpperCase(),
    [routeRoomCode],
  )
  const [identity, setIdentity] = useState(() => getAnonymousIdentity())
  const [roomData, setRoomData] = useState(null)
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function validateRoom() {
      if (!hasSupabaseConfig) {
        setStatus('error')
        setError('Add your Supabase URL and publishable key in .env first.')
        return
      }

      if (!roomCode) {
        setStatus('missing')
        return
      }

      setStatus('checking')

      try {
        const user = await ensureAnonymousUser()
        const currentId = user?.id || identity.id
        setIdentity((prev) => ({ ...prev, id: currentId }))

        const { data, error: lookupError } = await supabase
          .from('rooms')
          .select('id, creator_id, is_locked')
          .eq('room_code', roomCode)
          .maybeSingle()

        if (ignore) return

        if (lookupError) {
          setStatus('error')
          setError(lookupError.message)
          return
        }

        if (!data) {
          setStatus('missing')
          return
        }

        // Check if user is banned
        if (currentId) {
          const { data: banData } = await supabase
            .from('room_bans')
            .select('banned_at')
            .eq('room_code', roomCode)
            .eq('user_id', currentId)
            .maybeSingle()

          if (banData) {
            setStatus('banned')
            setError('You were removed from this room by the admin.')
            return
          }
        }

        // Check if room is locked
        if (data.is_locked && data.creator_id !== currentId) {
          setStatus('locked')
          setError('This room has been locked by the admin. No new participants can join.')
          return
        }

        setRoomData(data)
        setStatus('ready')
      } catch (err) {
        if (!ignore) {
          setStatus('error')
          setError(err.message || 'Unable to connect to room.')
        }
      }
    }

    validateRoom()

    return () => {
      ignore = true
    }
  }, [identity.id, roomCode])

  if (status === 'ready') {
    return (
      <ChatBox
        roomCode={roomCode}
        identity={identity}
        roomData={roomData}
        onLeave={() => navigate('/')}
      />
    )
  }

  return (
    <main className="app-background grid min-h-screen place-items-center px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-5 text-center"
      >
        {status === 'checking' ? (
          <>
            <FiLoader className="mx-auto mb-4 animate-spin text-3xl text-cyan-100" />
            <h1 className="font-display text-2xl font-semibold text-white">
              Connecting to room
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Checking room code {roomCode}.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-white">
              Invalid Room Code
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {error || 'This room does not exist or was typed incorrectly.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="secondary-button mx-auto mt-5"
            >
              <FiArrowLeft />
              <span>Back Home</span>
            </button>
          </>
        )}
      </motion.div>
    </main>
  )
}

export default ChatRoom
