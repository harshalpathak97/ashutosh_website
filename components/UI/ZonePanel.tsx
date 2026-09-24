'use client'

import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import type { Zone } from '../GamePortfolio'
import { ABOUT, WORK, CONTACT, PLAY, EMAIL, LINKEDIN, RESUME_URL } from '../content'

type PanelZone = 'about' | 'work' | 'contact' | 'play'
const DATA = { about: ABOUT, work: WORK, contact: CONTACT, play: PLAY }

export const MailIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)
export const LinkedInIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

function PanelContent({ zone }: { zone: PanelZone }) {
  if (zone === 'about') return (
    <>
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ashutosh.jpg" alt="Ashutosh Pathak" className="w-14 h-14 rounded-full object-cover border-2 border-orange" />
        <div>
          <h2 className="text-[1.3rem] font-black text-navy leading-tight">{ABOUT.title}</h2>
          <p className="text-[0.75rem] font-semibold text-navy/55">{ABOUT.subtitle}</p>
        </div>
      </div>
      <p className="text-[0.84rem] text-navy/80 leading-relaxed mb-4">{ABOUT.body}</p>
      <p className="text-[0.62rem] font-black uppercase tracking-widest text-navy/40 mb-2">What I do</p>
      <ul className="space-y-1.5">
        {ABOUT.skills.map((s) => (
          <li key={s} className="flex items-center gap-2 text-[0.8rem] text-navy">
            <span className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />{s}
          </li>
        ))}
      </ul>
    </>
  )

  if (zone === 'work') return (
    <>
      <h2 className="text-[1.3rem] font-black text-navy leading-tight">{WORK.title}</h2>
      <p className="text-[0.75rem] font-semibold text-navy/55 mb-3">{WORK.subtitle}</p>
      <div className="space-y-2">
        {WORK.cases.map((c) => (
          <div key={c.title} className="p-3 rounded-xl bg-navy/[0.04] border-l-4" style={{ borderColor: c.color }}>
            <p className="text-[0.85rem] font-black text-navy leading-tight mb-1">{c.title}</p>
            <p className="text-[0.74rem] text-navy/70 leading-snug">{c.challenge} {c.approach}</p>
            {c.result && <p className="text-[0.74rem] font-bold text-navy mt-1">→ {c.result}</p>}
          </div>
        ))}
      </div>
    </>
  )

  if (zone === 'contact') return (
    <>
      <h2 className="text-[1.3rem] font-black text-navy leading-tight">{CONTACT.title}</h2>
      <p className="text-[0.75rem] font-semibold text-navy/55 mb-3">{CONTACT.subtitle}</p>
      <p className="text-[0.84rem] text-navy/80 leading-relaxed mb-4">{CONTACT.body}</p>
      <div className="space-y-2">
        <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 p-3 rounded-xl bg-orange text-white hover:bg-navy transition-colors">
          <MailIcon />
          <span><span className="block text-[0.75rem] font-black">Email me</span><span className="block text-[0.7rem] opacity-80">{EMAIL}</span></span>
        </a>
        <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-navy text-white hover:bg-orange transition-colors">
          <LinkedInIcon />
          <span className="text-[0.75rem] font-black">Connect on LinkedIn</span>
        </a>
        {RESUME_URL && (
          <a href={RESUME_URL} target="_blank" rel="noopener noreferrer" className="block text-center p-2.5 rounded-xl border-2 border-navy/15 text-navy text-[0.75rem] font-black hover:border-orange">
            Download résumé (PDF)
          </a>
        )}
      </div>
    </>
  )

  return (
    <>
      <h2 className="text-[1.3rem] font-black text-navy leading-tight">{PLAY.title}</h2>
      <p className="text-[0.75rem] font-semibold text-navy/55 mb-3">{PLAY.subtitle}</p>
      <ol className="space-y-2">
        {PLAY.tips.map((tip, i) => (
          <li key={tip} className="flex items-start gap-2.5 text-[0.8rem] text-navy/85 leading-snug">
            <span className="w-5 h-5 flex-shrink-0 rounded-full bg-teal text-white text-[0.65rem] font-black flex items-center justify-center">{i + 1}</span>
            {tip}
          </li>
        ))}
      </ol>
    </>
  )
}

export default function ZonePanel({ activeZone, isMobile }: { activeZone: Zone; isMobile: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = useState(false)
  // Mobile: play zone starts collapsed so it doesn't cover the controls
  const [expanded, setExpanded] = useState(true)

  const zone = activeZone && activeZone !== 'home' && !dismissed ? (activeZone as PanelZone) : null
  const accent = zone === 'play' ? '#14a3b8' : '#ff8a1f'

  useEffect(() => {
    setDismissed(false)
    setExpanded(activeZone !== 'play')
  }, [activeZone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDismissed(true) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const el = panelRef.current
    if (!el || !zone) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.killTweensOf(el)
    gsap.fromTo(el,
      isMobile ? { y: 40, opacity: 0 } : { x: 40, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: reduce ? 0 : 0.45, ease: 'power3.out' })
  }, [zone, isMobile, expanded])

  if (!zone) return null
  const data = DATA[zone]

  if (isMobile && !expanded) {
    return (
      <div ref={panelRef} className="absolute left-1/2 -translate-x-1/2 z-[25]" style={{ bottom: 'calc(168px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={() => setExpanded(true)} className="flex items-center gap-2 pl-4 pr-3 py-2 rounded-full shadow-xl text-white" style={{ background: accent }}>
          <span className="text-[0.68rem] font-black uppercase tracking-widest">{data.tag}</span>
          <span className="text-[0.75rem] leading-none">▴</span>
        </button>
      </div>
    )
  }

  const header = (
    <div className="px-5 py-2 flex items-center justify-between" style={{ background: accent }}>
      <span className="text-[0.66rem] font-black uppercase tracking-widest text-white">{data.tag}</span>
      <button
        onClick={() => (isMobile ? setExpanded(false) : setDismissed(true))}
        className="text-white/85 hover:text-white text-[0.62rem] font-black uppercase tracking-widest"
        aria-label={isMobile ? 'Minimize panel' : 'Close panel'}
      >
        {isMobile ? 'Minimize ▾' : 'Close ✕'}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <div ref={panelRef} className="absolute bottom-0 left-0 right-0 z-[25]">
        <div className="rounded-t-3xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-lg">
          {header}
          <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: '42vh', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 150px)' }}>
            <PanelContent zone={zone} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={panelRef} className="absolute right-7 top-1/2 -translate-y-1/2 w-[330px] z-20" role="dialog" aria-label={data.tag}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
        {header}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          <PanelContent zone={zone} />
        </div>
      </div>
    </div>
  )
}
