const PREFIXES = ['CHAT', 'ROOM', 'ANON']
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
  const suffix = Array.from({ length: 6 }, () => {
    return ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }).join('')

  return `${prefix}-${suffix}`
}
