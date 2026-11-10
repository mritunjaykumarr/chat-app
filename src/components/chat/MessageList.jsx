import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Virtuoso } from 'react-virtuoso'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowDown, FiLoader, FiWifi } from 'react-icons/fi'
import MessageBubble from '../MessageBubble.jsx'
import TypingIndicator from '../TypingIndicator.jsx'
import DateSeparator from './DateSeparator.jsx'
import { buildVirtuosoItems } from '../../utils/groupMessages.js'

const START_INDEX = 100000

function SkeletonChat() {
  return (
    <div className="flex flex-1 min-h-0 flex-col justify-end gap-3 px-3 py-4 sm:px-6 animate-pulse">
      <div className="self-start w-48 sm:w-64 rounded-2xl rounded-bl-none bg-[#202c33]/80 p-3 space-y-2">
        <div className="h-2.5 w-20 rounded bg-slate-700/70" />
        <div className="h-3 w-36 rounded bg-slate-700/50" />
      </div>
      <div className="self-end w-56 sm:w-72 rounded-2xl rounded-br-none bg-[#005c4b]/50 p-3 space-y-2">
        <div className="h-3 w-44 rounded bg-emerald-700/50" />
        <div className="h-2.5 w-24 rounded bg-emerald-700/30" />
      </div>
      <div className="self-start w-40 sm:w-52 rounded-2xl rounded-bl-none bg-[#202c33]/80 p-3 space-y-2">
        <div className="h-3 w-32 rounded bg-slate-700/50" />
      </div>
      <div className="self-end w-64 sm:w-80 rounded-2xl rounded-br-none bg-[#005c4b]/50 p-3 space-y-2">
        <div className="h-3 w-52 rounded bg-emerald-700/50" />
        <div className="h-3 w-36 rounded bg-emerald-700/30" />
      </div>
      <div className="self-start w-52 sm:w-60 rounded-2xl rounded-bl-none bg-[#202c33]/80 p-3 space-y-2">
        <div className="h-2.5 w-24 rounded bg-slate-700/70" />
        <div className="h-3 w-40 rounded bg-slate-700/50" />
      </div>
    </div>
  )
}

function MessageList({
  messages,
  loading,
  loadingOlder,
  hasMore,
  currentUserId,
  creatorId,
  otherUsersCount,
  typingUsers,
  onLoadOlder,
  onRetry,
  onEdit,
  onDelete,
  onToggleReaction,
  onReply,
}) {
  const virtuosoRef = useRef(null)
  const isAtBottomRef = useRef(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const prevMessagesLengthRef = useRef(messages.length)
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX)

  // 1. Process messages into list items (date separators + grouped message bubbles)
  const items = useMemo(() => {
    return buildVirtuosoItems(messages, currentUserId)
  }, [messages, currentUserId])

  // 2. Initialize firstItemIndex once initial items load
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    if (!hasInitializedRef.current && items.length > 0) {
      setFirstItemIndex(START_INDEX - items.length)
      hasInitializedRef.current = true
    }
  }, [items.length])

  // 3. Smart auto-scroll and new message counter logic
  useEffect(() => {
    const prevCount = prevMessagesLengthRef.current
    const currentCount = messages.length
    prevMessagesLengthRef.current = currentCount

    if (currentCount <= prevCount) return

    const latestMessage = messages[messages.length - 1]
    const isOwnMessage = latestMessage?.sender_id === currentUserId

    // Always scroll to bottom for user's own sent messages or if user is near bottom
    if (isOwnMessage || isAtBottomRef.current) {
      virtuosoRef.current?.scrollToIndex({
        index: items.length - 1,
        align: 'end',
        behavior: 'smooth',
      })
      if (!isAtBottomRef.current) {
        requestAnimationFrame(() => setNewMessagesCount(0))
      }
      return
    }

    // User is scrolled up reading history: increment count and show floating button
    const diff = currentCount - prevCount
    requestAnimationFrame(() => {
      setNewMessagesCount((prev) => prev + diff)
    })
  }, [currentUserId, items.length, messages])

  // 4. Handle pagination when user scrolls to top
  const handleStartReached = useCallback(async () => {
    if (loadingOlder || !hasMore) return

    const prependedCount = await onLoadOlder?.()
    if (prependedCount && prependedCount > 0) {
      setFirstItemIndex((prev) => prev - prependedCount)
    }
  }, [hasMore, loadingOlder, onLoadOlder])

  // 5. Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: items.length - 1,
      align: 'end',
      behavior: 'smooth',
    })
    setNewMessagesCount(0)
  }, [items.length])

  // 6. Header component (shows loading spinner when fetching older messages)
  const Header = useCallback(() => {
    if (!loadingOlder) return null
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400">
        <FiLoader className="animate-spin text-cyan-200" />
        <span>Loading older messages...</span>
      </div>
    )
  }, [loadingOlder])

  // 7. Footer component (renders typing indicators at the end of the stream)
  const Footer = useCallback(() => {
    return (
      <div className="pt-1 pb-2">
        <AnimatePresence>
          <TypingIndicator users={typingUsers} creatorId={creatorId} />
        </AnimatePresence>
      </div>
    )
  }, [creatorId, typingUsers])

  if (loading) {
    return <SkeletonChat />
  }

  if (items.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-2xl">
            <FiWifi />
          </div>
          <h2 className="font-display text-2xl font-semibold text-white">
            Room is ready
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
            Share the room code and start chatting as soon as the other person joins.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 min-h-0 w-full flex-col overflow-hidden overflow-x-hidden">
      <Virtuoso
        ref={virtuosoRef}
        data={items}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={items.length > 0 ? items.length - 1 : 0}
        startReached={handleStartReached}
        atBottomThreshold={120}
        atBottomStateChange={(atBottom) => {
          isAtBottomRef.current = atBottom
          setIsAtBottom(atBottom)
          if (atBottom) {
            setNewMessagesCount(0)
          }
        }}
        followOutput={(isBottom) => (isBottom ? 'smooth' : false)}
        alignToBottom
        className="message-scroll flex-1 min-h-0 w-full overflow-x-hidden overscroll-contain px-2 py-2 sm:px-4"
        components={{
          Header,
          Footer,
        }}
        itemContent={(index, item) => {
          if (item.type === 'date') {
            return <DateSeparator key={item.id} date={item.date} />
          }

          return (
            <MessageBubble
              key={item.id}
              message={item.message}
              isOwn={item.isOwn}
              isDelivered={otherUsersCount > 0}
              isFirstInGroup={item.isFirstInGroup}
              isLastInGroup={item.isLastInGroup}
              isAdminMessage={Boolean(creatorId && item.message.sender_id === creatorId)}
              isCurrentUserAdmin={Boolean(creatorId && currentUserId === creatorId)}
              currentUserId={currentUserId}
              onRetry={onRetry}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleReaction={onToggleReaction}
              onReply={onReply}
            />
          )
        }}
      />

      {/* Floating "↓ N new messages" pill */}
      <AnimatePresence>
        {newMessagesCount > 0 && !isAtBottom && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            onClick={scrollToBottom}
            className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-cyan-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-glow transition hover:bg-cyan-300 active:scale-95"
          >
            <FiArrowDown className="text-sm" />
            <span>
              {newMessagesCount} new{' '}
              {newMessagesCount === 1 ? 'message' : 'messages'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default React.memo(MessageList)

