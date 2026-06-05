const SPEAKER_COLORS = {
  A: { bg: 'bg-violet-100', text: 'text-violet-800', dot: 'bg-violet-500' },
  B: { bg: 'bg-sky-100',    text: 'text-sky-800',    dot: 'bg-sky-500' },
  C: { bg: 'bg-emerald-100',text: 'text-emerald-800',dot: 'bg-emerald-500' },
  D: { bg: 'bg-rose-100',   text: 'text-rose-800',   dot: 'bg-rose-500' },
  E: { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
}

export function getSpeakerStyle(letter) {
  return SPEAKER_COLORS[letter] || SPEAKER_COLORS['A']
}

export function SpeakerLegend({ speakerMap, onRename }) {
  if (!speakerMap || Object.keys(speakerMap).length === 0) return null

  return (
    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
      <p className="text-xs text-slate-400 mb-1.5">Speakers detected — tap to rename</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(speakerMap).map(([letter, name]) => {
          const style = getSpeakerStyle(letter)
          return (
            <button
              key={letter}
              onClick={() => onRename(letter)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 ${style.bg} ${style.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
