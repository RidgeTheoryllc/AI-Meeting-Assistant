const SPEAKER_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-400' },
  { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-400'    },
  { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-400'   },
  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400'  },
  { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-400'   },
  { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700',border: 'border-fuchsia-200',dot: 'bg-fuchsia-400'},
]

export function getSpeakerColor(speakerKey) {
  const idx = speakerKey.charCodeAt(0) % SPEAKER_COLORS.length
  return SPEAKER_COLORS[idx]
}

export function getSpeakerInitial(speaker) {
  if (speaker === 'You' || speaker === 'Boss') return 'Y'
  if (speaker === 'Client') return 'C'
  return speaker
}

export function SpeakerTag({ speaker, label }) {
  const colors = getSpeakerColor(speaker)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  )
}
