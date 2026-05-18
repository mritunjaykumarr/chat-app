import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'

function RoomCard({ icon: Icon, title, description, children }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="glass-card group flex h-full flex-col justify-between p-5 sm:p-6"
    >
      <div>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-2xl text-cyan-100 shadow-soft">
          <Icon />
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">
          {title}
        </h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-300">
          {description}
        </p>
      </div>

      <div className="mt-6">
        {children}
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase text-cyan-100/80">
          <span>Anonymous only</span>
          <FiArrowRight className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  )
}

export default RoomCard
