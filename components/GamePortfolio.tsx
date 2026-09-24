'use client'

import { useState, useCallback, useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, Preload } from '@react-three/drei'
import ZonePanel, { MailIcon, LinkedInIcon } from './UI/ZonePanel'
import ControlsHint from './UI/ControlsHint'
import MissionHUD, { INITIAL_MISSIONS, type Mission } from './UI/MissionHUD'
import MobileControls from './UI/MobileControls'
import NavBar from './UI/NavBar'
import GameScene, { Effects, type TouchInput } from './3d/GameScene'
import { INTRO, EMAIL, LINKEDIN, RESUME_URL } from './content'

export type Zone = 'home' | 'about' | 'work' | 'contact' | 'play' | null

// Super Intro unlocks the moment all 5 rings (stars) are collected.
const SUPER_INTRO_MISSION = 'ring_rider'
const SUPER_INTRO_SUBJECT = "Loved your interactive portfolio — let's connect"
const SUPER_INTRO_BODY = `Hi Ashutosh,

I just finished the Play Zone on your portfolio — collected all five stars and rode the scooter through the whole world. It says a lot about how you think about brand experiences.

I'd love to chat about what you're working on. A quick intro about me:

• Name:
• Company / Role:
• What I'm working on:
• Why I think we should talk:

Are you open to a 20-minute call next week?

Best,
`

const TOUR: { zone: Exclude<Zone, null>; caption: string }[] = [
  { zone: 'about', caption: 'Who I am' },
  { zone: 'work', caption: 'Selected campaigns' },
  { zone: 'contact', caption: 'How to reach me' },
]
const TOUR_STEP_MS = 6000

const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape']

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Keeps the loader up until a few frames have rendered, hiding first-frame shader compiles
function Ready({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 10) onReady()
  })
  return null
}

export default function GamePortfolio() {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [activeZone, setActiveZone] = useState<Zone>(null)
  const [isReady, setIsReady] = useState(false)
  const [introOpen, setIntroOpen] = useState(true)
  const [tourStep, setTourStep] = useState<number | null>(null)
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS)
  const [coinCount, setCoinCount] = useState(0)
  const [ringCount, setRingCount] = useState(0)
  const [isOnScooter, setIsOnScooter] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  // This component is client-only (ssr: false), so device checks can run in initialisers.
  // Deciding quality before the first frame avoids a shader recompile when effects switch on.
  const [isMobile] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  // Capped at 1.25: at retina sizes 1.5x+ drops to ~40 fps on an M2 for little visible gain
  const [dpr, setDpr] = useState(() => Math.min(1.25, window.devicePixelRatio))
  // Post-processing on desktop only; bloom is dropped if the frame rate struggles
  const [fullFx, setFullFx] = useState(true)
  const [showSuperIntro, setShowSuperIntro] = useState(false)
  const superIntroFiredRef = useRef(false)

  const completedRef = useRef(new Set<string>())
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const touchInputRef = useRef<TouchInput>({ x: 0, y: 0 })
  const scooterTriggerRef = useRef(false)
  const jumpTriggerRef = useRef(false)
  const teleportTargetRef = useRef<Exclude<Zone, null> | null>(null)
  const cinematicRef = useRef(true)

  useEffect(() => {
    const ok = hasWebGL()
    setWebgl(ok)
    if (!ok) return
    document.documentElement.classList.add('game-active')
    return () => document.documentElement.classList.remove('game-active')
  }, [])

  const closeIntro = useCallback(() => {
    cinematicRef.current = false
    setIntroOpen(false)
  }, [])

  // Any movement key (or Esc) dismisses the intro card.
  useEffect(() => {
    if (!introOpen || !isReady) return
    const onKey = (e: KeyboardEvent) => { if (MOVE_KEYS.includes(e.key.toLowerCase())) closeIntro() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [introOpen, isReady, closeIntro])

  // Guided tour: hop through the zones; any key or tap hands control back.
  useEffect(() => {
    if (tourStep === null) return
    if (tourStep >= TOUR.length) { setTourStep(null); return }
    teleportTargetRef.current = TOUR[tourStep].zone
    const next = setTimeout(() => setTourStep((s) => (s === null ? null : s + 1)), TOUR_STEP_MS)
    const stop = () => setTourStep(null)
    const arm = setTimeout(() => {
      window.addEventListener('keydown', stop, { once: true })
      window.addEventListener('pointerdown', stop, { once: true })
    }, 50)
    return () => {
      clearTimeout(next); clearTimeout(arm)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('pointerdown', stop)
    }
  }, [tourStep])

  const startTour = useCallback(() => {
    closeIntro()
    setTourStep(0)
  }, [closeIntro])

  useEffect(() => {
    if (superIntroFiredRef.current) return
    if (missions.find((m) => m.id === SUPER_INTRO_MISSION)?.completed) {
      superIntroFiredRef.current = true
      setShowSuperIntro(true)
    }
  }, [missions])

  const showToast = useCallback((text: string) => {
    clearTimeout(toastTimer.current)
    setToast({ text, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const completeMission = useCallback((id: string) => {
    if (completedRef.current.has(id)) return
    completedRef.current.add(id)
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, completed: true } : m)))
    const title = INITIAL_MISSIONS.find((m) => m.id === id)?.title ?? id
    showToast(`Goal complete · ${title}`)
  }, [showToast])

  const handleZoneChange = useCallback((zone: Zone) => {
    setActiveZone(zone)
    if (zone === 'about') completeMission('visit_about')
    if (zone === 'work') completeMission('visit_work')
    if (zone === 'contact') completeMission('visit_contact')
  }, [completeMission])

  const handleCoinCollect = useCallback((total: number) => {
    setCoinCount(total)
    if (total >= 5) completeMission('collect_coins')
    else showToast(`Skill coin ${total}/8`)
  }, [completeMission, showToast])

  const handleRingCollect = useCallback((total: number) => {
    setRingCount(total)
    if (total >= 5) completeMission('ring_rider')
    else showToast(`Star ${total}/5`)
  }, [completeMission, showToast])

  const handleBoostActivate = useCallback(() => showToast('Boost!'), [showToast])

  const handleScooterToggle = useCallback((isOn: boolean) => {
    setIsOnScooter(isOn)
    showToast(isOn ? 'Scooter on · Space to jump' : 'Walking')
  }, [showToast])

  const handleFirstMove = useCallback(() => setHasMoved(true), [])
  const handleReady = useCallback(() => setIsReady(true), [])
  const handleNavigate = useCallback((zone: Exclude<Zone, null>) => {
    if (introOpen) closeIntro()
    teleportTargetRef.current = zone
  }, [introOpen, closeIntro])

  // No WebGL: render nothing so the server-rendered fallback page shows.
  if (webgl === false) return null

  const showChrome = isReady && !introOpen

  return (
    <div id="game" data-fx={isMobile ? 'none' : fullFx ? 'full' : 'lite'} className="fixed inset-0 z-10 overflow-hidden" style={{ background: '#d4e9f0' }}>
      {/* Loading overlay — fades out once fonts/textures are ready */}
      <div
        className="absolute inset-0 z-50 flex items-center justify-center bg-cream transition-opacity duration-700"
        style={{ opacity: isReady ? 0 : 1, pointerEvents: isReady ? 'none' : 'auto' }}
        aria-hidden={isReady}
      >
        <div className="text-center">
          <p className="text-[2rem] font-black text-navy mb-1">{INTRO.name}</p>
          <p className="text-sm font-bold uppercase tracking-widest text-navy/50">Building the world…</p>
          <div className="mt-5 mx-auto w-40 h-1 rounded-full bg-navy/10 overflow-hidden">
            <div className="h-full w-1/3 bg-orange rounded-full" style={{ animation: 'loadingBar 1.1s ease-in-out infinite' }} />
          </div>
        </div>
      </div>

      {webgl && (
        <Canvas
          camera={{ position: [0, 18, 25], fov: 50, near: 0.5, far: 260 }}
          shadows="soft"
          dpr={dpr}
          gl={{ antialias: true }}
          onCreated={({ gl }) => { gl.toneMappingExposure = 1.05 }}
          style={{ touchAction: 'none' }}
          aria-hidden
        >
          {/* Drop bloom + resolution if we can't hold ~50 fps (60+ on high-refresh screens) */}
          <PerformanceMonitor bounds={(hz) => (hz > 100 ? [60, 100] : [50, 60])} onDecline={() => { setDpr(1); setFullFx(false) }} />
          <Suspense fallback={null}>
            <GameScene
              onZoneChange={handleZoneChange}
              onCoinCollect={handleCoinCollect}
              onScooterToggle={handleScooterToggle}
              onFirstMove={handleFirstMove}
              onRingCollect={handleRingCollect}
              onBoostActivate={handleBoostActivate}
              touchInputRef={touchInputRef}
              scooterTriggerRef={scooterTriggerRef}
              jumpTriggerRef={jumpTriggerRef}
              teleportTargetRef={teleportTargetRef}
              cinematicRef={cinematicRef}
            />
            <Preload all />
            <Ready onReady={handleReady} />
          </Suspense>
          {!isMobile && <Effects full={fullFx} />}
        </Canvas>
      )}

      {/* ── Intro card ─────────────────────────────────────────────────────── */}
      {isReady && introOpen && (
        <div className={`absolute inset-0 z-40 flex ${isMobile ? 'items-end' : 'items-center'} px-4 md:px-12 pb-4`} style={{ animation: 'fadeIn 0.5s ease' }}>
          <div
            className="w-full max-w-[520px] rounded-3xl p-6 md:p-8 bg-white/95 backdrop-blur-md shadow-2xl"
            style={{ animation: 'popIn 0.6s cubic-bezier(0.22,1,0.36,1)' }}
            role="dialog"
            aria-labelledby="intro-title"
          >
            <p className="text-[1rem] md:text-[1.1rem] font-bold text-orange mb-2">{INTRO.greeting}</p>
            <h1 id="intro-title" className="text-[1.6rem] md:text-[2rem] font-black text-navy leading-[1.15] tracking-tight">
              {INTRO.headline}
            </h1>
            <p className="text-[0.92rem] md:text-[0.98rem] text-navy/70 leading-relaxed mt-3">{INTRO.sub}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {INTRO.proof.map((p) => (
                <span key={p} className="px-3 py-1 rounded-full bg-navy/[0.06] text-[0.72rem] font-bold text-navy">{p}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              <button onClick={closeIntro} className="px-5 py-3 rounded-xl bg-orange text-white font-black text-[0.85rem] hover:bg-navy transition-colors" autoFocus>
                Explore my work
              </button>
              <button onClick={startTour} className="px-5 py-3 rounded-xl bg-navy text-white font-black text-[0.85rem] hover:bg-orange transition-colors">
                Take a quick tour
              </button>
              <a href={`mailto:${EMAIL}`} className="px-5 py-3 rounded-xl border-2 border-navy/15 text-navy font-black text-[0.85rem] hover:border-orange transition-colors">
                Email me
              </a>
            </div>
            <p className="text-[0.72rem] text-navy/45 mt-4">
              {isMobile ? 'This site is a small world. Use the joystick to walk to each area.' : 'This site is a small world. Walk to each area with WASD or the arrow keys.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Persistent chrome ──────────────────────────────────────────────── */}
      <div className="absolute top-4 left-3 md:top-6 md:left-7 z-30 transition-opacity duration-500" style={{ opacity: showChrome ? 1 : 0, pointerEvents: showChrome ? 'auto' : 'none' }}>
        <div className="glass rounded-2xl px-3.5 py-2">
          <p className="text-[0.95rem] md:text-[1.1rem] font-black text-navy leading-tight">{INTRO.name}</p>
          <p className="hidden md:block text-[0.62rem] font-bold uppercase tracking-widest text-navy/55">{INTRO.role}</p>
        </div>
      </div>

      <div className="absolute top-4 right-3 md:top-6 md:right-7 z-30 flex items-center gap-2 transition-opacity duration-500" style={{ opacity: showChrome ? 1 : 0, pointerEvents: showChrome ? 'auto' : 'none' }}>
        {RESUME_URL && !isMobile && (
          <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" className="glass px-4 py-2.5 rounded-full text-[0.75rem] font-black text-navy hover:text-orange">
            Résumé
          </a>
        )}
        <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="glass w-10 h-10 rounded-full flex items-center justify-center text-navy hover:text-orange">
          <LinkedInIcon />
        </a>
        <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-orange text-white text-[0.75rem] font-black shadow-lg hover:bg-navy transition-colors">
          <MailIcon />
          <span>Let&apos;s talk</span>
        </a>
      </div>

      {showChrome && (
        <>
          <div className={isMobile ? 'absolute top-[60px] landscape:top-0 left-0 right-0' : ''}>
            <NavBar activeZone={activeZone} onNavigate={handleNavigate} isMobile={isMobile} />
          </div>
          <MissionHUD missions={missions} coinCount={coinCount} ringCount={ringCount} isMobile={isMobile} />
        </>
      )}

      <ZonePanel activeZone={introOpen ? null : activeZone} isMobile={isMobile} />

      {!isMobile && <ControlsHint visible={showChrome && !hasMoved && tourStep === null} />}

      {showChrome && isMobile && (
        <MobileControls
          touchInputRef={touchInputRef}
          scooterTriggerRef={scooterTriggerRef}
          jumpTriggerRef={jumpTriggerRef}
          isOnScooter={isOnScooter}
        />
      )}

      {/* Tour caption */}
      {tourStep !== null && tourStep < TOUR.length && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 glass rounded-full px-5 py-2.5 flex items-center gap-3 whitespace-nowrap" style={{ animation: 'fadeIn 0.3s ease' }}>
          <span className="text-[0.68rem] font-black uppercase tracking-widest text-orange">Tour {tourStep + 1}/{TOUR.length}</span>
          <span className="text-[0.85rem] font-bold text-navy">{TOUR[tourStep].caption}</span>
          <span className="text-[0.7rem] text-navy/45">· press any key to take over</span>
        </div>
      )}

      {/* Super Intro celebration — unlocked when all 5 stars are collected */}
      {showSuperIntro && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center px-5"
          style={{ background: 'rgba(10,20,40,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'fadeIn 0.25s ease forwards' }}
          onClick={() => setShowSuperIntro(false)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl bg-white"
            style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="super-intro-title"
          >
            <div className="px-6 py-5 text-white text-center" style={{ background: 'linear-gradient(135deg,#14a3b8 0%,#ff8a1f 100%)' }}>
              <p className="text-[0.65rem] font-black uppercase tracking-widest text-white/80">Play Zone cleared</p>
              <h2 id="super-intro-title" className="text-[1.35rem] font-black mt-1 leading-tight">You unlocked the Super Intro</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-[0.85rem] text-navy/75 leading-relaxed">
                You found every star. Skip the cold email: send Ashutosh a pre-written intro and just fill in your name and what you do.
              </p>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(SUPER_INTRO_SUBJECT)}&body=${encodeURIComponent(SUPER_INTRO_BODY)}`}
                className="mt-5 w-full py-3 rounded-xl bg-navy text-white font-black text-[0.85rem] uppercase tracking-wide hover:bg-orange transition-colors flex items-center justify-center gap-2"
              >
                <MailIcon /> Send Super Intro
              </a>
              <button onClick={() => setShowSuperIntro(false)} className="mt-2 w-full py-2.5 rounded-xl text-navy/55 font-bold text-[0.78rem] hover:text-navy">
                Keep playing
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          key={toast.key}
          className={`absolute left-1/2 pointer-events-none z-40 ${isMobile ? 'top-[164px] landscape:top-auto landscape:bottom-8' : 'top-24'}`}
          style={{ animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          role="status"
        >
          <div className="bg-navy/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-[0.8rem] font-bold shadow-xl whitespace-nowrap">
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
