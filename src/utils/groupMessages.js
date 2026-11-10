import { isToday, isYesterday, format } from 'date-fns'

/**
 * Human-friendly date label for date separators
 * (e.g. 'Today', 'Yesterday', or 'November 10, 2026')
 */
export function formatDateLabel(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''

  if (isToday(date)) {
    return 'Today'
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  return format(date, 'MMMM d, yyyy')
}

/**
 * Returns a stable string key for a calendar day (YYYY-MM-DD)
 */
export function getDayKey(dateInput) {
  if (!dateInput) return 'unknown'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

/**
 * Transforms an array of messages into a flat list of render items for Virtuoso,
 * inserting date separators and grouping consecutive messages from the same sender.
 */
export function buildVirtuosoItems(messages, currentUserId) {
  if (!messages || !messages.length) {
    return []
  }

  const items = []
  let lastDayKey = null
  let lastSenderId = null

  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i]
    const dayKey = getDayKey(msg.created_at)

    // When the calendar day changes, insert a date separator item
    if (dayKey !== lastDayKey) {
      items.push({
        type: 'date',
        id: `date-sep-${dayKey}`,
        date: msg.created_at,
      })
      lastDayKey = dayKey
      lastSenderId = null // Reset grouping across day boundaries
    }

    const nextMsg = messages[i + 1]
    const nextDayKey = nextMsg ? getDayKey(nextMsg.created_at) : null

    const isSameSenderAsPrev = msg.sender_id === lastSenderId
    const isSameSenderAsNext =
      Boolean(nextMsg) &&
      nextMsg.sender_id === msg.sender_id &&
      nextDayKey === dayKey

    const isFirstInGroup = !isSameSenderAsPrev
    const isLastInGroup = !isSameSenderAsNext

    items.push({
      type: 'message',
      id: msg.id,
      message: msg,
      isOwn: msg.sender_id === currentUserId,
      isFirstInGroup,
      isLastInGroup,
    })

    lastSenderId = msg.sender_id
  }

  return items
}

