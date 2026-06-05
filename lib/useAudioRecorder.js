import { useState, useRef, useCallback, useEffect } from 'react'

const SILENCE_THRESHOLD = 0.01   // amplitude below this = silence
const SILENCE_DURATION  = 2000   // ms of silence before finishing a segment
const MIN_RECORD_MS     = 1500   // don't cut off clips shorter than this
const MAX_SEGMENT_MS    = 30000  // send long speaking turns in chunks
const MAX_IDLE_MS       = 15000  // reset silent buffers so they do not grow forever

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useAudioRecorder({ onAudioReady }) {
  const [isRecording, setIsRecording]     = useState(false)
  const [error, setError]                 = useState(null)
  const [volume, setVolume]               = useState(0)

  const mediaRecorderRef  = useRef(null)
  const chunksRef         = useRef([])
  const streamRef         = useRef(null)
  const audioCtxRef       = useRef(null)
  const analyserRef       = useRef(null)
  const silenceTimerRef   = useRef(null)
  const startTimeRef      = useRef(null)
  const rafRef            = useRef(null)
  const mimeTypeRef       = useRef(null)
  const isListeningRef    = useRef(false)
  const hasVoiceRef       = useRef(false)
  const processSegmentRef = useRef(false)
  const monitorRef        = useRef(null)

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
  }, [])

  const cleanupMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  const stopSegment = useCallback((processSegment) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    clearSilenceTimer()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    processSegmentRef.current = processSegment && hasVoiceRef.current
    mediaRecorderRef.current.stop()
  }, [clearSilenceTimer])

  const startSegment = useCallback(() => {
    if (!streamRef.current || !mimeTypeRef.current || !isListeningRef.current) return

    const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current })
    chunksRef.current = []
    hasVoiceRef.current = false
    processSegmentRef.current = false
    startTimeRef.current = Date.now()

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    recorder.onstop = async () => {
      const chunks = chunksRef.current
      const shouldProcess = processSegmentRef.current && chunks.length > 0
      const mimeType = mimeTypeRef.current
      chunksRef.current = []
      mediaRecorderRef.current = null

      if (isListeningRef.current) {
        startSegment()
      } else {
        setIsRecording(false)
        setVolume(0)
        cleanupMedia()
      }

      if (!shouldProcess) return

      try {
        const blob = new Blob(chunks, { type: mimeType })
        const base64 = await blobToBase64(blob)
        onAudioReady({ base64, mimeType, blob })
      } catch (err) {
        setError('Could not process recorded audio.')
      }
    }

    recorder.start(250)
    mediaRecorderRef.current = recorder
    rafRef.current = requestAnimationFrame(monitorRef.current)
  }, [cleanupMedia, onAudioReady])

  useEffect(() => {
    monitorRef.current = () => {
      if (!analyserRef.current || !isListeningRef.current) return

      const data = new Uint8Array(analyserRef.current.fftSize)
      analyserRef.current.getByteTimeDomainData(data)

      // RMS amplitude
      const rms = Math.sqrt(data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / data.length)
      setVolume(Math.min(1, rms * 8))

      const elapsed = Date.now() - (startTimeRef.current || Date.now())
      if (rms >= SILENCE_THRESHOLD) {
        hasVoiceRef.current = true
        clearSilenceTimer()
      }

      if (hasVoiceRef.current && elapsed > MAX_SEGMENT_MS) {
        stopSegment(true)
        return
      }

      if (hasVoiceRef.current && rms < SILENCE_THRESHOLD && elapsed > MIN_RECORD_MS) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => stopSegment(true), SILENCE_DURATION)
        }
      } else if (!hasVoiceRef.current && elapsed > MAX_IDLE_MS) {
        stopSegment(false)
        return
      }

      rafRef.current = requestAnimationFrame(monitorRef.current)
    }
  }, [clearSilenceTimer, stopSegment])

  const start = useCallback(async () => {
    if (isListeningRef.current) return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      isListeningRef.current = true

      // Set up analyser for silence detection
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source   = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser

      // Prefer webm/opus for broad support; fall back gracefully
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'
      mimeTypeRef.current = mimeType
      setIsRecording(true)
      startSegment()

    } catch (err) {
      isListeningRef.current = false
      cleanupMedia()
      setError('Microphone access denied. Please allow mic permission.')
    }
  }, [cleanupMedia, startSegment])

  const stop = useCallback(() => {
    isListeningRef.current = false
    clearSilenceTimer()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      stopSegment(hasVoiceRef.current)
      return
    }
    setIsRecording(false)
    setVolume(0)
    cleanupMedia()
  }, [cleanupMedia, clearSilenceTimer, stopSegment])

  // Cleanup on unmount
  useEffect(() => () => {
    isListeningRef.current = false
    clearSilenceTimer()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      processSegmentRef.current = false
      mediaRecorderRef.current.stop()
    }
    cleanupMedia()
  }, [cleanupMedia, clearSilenceTimer])

  return { isRecording, volume, error, start, stop }
}
