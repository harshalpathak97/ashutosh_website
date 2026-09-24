'use client'

// Desktop-only keyboard hint; GamePortfolio hides it once the player first moves.
export default function ControlsHint({ visible }: { visible: boolean }) {
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 glass flex items-center gap-4 px-4 py-2.5 rounded-2xl select-none pointer-events-none transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden
    >
      <Hint keys={['W', 'A', 'S', 'D']} label="move" />
      <Hint keys={['E']} label="scooter" />
      <Hint keys={['Space']} label="jump" />
    </div>
  )
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {keys.map((k) => (
        <kbd key={k} className="min-w-[26px] h-[26px] px-1.5 flex items-center justify-center rounded-md bg-white text-[0.7rem] font-black text-navy shadow-sm border border-navy/10">
          {k}
        </kbd>
      ))}
      <span className="text-[0.7rem] font-semibold text-navy/55 ml-0.5">{label}</span>
    </div>
  )
}
