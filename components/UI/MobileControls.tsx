'use client'

import { useRef, useState, useEffect } from 'react'

import type { TouchInput } from '../3d/GameScene'

interface Props {
  touchInputRef: React.MutableRefObject<TouchInput>
  scooterTriggerRef: React.MutableRefObject<boolean>
  jumpTriggerRef: React.MutableRefObject<boolean>
  isOnScooter: boolean
}

const DEAD = 0.12
const NUB_TRAVEL = 38

export default function MobileControls({ touchInputRef, scooterTriggerRef, jumpTriggerRef, isOnScooter }: Props) {
  const [nub, setNub] = useState({ x: 0, y: 0 })
  const baseRef = useRef<HTMLDivElement>(null)
  const tid = useRef<number | null>(null)
  const center = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = baseRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      if (tid.current !== null) return
      const t = e.changedTouches[0]
      tid.current = t.identifier
      const r = el.getBoundingClientRect()
      center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      e.preventDefault()
    }

    const onMove = (e: TouchEvent) => {
      let t: Touch | undefined
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === tid.current) { t = e.changedTouches[i]; break }
      }
      if (!t) return
      const dx = t.clientX - center.current.x
      const dy = t.clientY - center.current.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const cap = Math.min(d, 52)
      const nx = (dx / d) * (cap / 52)
      const ny = (dy / d) * (cap / 52)
      // Analog: magnitude scales speed, with a small dead zone
      const mag = Math.hypot(nx, ny)
      const scale = mag < DEAD ? 0 : (mag - DEAD) / (1 - DEAD) / mag
      touchInputRef.current = { x: nx * scale, y: ny * scale }
      setNub({ x: nx * NUB_TRAVEL, y: ny * NUB_TRAVEL })
      e.preventDefault()
    }

    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === tid.current) {
          tid.current = null
          touchInputRef.current = { x: 0, y: 0 }
          setNub({ x: 0, y: 0 })
          break
        }
      }
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [touchInputRef])

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex justify-between items-end px-5"
      style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 12px))' }}
    >
      {/* Joystick */}
      <div
        ref={baseRef}
        className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(26,47,92,0.15)',
          border: '2.5px solid rgba(26,47,92,0.22)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {/* Nub */}
        <div
          className="absolute w-[46px] h-[46px] rounded-full"
          style={{
            background: 'rgba(26,47,92,0.65)',
            border: '2px solid rgba(255,255,255,0.22)',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))`,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
        <span className="text-navy/15 text-[1.6rem] select-none pointer-events-none leading-none">✛</span>
      </div>

      {/* Right-side buttons */}
      <div className="flex flex-col items-end gap-2 mb-1">
        {/* Jump button — only when on scooter */}
        {isOnScooter && (
          <div className="flex flex-col items-center gap-1">
            <button
              onTouchStart={(e) => { e.preventDefault(); jumpTriggerRef.current = true }}
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-[1.4rem] active:scale-90 select-none"
              style={{
                background: 'rgba(0,200,240,0.75)',
                border: '2.5px solid rgba(0,200,240,0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              ↑
            </button>
            <span className="text-[0.58rem] font-bold tracking-wide text-navy/45 select-none uppercase">jump</span>
          </div>
        )}
        {/* Scooter toggle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onTouchStart={(e) => { e.preventDefault(); scooterTriggerRef.current = true }}
            className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[1.6rem] active:scale-90 select-none"
            style={{
              background: isOnScooter ? 'rgba(255,140,0,0.88)' : 'rgba(26,47,92,0.45)',
              border: `2.5px solid ${isOnScooter ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.18)'}`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            🛵
          </button>
          <span className="text-[0.58rem] font-bold tracking-wide text-navy/45 select-none uppercase">
            scooter
          </span>
        </div>
      </div>
    </div>
  )
}
