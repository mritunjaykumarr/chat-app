import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { FiCopy, FiLoader, FiLogIn, FiMessageCircle, FiPlus } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import RoomCard from '../components/RoomCard.jsx'
import { hasSupabaseConfig, supabase } from '../supabase/client.js'
import { generateRoomCode } from '../utils/generateRoomCode.js'

function normalizeRoomCode(value) {
  return value.trim().toUpperCase()
}

function Home() {
  const navigate = useNavigate()
  const redirectTimerRef = useRef(null)
  const [joinCode, setJoinCode] = useState('')
  const [createdRoom, setCreatedRoom] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => window.clearTimeout(redirectTimerRef.current)
  }, [])

  const createRoom = async () => {
    if (!hasSupabaseConfig) {
      setError('Add your Supabase URL and publishable key in .env first.')
      return
    }

    setCreating(true)
    setError('')

    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const roomCode = generateRoomCode()
        const { data: existingRoom, error: lookupError } = await supabase
          .from('rooms')
          .select('id')
          .eq('room_code', roomCode)
          .maybeSingle()

        if (lookupError) {
          throw lookupError
        }

        if (existingRoom) {
          continue
        }

        const { error: insertError } = await supabase
          .from('rooms')
          .insert({ room_code: roomCode })

        if (!insertError) {
          setCreatedRoom(roomCode)
          redirectTimerRef.current = window.setTimeout(() => {
            navigate(`/room/${roomCode}`)
          }, 1400)
          return
        }

        if (insertError.code !== '23505') {
          throw insertError
        }
      }

      throw new Error('Could not create a unique room code. Try again.')
    } catch (createError) {
      setError(createError.message || 'Unable to create room.')
    } finally {
      setCreating(false)
    }
  }

  const joinRoom = async (event) => {
    event.preventDefault()

    if (!hasSupabaseConfig) {
      setError('Add your Supabase URL and publishable key in .env first.')
      return
    }

    const roomCode = normalizeRoomCode(joinCode)

    if (!roomCode) {
      setError('Enter a room code first.')
      return
    }

    setJoining(true)
    setError('')

    const { data, error: lookupError } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .maybeSingle()

    setJoining(false)

    if (lookupError) {
      setError(lookupError.message)
      return
    }

    if (!data) {
      setError('Invalid Room Code')
      return
    }

    navigate(`/room/${roomCode}`)
  }

  const copyCreatedRoom = async () => {
    await navigator.clipboard.writeText(createdRoom)
  }

  const joinCreatedRoom = () => {
    window.clearTimeout(redirectTimerRef.current)
    navigate(`/room/${createdRoom}`)
  }

  return (
    <main className="app-background min-h-screen overflow-hidden px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase text-cyan-100 backdrop-blur">
            <FiMessageCircle />
            Anonymous realtime chat
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-6xl">
            Create a room, share the code, chat instantly.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            No signup, no accounts, no profiles. Just a temporary room code,
            realtime messages, typing, seen ticks, and simple media sharing.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <RoomCard
            icon={FiPlus}
            title="Create Room"
            description="Generate a unique room code and open a new anonymous chat space."
          >
            <button
              type="button"
              onClick={createRoom}
              disabled={creating}
              className="primary-button w-full"
            >
              {creating ? <FiLoader className="animate-spin" /> : <FiPlus />}
              <span>{creating ? 'Creating...' : 'Create Room'}</span>
            </button>
          </RoomCard>

          <RoomCard
            icon={FiLogIn}
            title="Enter Room Code"
            description="Paste a shared code and connect to the chat room immediately."
          >
            <form onSubmit={joinRoom} className="space-y-3">
              <input
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(event.target.value.toUpperCase())
                }
                placeholder="CHAT-82XK91"
                className="field-input"
              />
              <button
                type="submit"
                disabled={joining}
                className="secondary-button w-full"
              >
                {joining ? <FiLoader className="animate-spin" /> : <FiLogIn />}
                <span>{joining ? 'Checking...' : 'Join Chat'}</span>
              </button>
            </form>
          </RoomCard>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="mt-5 rounded-lg border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-100 backdrop-blur"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {createdRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              className="glass-card w-full max-w-md p-5 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-300 text-xl text-slate-950">
                <FiMessageCircle />
              </div>
              <h2 className="font-display text-2xl font-semibold text-white">
                Room created
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Share this code with the other person.
              </p>
              <div className="mt-5 rounded-lg border border-white/15 bg-slate-950/60 px-4 py-4 font-mono text-2xl font-semibold text-cyan-100">
                {createdRoom}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={copyCreatedRoom}
                  className="secondary-button"
                >
                  <FiCopy />
                  <span>Copy Code</span>
                </button>
                <button
                  type="button"
                  onClick={joinCreatedRoom}
                  className="primary-button"
                >
                  <FiLogIn />
                  <span>Join Chat</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default Home
