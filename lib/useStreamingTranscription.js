import { useState, useRef, useCallback, useEffect } from 'react'
import { DualChannelCapture, StreamingTranscriber } from 'assemblyai/streaming'

const SAMPLE_RATE = 16000
const CHANNEL_LABELS = {
  mic: 'You',
  system: 'Client',
}

async function getStreamingToken() {
  const res = await fetch('/api/assemblyai-token', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not start live transcription')
  return data.token
}

function joinWords(words) {
  return words
    .map(word => word.text)
    .join(' ')
    .replace(/\s+([.,!?;:])/g, '$1')
}

function getWordChannel(word, eventChannel) {
  const channel = word.channel && word.channel !== 'unknown' ? word.channel : null
  if (channel) return CHANNEL_LABELS[channel]
  if (eventChannel) return CHANNEL_LABELS[eventChannel]
  return null
}

function smoothSpeakerRuns(words, eventChannel) {
  const fallbackSpeaker = CHANNEL_LABELS[eventChannel] || null
  const runs = []

  for (const word of words) {
    // Trust the per-word channel from dual-channel capture. When a word has no
    // channel, stay with the speaker we're already in (continuity) instead of
    // defaulting everyone to "Client" — that default was a major mislabel source.
    let speaker = getWordChannel(word, eventChannel)
    if (!speaker) {
      speaker = runs[runs.length - 1]?.speaker || fallbackSpeaker || 'Client'
    }

    const last = runs[runs.length - 1]
    if (last?.speaker === speaker) {
      last.words.push(word)
    } else {
      runs.push({ speaker, words: [word] })
    }
  }

  // Only fix genuine echo: a very short island (<=3 words) wedged between two
  // runs from the SAME speaker is mic/system bleed, not a real turn. Do NOT
  // relabel longer runs — those are real participant utterances.
  for (let i = 1; i < runs.length - 1; i++) {
    const prev = runs[i - 1]
    const current = runs[i]
    const next = runs[i + 1]

    if (current.words.length <= 3 && current.speaker !== prev.speaker && prev.speaker === next.speaker) {
      prev.words.push(...current.words, ...next.words)
      runs.splice(i, 2)
      i--
    }
  }

  return runs
}

function mergeRunsToUtterances(runs) {
  const utterances = []

  for (const run of runs) {
    const last = utterances[utterances.length - 1]
    const start = run.words[0]?.start
    const end = run.words[run.words.length - 1]?.end

    if (last?.speaker === run.speaker) {
      last.words.push(...run.words)
      last.end = end
    } else {
      utterances.push({ speaker: run.speaker, words: run.words, start, end })
    }
  }

  return utterances.map(({ speaker, words: segmentWords, start, end }) => ({
    speaker,
    text: joinWords(segmentWords),
    start,
    end,
  }))
}

function countWords(text = '') {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function collapseEchoFragments(utterances = []) {
  if (utterances.length <= 1) return utterances

  // Echo bleed shows up as a tiny fragment (<=3 words) sandwiched between two
  // runs from the same speaker. Only those get reassigned. We deliberately do
  // NOT collapse short turns into a "dominant" speaker — that erased real
  // participant replies and caused incorrect speaker identification.
  const maxIslandWords = 3
  let result = utterances.map(u => ({ ...u }))

  // Pass 1: short island (<=3 words) wedged between two runs from the same speaker.
  for (let pass = 0; pass < 3; pass++) {
    let changed = false
    for (let i = 1; i < result.length - 1; i++) {
      const prev = result[i - 1]
      const current = result[i]
      const next = result[i + 1]

      if (
        prev.speaker === next.speaker &&
        current.speaker !== prev.speaker &&
        countWords(current.text) <= maxIslandWords
      ) {
        current.speaker = prev.speaker
        changed = true
      }
    }

    result = mergeConsecutiveTextUtterances(result)

    if (!changed) break
  }

  // Pass 2: a tiny orphan (<=2 words) glued onto a much longer opposite-speaker
  // run is channel bleed at a turn edge (e.g. "Our" or "to ours?" leaking from
  // the other mic). Absorb it into the longer neighbor.
  for (let pass = 0; pass < 2; pass++) {
    let changed = false
    for (let i = 0; i < result.length; i++) {
      const current = result[i]
      const words = countWords(current.text)
      if (words > 2) continue

      const prev = result[i - 1]
      const next = result[i + 1]
      const prevLonger = prev && prev.speaker !== current.speaker && countWords(prev.text) >= words * 4
      const nextLonger = next && next.speaker !== current.speaker && countWords(next.text) >= words * 4

      if (prevLonger && (!nextLonger || countWords(prev.text) >= countWords(next.text))) {
        current.speaker = prev.speaker
        changed = true
      } else if (nextLonger) {
        current.speaker = next.speaker
        changed = true
      }
    }

    result = mergeConsecutiveTextUtterances(result)

    if (!changed) break
  }

  return result
}

function mergeConsecutiveTextUtterances(utterances = []) {
  const merged = []
  for (const utterance of utterances) {
    const text = utterance?.text?.trim()
    if (!text) continue
    const last = merged[merged.length - 1]
    if (last?.speaker === utterance.speaker) {
      last.text = `${last.text} ${text}`.replace(/\s+/g, ' ').trim()
      last.end = utterance.end ?? last.end
    } else {
      merged.push({ ...utterance, text })
    }
  }
  return merged
}

function eventToUtterances(event) {
  const words = event.words || []
  const hasWordChannels = words.some(word => word.channel && word.channel !== 'unknown')
  const eventChannel = event.channel && event.channel !== 'unknown' ? event.channel : null

  if (!hasWordChannels) {
    return [{
      speaker: CHANNEL_LABELS[eventChannel] || 'Client',
      text: event.transcript,
      start: words[0]?.start,
      end: words[words.length - 1]?.end,
    }]
  }

  const runs = smoothSpeakerRuns(words, eventChannel)
  const utterances = mergeRunsToUtterances(runs)
  return collapseEchoFragments(utterances)
}

export function useStreamingTranscription({ onTurn }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const [volume, setVolume] = useState(0)
  const [partialTranscript, setPartialTranscript] = useState([])
  const [setupStatus, setSetupStatus] = useState('')

  const micStreamRef = useRef(null)
  const systemStreamRef = useRef(null)
  const meterCtxRef = useRef(null)
  const transcriberRef = useRef(null)
  const captureRef = useRef(null)
  const finalizedTurnsRef = useRef(new Set())
  const isActiveRef = useRef(false)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)

  const cleanup = useCallback(async () => {
    isActiveRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null

    if (captureRef.current) {
      const capture = captureRef.current
      captureRef.current = null
      try {
        await capture.stop()
      } catch (_) {}
    }

    if (transcriberRef.current) {
      const transcriber = transcriberRef.current
      transcriberRef.current = null
      try {
        await transcriber.close(false)
      } catch (_) {}
    }

    if (meterCtxRef.current) {
      const ctx = meterCtxRef.current
      meterCtxRef.current = null
      try {
        await ctx.close()
      } catch (_) {}
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }

    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => track.stop())
      systemStreamRef.current = null
    }

    analyserRef.current = null
    finalizedTurnsRef.current.clear()
    setVolume(0)
    setPartialTranscript([])
    setSetupStatus('')
    setIsRecording(false)
  }, [])

  const monitorVolume = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current) return

    const data = new Uint8Array(analyserRef.current.fftSize)
    analyserRef.current.getByteTimeDomainData(data)
    const rms = Math.sqrt(data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / data.length)
    setVolume(Math.min(1, rms * 8))
    rafRef.current = requestAnimationFrame(monitorVolume)
  }, [])

  const start = useCallback(async () => {
    if (isActiveRef.current) return

    setError(null)
    setPartialTranscript([])
    setSetupStatus('Requesting microphone access...')

    try {
      const token = await getStreamingToken()
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      micStreamRef.current = micStream

      setSetupStatus('Share the meeting tab/window and enable audio...')
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      systemStreamRef.current = systemStream

      if (systemStream.getAudioTracks().length === 0) {
        systemStream.getTracks().forEach(track => track.stop())
        throw new Error('No meeting audio was shared. Select the meeting tab/window and enable Share audio.')
      }

      const transcriber = new StreamingTranscriber({
        token,
        sampleRate: SAMPLE_RATE,
        speechModel: 'u3-rt-pro',
        formatTurns: true,
        channels: [{ name: 'mic' }, { name: 'system' }],
        includePartialTurns: true,
        continuousPartials: true,
        minTurnSilence: 1800,
        maxTurnSilence: 3500,
      })

      transcriber.on('turn', event => {
        if (!event.transcript) return

        if (!event.end_of_turn) {
          setPartialTranscript(eventToUtterances(event))
          return
        }

        if (!event.end_of_turn || finalizedTurnsRef.current.has(event.turn_order)) return
        finalizedTurnsRef.current.add(event.turn_order)
        setPartialTranscript([])
        onTurn(eventToUtterances(event))
      })

      transcriber.on('error', err => {
        setError(err.message || 'Live transcription failed')
      })

      transcriber.on('close', (code, reason) => {
        if (isActiveRef.current && code !== 1000) {
          setError(reason || 'Live transcription closed')
        }
      })

      await transcriber.connect()

      const capture = new DualChannelCapture({
        micStream,
        systemStream,
        transcriber,
        targetSampleRate: SAMPLE_RATE,
      })

      capture.on('error', err => {
        setError(err.message || 'Audio capture failed')
      })

      await capture.start()

      const meterCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = meterCtx.createMediaStreamSource(micStream)
      const analyser = meterCtx.createAnalyser()
      source.connect(analyser)

      meterCtxRef.current = meterCtx
      transcriberRef.current = transcriber
      captureRef.current = capture
      analyserRef.current = analyser
      isActiveRef.current = true
      setSetupStatus('')
      setIsRecording(true)
      rafRef.current = requestAnimationFrame(monitorVolume)
    } catch (err) {
      setError(err.message || 'Could not start live transcription')
      await cleanup()
    }
  }, [cleanup, monitorVolume, onTurn])

  const stop = useCallback(async () => {
    await cleanup()
  }, [cleanup])

  useEffect(() => () => {
    cleanup()
  }, [cleanup])

  return { isRecording, volume, error, partialTranscript, setupStatus, start, stop }
}
