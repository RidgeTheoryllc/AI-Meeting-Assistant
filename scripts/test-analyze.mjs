/**
 * End-to-end smoke test for the meeting copilot coaching pipeline.
 *
 * It replays a scripted client conversation through the LIVE /api/analyze
 * endpoint (real model + the sanitizer/anti-repeat layer) and prints each
 * coaching response. History is carried between turns so cross-turn
 * anti-repeat is actually exercised.
 *
 * Prereqs:
 *   - `npm run dev` is running (uses OPENAI_API_KEY from .env.local)
 *   - Node 18+ (for global fetch / async-iterable streams)
 *
 * Run:
 *   node scripts/test-analyze.mjs
 *   BASE_URL=http://localhost:3001 node scripts/test-analyze.mjs   # custom port
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const COMPANY = 'codeupscale'

// Minimal fake knowledge so citation behavior is testable without Google Sheets.
// "Clinical Pathology" (healthcare) and "AFG Truck Force" (logistics) are the
// names to watch — they must NOT appear on technical (non-experience) turns.
const KNOWLEDGE = [
  {
    companyName: 'Clinical Pathology',
    scopeOfServices: 'Web Application',
    industry: 'Healthcare',
    techStack: 'Next.js, Node, Postgres, FHIR integration',
    projectName: 'Lab Requests Portal',
    projectSummary: 'Built a secure web application for managing a high volume of pathology requests and documents.',
  },
  {
    companyName: 'AFG Truck Force',
    scopeOfServices: 'Web Design, Web Application',
    industry: 'Logistics',
    techStack: 'Next.js, Tailwind, Stripe',
    projectName: 'Carrier Site + Driver Portal',
    projectSummary: 'Redesigned their marketing site and built a driver onboarding portal with document upload and ELD status sync.',
  },
  {
    companyName: 'Summit Lending',
    scopeOfServices: 'Software Development',
    industry: 'Finance',
    techStack: 'React, .NET, SQL Server, Azure Blob',
    projectName: 'Loan Doc Hub',
    projectSummary: 'Document hub that ingests loan packages, runs OCR field extraction, and flags missing or inconsistent documents.',
  },
]

const BRIEF = {
  clientCompany: 'Ridge Capital',
  clientWebsite: '',
  priorConversations:
    'Real-estate lending firm. Each deal bundles appraisals, budgets, title reports, entity docs, insurance certificates, draw requests, and borrower financials. They run an LOS/CRM servicing platform, an accounting system, SharePoint, and document storage. Exploring a website update plus a document-heavy deal platform.',
}

// Each turn is one thing the CLIENT says — mirrors the live meeting that regressed.
// The "expect" note is for you, the reader — it is not sent to the API.
const SCRIPT = [
  {
    text: "Oh, we also need our website updated. Do you have experience building websites for similar types of companies to ours?",
    expect: 'EXPERIENCE question → citation allowed (Summit Lending is closest). Should NOT cite healthcare/logistics if a finance match exists.',
  },
  {
    text: "Our portfolio contains millions of documents, so how would your architecture scale?",
    expect: 'TECHNICAL → architecture answer (S3/object storage, Postgres index, CDN, cache). NO past-client name.',
  },
  {
    text: "Our deals contain appraisals, title reports, insurance certificates, and borrower financials. Can your platform identify inconsistencies between documents automatically?",
    expect: 'TECHNICAL → OCR + rules engine cross-check. NO "can be tailored to...". NO past-client name.',
  },
  {
    text: "We already have an LOS, an accounting system, SharePoint, and document storage. How would your platform integrate without disrupting existing workflows?",
    expect: 'TECHNICAL → REST APIs + webhooks into LOS/accounting/SharePoint. NO "is designed with integration in mind". NO name-drop.',
  },
]

function speakerLabel(u) {
  if (u.speaker === 'You' || u.speaker === 'Boss') return 'You'
  if (u.speaker === 'Client') return 'Client'
  return `Speaker ${u.speaker}`
}

function transcriptLine(u) {
  return `${speakerLabel(u)}: "${u.text}"`
}

async function streamAnalyze(payload) {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (res.status === 204) return '(no client speech detected — skipped)'
  if (!res.ok) {
    let detail = ''
    try { detail = JSON.stringify(await res.json()) } catch (_) {}
    throw new Error(`HTTP ${res.status} ${detail}`)
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return accumulated
      try {
        const parsed = JSON.parse(data)
        if (parsed.replace) accumulated = parsed.replace
        else if (parsed.text) accumulated += parsed.text
        else if (parsed.error) throw new Error(parsed.error)
      } catch (_) {}
    }
  }
  return accumulated
}

async function main() {
  console.log(`\n=== Coaching pipeline smoke test → ${BASE_URL}/api/analyze ===`)
  console.log(`Company: ${COMPANY} | Prospect: ${BRIEF.clientCompany}\n`)

  const history = []
  const fullMeeting = []

  for (let i = 0; i < SCRIPT.length; i++) {
    const { text, expect } = SCRIPT[i]
    const utterances = [{ speaker: 'Client', text }]
    fullMeeting.push(...utterances)

    console.log('────────────────────────────────────────────────────────')
    console.log(`TURN ${i + 1}`)
    console.log(`CLIENT: ${text}`)
    console.log(`(expect) ${expect}\n`)

    let coaching
    try {
      coaching = await streamAnalyze({
        utterances,
        meetingTranscriptFromStart: fullMeeting,
        history,
        speakerMap: {},
        knowledge: KNOWLEDGE,
        brief: BRIEF,
        company: COMPANY,
      })
    } catch (err) {
      console.error(`!! Request failed: ${err.message}`)
      console.error('   Is `npm run dev` running on the right port? Set BASE_URL if not 3000.')
      process.exit(1)
    }

    console.log('COPILOT:')
    console.log(coaching.trim() || '(empty response)')
    console.log('')

    history.push({ role: 'user', content: utterances.map(transcriptLine).join('\n') })
    history.push({ role: 'assistant', content: coaching })
  }

  console.log('────────────────────────────────────────────────────────')
  console.log('Done. Check that:')
  console.log('  • Turn 1 (experience) may cite ONE relevant client (Summit Lending).')
  console.log('  • Turns 2-4 are TECHNICAL (storage/OCR/APIs) and name NO past client.')
  console.log('  • No "can be tailored to...", "is designed with integration in mind", or "ensuring...".')
  console.log('  • Every response uses: Say this next / What they\'re asking / Good to know / Follow-up.\n')
}

main()
