import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function getSpeakerLabel(speaker, speakerMap) {
  if (speakerMap?.[speaker]) return speakerMap[speaker]
  if (speaker === 'Boss' || speaker === 'Client') return speaker
  return `Speaker ${speaker}`
}

function buildMissionBrief(brief) {
  if (!brief) return ''

  const lines = [
    brief.clientName && `Client name: ${brief.clientName}`,
    brief.company && `Company: ${brief.company}`,
    brief.meetingAbout && `Meeting about: ${brief.meetingAbout}`,
    brief.background && `Background: ${brief.background}`,
  ].filter(Boolean)

  return lines.length ? `\n\nMission brief:\n${lines.join('\n')}` : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { utterances, history, speakerMap, missionBrief } = req.body
  if (!utterances || utterances.length === 0) return res.status(400).json({ error: 'No utterances' })
  if (!utterances.some(u => u.speaker === 'Client')) {
    return res.status(204).end()
  }

  // Build readable transcript from labeled utterances
  const transcriptText = utterances
    .map(u => {
      const label = getSpeakerLabel(u.speaker, speakerMap)
      return `${label}: "${u.text}"`
    })
    .join('\n')

  const systemPrompt = `You are a silent real-time meeting coach. Your boss is in a virtual meeting with clients, leads, callers, or teammates. You receive labeled transcripts identifying who said what. "Boss" is your boss's microphone. "Client" is the meeting/tab audio from the other side of the call.

Your job is to coach your boss on exactly what to say next so they sound confident, informed, and natural even when they do not know the topic deeply.

Use the mission brief as private context when it is provided. Do not quote it mechanically; weave it into advice only when it helps the boss sound more specific and prepared.

Do not lead with a summary like "What's happening". The transcript is already visible. Lead with useful words your boss can say out loud.

Provide your response in these clearly labeled sections:

**Say this next:** [2-4 natural sentences your boss can say out loud right now. Make it conversational, confident, and specific to the latest exchange.]

**Why it works:** [One short sentence explaining the strategy behind the response.]

**Quick context:** [Only if needed, explain terms, jargon, or facts your boss may not know in plain English.]

**Follow-up:** [Only if useful, one concrete question or next step your boss can ask.]

Keep everything concise and ready to speak. Avoid long explanations, recaps, and generic advice.${buildMissionBrief(missionBrief)}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    {
      role: 'user',
      content: `Latest exchange:\n${transcriptText}\n\nCoach my boss on what to say next. Prioritize spoken response over summary.`
    }
  ]

  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.4,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('OpenAI error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed', details: error.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
      res.end()
    }
  }
}
