const FLUFF_OPENER_PATTERN = /^To (enhance|address|automate|streamline|implement|create|build|tackle|solve|reduce|improve|help|ensure|provide|develop|integrate|offer|deliver|eliminate|mitigate|optimize)[^,]*,\s*/i

const INVENTED_PRICE_PATTERN = /\$[\d,]+(?:\s*[-–—to]+\s*\$[\d,]+)?(?:\s*(?:per month|\/month|monthly|a month))?/gi

function capitalizeFirst(text) {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function sanitizeSayThisNext(sayText) {
  let text = sayText.trim()
  if (!text) return sayText

  let guard = 0
  while (guard < 5) {
    guard++
    const before = text
    text = text.replace(FLUFF_OPENER_PATTERN, '')
    text = text.replace(/^We (can|recommend|suggest|would)\s+/i, '')
    text = text.replace(/^(Absolutely|Great question|That makes sense)[,.!]?\s*/i, '')
    if (text === before) break
  }

  return capitalizeFirst(text.trim()) || sayText
}

export function stripInventedPricing(text, { allowPricing = false } = {}) {
  if (allowPricing || !text) return text
  return text.replace(INVENTED_PRICE_PATTERN, 'a written estimate after we confirm scope')
}

export function sanitizeCoachingResponse(text, options = {}) {
  if (!text) return text

  const sayMatch = text.match(/(\*\*Say this next:\*\*\s*)([\s\S]*?)(?=\n\*\*Quick context:\*\*|\n\*\*Follow-up:\*\*|$)/i)
  if (!sayMatch) {
    return stripInventedPricing(text, options)
  }

  const [, label, sayBody] = sayMatch
  const sanitizedSay = stripInventedPricing(sanitizeSayThisNext(sayBody), options)
  const rest = text.slice(sayMatch.index + sayMatch[0].length)

  return `${label}${sanitizedSay}${rest}`
}

export function detectClientIntent(utterances = [], speakerMap = {}) {
  const clientText = utterances
    .filter(u => {
      const label = (u.speaker || '').toLowerCase()
      return u.speaker === 'Client' || label === 'client'
    })
    .map(u => u.text || '')
    .join(' ')
    .toLowerCase()

  if (!clientText) return { askingPrice: false, askingFullSystem: false }

  return {
    askingPrice: /\b(price|pricing|cost|budget|quote|estimate|numbers?|how much|expense|expenses|fee|fees|\$)\b/.test(clientText),
    askingFullSystem: /\b(all details|whole system|full system|entire system|what (will|would) (you |we )?build|complete (solution|system|platform)|walk me through|overview of|everything (you|we)('ll| will))\b/.test(clientText),
  }
}

export function buildIntentGuidance(intent) {
  const lines = []

  if (intent.askingFullSystem) {
    lines.push(`**Client is asking for the full system picture.** In "Say this next", give a tight bullet-style spoken summary (4-6 concrete modules) of ONE unified platform already discussed in this meeting — intake, scheduling, uploads, processing, reporting, dashboard, integrations. Do not pitch a new unrelated tool.`)
  }

  if (intent.askingPrice) {
    lines.push(`**Client is asking about pricing.** NEVER invent dollar amounts, ranges, or monthly fees. Coach Boss to: (1) acknowledge the ask directly, (2) recap scope in plain terms, (3) promise a written proposal within 24-48 hours, (4) ask one scoping question (priority feature or budget range). No fake numbers.`)
  }

  return lines.length ? `\n\nIntent for this moment:\n${lines.join('\n')}` : ''
}
