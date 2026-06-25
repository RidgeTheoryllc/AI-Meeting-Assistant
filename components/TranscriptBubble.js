import { SpeakerTag, getSpeakerColor, getSpeakerInitial } from './SpeakerTag'

export function getDefaultSpeakerLabel(speaker) {
  if (speaker === 'You' || speaker === 'Boss') return 'You'
  if (speaker === 'Client') return speaker
  return `Speaker ${speaker}`
}

export function TranscriptBubble({ utterances, speakerMap }) {
  if (!utterances || utterances.length === 0) return null
  return (
    <div className="space-y-2 animate-slide-up">
      {utterances.map((u, i) => {
        const label = speakerMap?.[u.speaker] || getDefaultSpeakerLabel(u.speaker)
        const colors = getSpeakerColor(u.speaker)
        return (
          <div key={i} className="flex gap-2 items-start">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
              {getSpeakerInitial(u.speaker)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <SpeakerTag speaker={u.speaker} label={label} />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{u.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
