import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function normalizeUtterances(value) {
  if (!Array.isArray(value)) return []

  return value
    .map(item => ({
      speaker: String(item.speaker || '').trim().replace(/^Speaker\s+/i, '') || 'A',
      text: String(item.text || '').trim(),
    }))
    .filter(item => item.text)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No transcript text provided' })

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Split a raw meeting transcript into consecutive speaker turns.

Return JSON only:
{"utterances":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]}

Rules:
- Preserve the original wording as much as possible.
- Do not summarize or rewrite.
- Split only when the text clearly changes speaker, such as a direct reply, interruption, name address, disagreement, or conversational handoff.
- Use A, B, C labels consistently within this transcript.
- If there is no clear speaker change, return one utterance.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const utterances = normalizeUtterances(parsed.utterances)

    if (utterances.length === 0) {
      return res.status(200).json({ utterances: [{ speaker: 'A', text }] })
    }

    return res.status(200).json({ utterances })
  } catch (err) {
    console.error('Speaker split error:', err)
    return res.status(500).json({ error: 'Could not split speakers' })
  }
}
