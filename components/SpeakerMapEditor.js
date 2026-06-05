import { getSpeakerColor, getSpeakerInitial } from './SpeakerTag'
import { getDefaultSpeakerLabel } from './TranscriptBubble'

export function SpeakerMapEditor({ speakers, speakerMap, onChange }) {
  if (!speakers || speakers.length === 0) return null

  return (
    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
      <p className="text-xs font-medium text-slate-500 mb-2">Name the speakers (optional)</p>
      <div className="space-y-1.5">
        {speakers.map(speaker => {
          const colors = getSpeakerColor(speaker)
          return (
            <div key={speaker} className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colors.bg} ${colors.text}`}>
                {getSpeakerInitial(speaker)}
              </span>
              <input
                type="text"
                value={speakerMap[speaker] || ''}
                onChange={e => onChange(speaker, e.target.value)}
                placeholder={getDefaultSpeakerLabel(speaker)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-slate-400 bg-white"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
