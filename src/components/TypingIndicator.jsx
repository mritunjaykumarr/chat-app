import { motion } from 'framer-motion'

const dotTransition = {
  duration: 0.7,
  repeat: Infinity,
  repeatType: 'reverse',
}

function TypingIndicator({ users }) {
  if (!users.length) {
    return null
  }

  const names = users.slice(0, 2).map((user) => user.sender_name)
  const label =
    users.length === 1
      ? `${names[0]} is typing`
      : `${names.join(', ')} are typing`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2 px-4 pb-2 text-sm text-slate-300"
    >
      <span>{label}</span>
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

export default TypingIndicator
