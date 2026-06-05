import { AssemblyAI } from 'assemblyai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not set' })

  try {
    const client = new AssemblyAI({ apiKey: apiKey.trim() })
    const token = await client.streaming.createTemporaryToken({
      expires_in_seconds: 300,
      max_session_duration_seconds: 3600,
    })

    return res.status(200).json({ token })
  } catch (err) {
    console.error('AssemblyAI token error:', err)
    return res.status(500).json({ error: 'Could not create AssemblyAI streaming token' })
  }
}
