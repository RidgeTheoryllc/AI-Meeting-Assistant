import { useState, useRef, useCallback, useEffect } from 'react'

export function useSpeechRecognition({ onTranscript, silenceDelay = 2500 }) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const accumulatedRef = useRef('')
  const isListeningRef = useRef(false)

  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => {
      const text = accumulatedRef.current.trim()
      if (text) {
        onTranscript(text)
        accumulatedRef.current = ''
        setInterimText('')
      }
    }, silenceDelay)
  }, [silenceDelay, onTranscript, clearSilenceTimer])

  const start = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser. Please use Chrome.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript + ' '
        } else {
          interim += transcript
        }
      }

      if (finalText) {
        accumulatedRef.current += finalText
        startSilenceTimer()
      }

      setInterimText(accumulatedRef.current + interim)
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return
      if (event.error === 'aborted') return
      setError(`Mic error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch (e) {
          setIsListening(false)
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [startSilenceTimer])

  const stop = useCallback(() => {
    setIsListening(false)
    clearSilenceTimer()

    const text = accumulatedRef.current.trim()
    if (text) {
      onTranscript(text)
      accumulatedRef.current = ''
      setInterimText('')
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }, [clearSilenceTimer, onTranscript])

  return { isListening, interimText, error, start, stop }
}
