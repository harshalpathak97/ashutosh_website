'use client'

import type { Zone } from '../GamePortfolio'

type NavZone = Exclude<Zone, null>

const NAV_ITEMS: { id: NavZone; label: string; icon: string }[] = [
  { id: 'home',    label: 'Home',    icon: '⌂' },
  { id: 'about',   label: 'About',   icon: '◉' },
  { id: 'work',    label: 'Work',    icon: '▣' },
  { id: 'contact', label: 'Contact', icon: '✉' },
  { id: 'play',    label: 'Play',    icon: '★' },
]

export default function NavBar({
  activeZone, onNavigate, isMobile,
}: {
  activeZone: Zone
  onNavigate: (zone: NavZone) => void
  isMobile: boolean
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none">
      <div
        className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-full shadow-lg border"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: 'rgba(0,0,0,0.06)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeZone === item.id ||
            (item.id === 'home' && activeZone === null)
          const isPlay = item.id === 'play'
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-1.5 rounded-full font-bold transition-all duration-200 active:scale-95"
              style={{
                padding: isMobile ? '6px 10px' : '7px 14px',
                fontSize: isMobile ? '0.62rem' : '0.72rem',
                background: isActive ? (isPlay ? '#14a3b8' : '#1f3566') : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(31,53,102,0.62)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              <span style={{ fontSize: isMobile ? '0.78rem' : '0.88rem', lineHeight: 1 }}>
                {item.icon}
              </span>
              {!isMobile && <span>{item.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
