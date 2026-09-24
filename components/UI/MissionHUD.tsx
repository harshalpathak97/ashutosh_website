'use client'

import { useState } from 'react'

export type Mission = { id: string; title: string; completed: boolean }

export const INITIAL_MISSIONS: Mission[] = [
  { id: 'visit_about',   title: 'Meet Ashutosh (About)',   completed: false },
  { id: 'visit_work',    title: 'See the work',            completed: false },
  { id: 'visit_contact', title: 'Find the contact spot',   completed: false },
  { id: 'collect_coins', title: 'Collect 5 skill coins',   completed: false },
  { id: 'ring_rider',    title: 'Jump through all 5 stars', completed: false },
]

interface Props {
  missions: Mission[]
  coinCount: number
  ringCount: number
  isMobile: boolean
}

export default function MissionHUD({ missions, coinCount, ringCount, isMobile }: Props) {
  const [expanded, setExpanded] = useState(false)
  const done = missions.filter((m) => m.completed).length
  const pct = (done / missions.length) * 100

  return (
    <div className={`absolute z-20 select-none ${isMobile ? 'left-3 top-[118px]' : 'left-7 top-[96px]'}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="glass flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-full text-navy"
      >
        <span className="relative w-5 h-5 rounded-full" style={{ background: `conic-gradient(#ff8a1f ${pct}%, rgba(31,53,102,0.15) 0)` }}>
          <span className="absolute inset-[3px] rounded-full bg-white" />
        </span>
        <span className="text-[0.72rem] font-bold">{done}/{missions.length} goals</span>
        <span className="w-px h-3 bg-navy/20" />
        <span className="text-[0.72rem] font-semibold text-navy/70">Coins {coinCount}/8</span>
        <span className="text-[0.72rem] font-semibold text-navy/70">Stars {ringCount}/5</span>
        <span className={`text-[0.6rem] text-navy/50 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <div
        className="glass mt-2 rounded-2xl p-2 w-[240px] origin-top-left transition-all duration-200"
        style={{ opacity: expanded ? 1 : 0, transform: expanded ? 'scale(1)' : 'scale(0.96)', pointerEvents: expanded ? 'auto' : 'none' }}
        aria-hidden={!expanded}
      >
        {missions.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
            <span
              className={`w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-[0.55rem] font-black ${
                m.completed ? 'bg-orange border-orange text-white' : 'border-navy/25'
              }`}
            >
              {m.completed ? '✓' : ''}
            </span>
            <span className={`text-[0.75rem] font-semibold ${m.completed ? 'text-navy/45 line-through' : 'text-navy'}`}>{m.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
