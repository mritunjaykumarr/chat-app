import React from 'react'
import { motion } from 'framer-motion'
import { FaCrown } from 'react-icons/fa'

const dotTransition = {
  duration: 0.7,
  repeat: Infinity,
  repeatType: 'reverse',
}

function TypingIndicator({ users, creatorId }) {
  if (!users.length) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-2 px-4 pb-1.5 text-xs text-slate-300 select-none"
    >
      <div className="flex items-center gap-1.5">
        {users.slice(0, 2).map((user, idx) => (
          <span key={user.sender_id} className="inline-flex items-center gap-1">
            {idx > 0 && <span>,</span>}
            <span className="font-medium text-slate-200">{user.sender_name}</span>
            {creatorId && user.sender_id === creatorId && (
              <FaCrown className="text-[10px] text-amber-400" title="Admin" />
            )}
          </span>
        ))}
        <span>{users.length === 1 ? 'is typing' : 'are typing'}</span>
      </div>

      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            animate={{ opacity: [0.35, 1], y: [0, -3] }}
            transition={{ ...dotTransition, delay: index * 0.12 }}
            className="h-1.5 w-1.5 rounded-full bg-cyan-200"
          />
        ))}
      </span>
    </motion.div>
  )
}

export default React.memo(TypingIndicator)
