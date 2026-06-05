export function MicButton({ isRecording, isProcessing, onClick, volume = 0 }) {
  const scale = isRecording ? 1 + volume * 0.3 : 1
  return (
    <button
      onClick={onClick}
      disabled={!isRecording && isProcessing}
      className={`
        relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150
        ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200'
          : isProcessing ? 'bg-slate-400 cursor-wait'
          : 'bg-slate-800 hover:bg-slate-700 shadow-md'}
        ${!isProcessing ? 'active:scale-95 cursor-pointer' : ''}
      `}
      title={isRecording ? 'Stop listening' : isProcessing ? 'Processing…' : 'Start listening'}
    >
      {isRecording && (
        <span
          className="absolute inset-0 rounded-full bg-red-400 opacity-50 transition-transform duration-75"
          style={{ transform: `scale(${scale})` }}
        />
      )}
      {isProcessing ? (
        <svg className="animate-spin relative z-10" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : isRecording ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="white" className="relative z-10">
          <rect x="3" y="3" width="4" height="10" rx="1"/>
          <rect x="9" y="3" width="4" height="10" rx="1"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="relative z-10">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
        </svg>
      )}
    </button>
  )
}
