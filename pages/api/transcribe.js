// Receives base64 audio, sends to AssemblyAI with speaker diarization
// Returns labeled transcript: [{speaker: "A", text: "..."}]

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { audioBase64, mimeType = 'audio/webm' } = req.body
  if (!audioBase64) return res.status(400).json({ error: 'No audio provided' })

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not set' })

  try {
    // 1. Upload audio to AssemblyAI
    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: apiKey.trim(),
        'content-type': mimeType || 'application/octet-stream',
      },
      body: audioBuffer,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      return res.status(500).json({ error: 'Upload failed', details: err })
    }

    const { upload_url } = await uploadRes.json()

    // 2. Request transcription with speaker diarization
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: apiKey.trim(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true,
        speakers_expected: null, // auto-detect number of speakers
      }),
    })

    if (!transcriptRes.ok) {
      const err = await transcriptRes.text()
      return res.status(500).json({ error: 'Transcript request failed', details: err })
    }

    const { id: transcriptId } = await transcriptRes.json()

    // 3. Poll until complete (Vercel functions timeout: 60s max on hobby, 300s on pro)
    const maxAttempts = 55
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 1000))

      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: apiKey.trim() },
      })

      const data = await pollRes.json()

      if (data.status === 'completed') {
        // Build speaker-labeled utterances
        const utterances = (data.utterances || []).map(u => ({
          speaker: u.speaker, // "A", "B", "C" etc.
          text: u.text,
          start: u.start,
          end: u.end,
        }))

        // Fallback: if no utterances but we have text
        if (utterances.length === 0 && data.text) {
          utterances.push({ speaker: 'A', text: data.text })
        }

        return res.status(200).json({ utterances, fullText: data.text })
      }

      if (data.status === 'error') {
        return res.status(500).json({ error: 'Transcription failed', details: data.error })
      }
    }

    return res.status(504).json({ error: 'Transcription timed out. Try a shorter segment.' })
  } catch (err) {
    console.error('Transcribe error:', err)
    return res.status(500).json({ error: err.message })
  }
}
