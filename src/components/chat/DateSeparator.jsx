import React from 'react'
import { formatDateLabel } from '../../utils/groupMessages.js'

function DateSeparator({ date }) {
  const label = formatDateLabel(date)
  if (!label) return null

  return (
    <div className="my-3 flex items-center justify-center select-none">
      <div className="rounded-full border border-white/10 bg-slate-900/85 px-3 py-0.5 text-[11px] font-medium tracking-wide text-slate-300 shadow-sm backdrop-blur">
        {label}
      </div>
    </div>
  )
}

export default React.memo(DateSeparator)

