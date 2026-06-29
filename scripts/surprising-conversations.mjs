/**
 * Surprising / edge-case conversation scripts for the meeting copilot.
 *
 * Run one scenario:
 *   node scripts/surprising-conversations.mjs church-pivot
 *   node scripts/surprising-conversations.mjs ai-skeptic
 *   node scripts/surprising-conversations.mjs portfolio-trap
 *   node scripts/surprising-conversations.mjs budget-shock
 *   node scripts/surprising-conversations.mjs scope-creep
 *
 * List all:
 *   node scripts/surprising-conversations.mjs --list
 *
 * Prereqs: npm run dev + OPENAI_API_KEY in .env.local
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const COMPANY = 'codeupscale'

const KNOWLEDGE = [
  {
    companyName: 'St. Agnes Parish',
    scopeOfServices: 'Web Design',
    industry: 'Nonprofit',
    techStack: 'WordPress, Stripe donations',
    projectName: 'Parish Site',
    projectSummary: 'Redesigned a parish website with event calendar, online giving, and sermon archive.',
  },
  {
    companyName: 'GreenLeaf Compliance',
    scopeOfServices: 'Software Development',
    industry: 'Cannabis',
    techStack: 'React, Node, Postgres, Metrc API',
    projectName: 'Seed-to-Sale Tracker',
    projectSummary: 'Built a compliance dashboard syncing inventory with state Metrc APIs and audit logs.',
  },
  {
    companyName: 'Meridian Hospice',
    scopeOfServices: 'Web Application',
    industry: 'Healthcare',
    techStack: 'Next.js, FHIR, Azure',
    projectName: 'Caregiver Portal',
    projectSummary: 'HIPAA-aligned caregiver portal with visit scheduling and secure family messaging.',
  },
  {
    companyName: 'Vaultline Capital',
    scopeOfServices: 'Software Development',
    industry: 'Finance',
    techStack: 'React, .NET, SQL Server, Azure Blob',
    projectName: 'Loan Doc Hub',
    projectSummary: 'Document hub with OCR extraction and rules engine flagging inconsistent loan packages.',
  },
]

const SCENARIOS = {
  'church-pivot': {
    title: 'The Bait-and-Switch (church site → cannabis compliance)',
    brief: {
      clientCompany: 'Harvest Path LLC',
      clientWebsite: '',
      priorConversations: 'Inbound lead said they need a "community website with events and donations." No industry flagged in CRM.',
    },
    turns: [
      {
        speaker: 'Client',
        text: "We need a clean website — events, sermons, online giving. Nothing fancy. Can you do that?",
        note: 'Sounds like a church/nonprofit. Should NOT assume cannabis yet.',
      },
      {
        speaker: 'Client',
        text: "Actually — full transparency — we're a licensed cultivator. The 'community' site is public-facing. The real build is Metrc sync, batch tracking, and state audit exports. Have you touched that?",
        note: 'PIVOT. Experience question → GreenLeaf Compliance is the right cite, NOT St. Agnes Parish.',
      },
      {
        speaker: 'Client',
        text: "If Metrc goes down mid-harvest, what happens to our inventory counts? We can't have drift.",
        note: 'TECHNICAL. Queue + idempotent sync + reconciliation — NO parish/church example.',
      },
    ],
  },

  'ai-skeptic': {
    title: 'The "We Already Built It in ChatGPT" Client',
    brief: {
      clientCompany: 'Northwind Property Group',
      clientWebsite: '',
      priorConversations: 'VP Ops built a prototype in Retool + ChatGPT API for tenant maintenance tickets. Wants to know why they need an agency.',
    },
    turns: [
      {
        speaker: 'Client',
        text: "Honestly we already wired ChatGPT into Retool. Tenants submit tickets, AI triages them. Why would we pay you to rebuild what we have?",
        note: 'Should NOT be defensive fluff. Concrete gaps: auth, SLA, audit trail, PII handling, production hardening.',
      },
      {
        speaker: 'Client',
        text: "Fine — but can you plug into our existing Retool app instead of replacing it?",
        note: 'TECHNICAL integration answer. APIs/webhooks into Retool — not a portfolio story.',
      },
      {
        speaker: 'Client',
        text: "Our tenants upload photos of mold and water damage. Where does that data live, and who can see it?",
        note: 'Security/PII — S3 + signed URLs, RBAC, retention policy. NO random past client name.',
      },
    ],
  },

  'portfolio-trap': {
    title: 'The "Portfolio" Word Trap (investment portfolio, not agency portfolio)',
    brief: {
      clientCompany: 'Ridge Capital',
      clientWebsite: '',
      priorConversations: 'Real-estate lending. Each deal has appraisals, title, insurance, borrower financials. LOS + SharePoint + accounting.',
    },
    turns: [
      {
        speaker: 'Client',
        text: "Our investment portfolio spans twelve asset classes and millions of documents. How would your architecture scale?",
        note: 'Must NOT trigger portfolioObjection. Must NOT name-drop a past client — this is architecture.',
      },
      {
        speaker: 'Client',
        text: "We need inconsistency detection — appraisal says $2.1M but the budget line says $1.8M. Can you catch that automatically?",
        note: 'OCR + rules engine. No "can be tailored to."',
      },
      {
        speaker: 'Client',
        text: "I looked at your website portfolio and didn't see anything like our deal flow. Convince me.",
        note: 'NOW portfolioObjection is valid. Should cite Vaultline Capital / finance work.',
      },
    ],
  },

  'budget-shock': {
    title: 'The $8k Budget for an $80k Scope',
    brief: {
      clientCompany: 'Brightline Dental',
      clientWebsite: '',
      priorConversations: 'Multi-location dental group wants patient portal, online booking, insurance verification, and a marketing site refresh.',
    },
    turns: [
      {
        speaker: 'Client',
        text: "We need online booking, insurance eligibility checks, and a new marketing site. Our board capped us at eight thousand dollars total. Can you do it?",
        note: 'Price turn. Should state realistic range from sheet tier OR map a honest phase-one slice to $8k — not pretend full scope fits.',
      },
      {
        speaker: 'Client',
        text: "What would we actually get for eight thousand? Be specific — modules, not vibes.",
        note: 'Concrete phase-one module list. No "phased approach reduces risk" fluff.',
      },
      {
        speaker: 'Client',
        text: "Our last vendor promised the moon for cheap and ghosted us. How do I know you won't?",
        note: 'Trust turn. Milestones + SOW language. Should NOT repeat price unless asked.',
      },
    ],
  },

  'ai-training-only': {
    title: 'AI training data question (must NOT repeat OCR answer)',
    brief: {
      clientCompany: 'Summit Bridge Lending',
      clientWebsite: '',
      priorConversations: 'Real-estate lending. Appraisals, title, insurance, borrower financials.',
    },
    turns: [
      {
        speaker: 'Client',
        text: 'Would our data ever be used to train public AI models?',
        note: 'Zero retention / no public training — NOT OCR rules engine.',
      },
    ],
  },

  'integration-only': {
    title: 'Standalone integration question (must NOT repeat OCR/inconsistency answer)',
    brief: {
      clientCompany: 'Summit Bridge Lending',
      clientWebsite: '',
      priorConversations: 'Real-estate lending. LOS, CRM, SharePoint, accounting.',
    },
    turns: [
      {
        speaker: 'Client',
        text: 'We already have an LOS, CRM, servicing platform, accounting system, SharePoint, and document storage. How would your platform integrate without disrupting existing workflows?',
        note: 'REST/webhooks integration — NOT OCR rules engine from prior turns.',
      },
    ],
  },

  'inconsistency-only': {
    title: 'Standalone inconsistency question (must NOT cite freight/trucking portfolio)',
    brief: {
      clientCompany: 'Summit Bridge Lending',
      clientWebsite: '',
      priorConversations: 'Real-estate lending. Appraisals, title, insurance, borrower financials.',
    },
    turns: [
      {
        speaker: 'Client',
        text: 'Can your platform identify inconsistencies between documents automatically?',
        note: 'TECHNICAL ONLY — OCR + rules engine. No freight/Microsoft Stack. What they are asking must match inconsistency detection.',
      },
    ],
  },

  'lending-full': {
    title: 'Full lending call — tech turns must stay technical, experience cites Vaultline only',
    brief: {
      clientCompany: 'Summit Bridge Lending',
      clientWebsite: '',
      priorConversations: 'Real-estate lending. Appraisals, title, insurance, borrower financials. LOS + SharePoint + accounting.',
    },
    turns: [
      {
        speaker: 'Client',
        text: 'Have you worked on construction lending, bridge lending, DSCR, fix-and-flip, or commercial real estate lending? If so, can you go into detail on each of these?',
        note: 'Vaultline only — never CEA Grain / Varicent / raw spreadsheet text.',
      },
      {
        speaker: 'Client',
        text: 'Can your platform identify inconsistencies between documents automatically?',
        note: 'TECHNICAL — OCR + rules engine. No portfolio names.',
      },
      {
        speaker: 'Client',
        text: 'We already have an LOS, CRM, servicing platform, accounting system, SharePoint, and document storage. How would your platform integrate without disrupting existing workflows?',
        note: 'TECHNICAL — REST/webhooks integration. NOT OCR fallback from earlier turns.',
      },
      {
        speaker: 'Client',
        text: 'Would our data ever be used to train public AI models?',
        note: 'Data privacy — zero retention / no training. NOT OCR rules engine repeat.',
      },
      {
        speaker: 'Client',
        text: 'Our portfolio contains millions of documents. How would your architecture scale?',
        note: 'Must NOT trigger portfolioObjection or experience cite — S3/Postgres/CDN answer.',
      },
      {
        speaker: 'Client',
        text: 'We also need our website updated, do you have experience building websites for similar types of companies to ours?',
        note: 'Experience turn — Vaultline or finance web row only.',
      },
    ],
  },

  'lending-experience': {
    title: 'Construction lending — experience + website (must cite Vaultline from sheet)',
    brief: {
      clientCompany: 'Summit Bridge Lending',
      clientWebsite: '',
      priorConversations: 'Real-estate lending. Each deal has appraisals, title, insurance, borrower financials. LOS + SharePoint + accounting.',
    },
    turns: [
      {
        speaker: 'Client',
        text: 'Have you worked on construction lending, bridge lending, DSCR, fix-and-flip, or commercial real estate lending? If so, can you go into detail on each of these?',
        note: 'Experience + detail turn. MUST name Vaultline Capital with scope from sheet — NOT generic "comparable builds".',
      },
      {
        speaker: 'Client',
        text: 'We also need our website updated, do you have experience building websites for similar types of companies to ours?',
        note: 'Later turn — full meeting has lending context. MUST still cite finance portfolio names.',
      },
    ],
  },

  'scope-creep': {
    title: 'The Scope Creep Avalanche (one platform, then everything)',
    brief: {
      clientCompany: 'AeroParts Midwest',
      clientWebsite: '',
      priorConversations: 'Regional aircraft parts distributor. Legacy ERP, Excel everywhere, wants a customer portal first.',
    },
    turns: [
      {
        speaker: 'Client',
        text: "Phase one is a customer portal — order status, invoices, RMA requests. That's it.",
        note: 'Should lock phase one tightly. No inventing IoT/blockchain yet.',
      },
      {
        speaker: 'Client',
        text: "Also we'd want barcode scanning on the warehouse floor, and maybe RFID on high-value rotors.",
        note: 'EXTEND same platform thread. Mobile + scanner APIs — still one evolving proposal.',
      },
      {
        speaker: 'Client',
        text: "Oh and our CEO asked if we could put order provenance on a blockchain for FAA audit. Is that realistic?",
        note: 'Honest technical answer — probably overkill vs signed audit log + immutable event store. No yes-man fluff.',
      },
      {
        speaker: 'Client',
        text: "Forget blockchain. Can you integrate with our 1990s AS/400 ERP that only speaks CSV over SFTP?",
        note: 'TECHNICAL — SFTP drop + parser + idempotent upsert. This is the kind of sharp answer the boss needs.',
      },
    ],
  },

  'midnight-rls': {
    title: 'The Security Ambush After Small Talk',
    brief: {
      clientCompany: 'Lumen Psychiatry',
      clientWebsite: '',
      priorConversations: 'Telehealth startup. Video visits + patient intake forms. No SOC 2 yet.',
    },
    turns: [
      {
        speaker: 'Client',
        text: "Quick one before we go deeper — our counsel says any vendor touching PHI needs a BAA and SOC 2 Type II before we share requirements. Where are you on that?",
        note: 'Compliance answer — BAA, HIPAA, SOC 2 roadmap/timeline. NOT a marketing website pitch.',
      },
      {
        speaker: 'Client',
        text: "If a therapist's session notes leak because of a misconfigured S3 bucket, who's liable — us or you?",
        note: 'Shared responsibility model, encryption at rest, bucket policies, least-privilege IAM. Teach the boss the terms.',
      },
      {
        speaker: 'Client',
        text: "Have you built anything in behavioral health before?",
        note: 'Experience turn ONLY now — Meridian Hospice is closest healthcare cite.',
      },
    ],
  },
}

function listScenarios() {
  console.log('\nSurprising conversation scenarios:\n')
  for (const [key, s] of Object.entries(SCENARIOS)) {
    console.log(`  ${key.padEnd(18)} ${s.title} (${s.turns.length} turns)`)
  }
  console.log('\nRun: node scripts/surprising-conversations.mjs <key>\n')
}

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

  if (res.status === 204) return '(skipped — no client speech)'
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

async function runScenario(key) {
  const scenario = SCENARIOS[key]
  if (!scenario) {
    console.error(`Unknown scenario: ${key}`)
    listScenarios()
    process.exit(1)
  }

  console.log(`\n=== ${scenario.title} ===`)
  console.log(`→ ${BASE_URL}/api/analyze\n`)

  const history = []
  const fullMeeting = []

  for (let i = 0; i < scenario.turns.length; i++) {
    const { speaker, text, note } = scenario.turns[i]
    const utterances = [{ speaker, text }]
    fullMeeting.push(...utterances)

    console.log('────────────────────────────────────────────────────────')
    console.log(`TURN ${i + 1} — ${speaker}`)
    console.log(`"${text}"`)
    if (note) console.log(`(watch for) ${note}`)
    console.log('')

    const coaching = await streamAnalyze({
      utterances,
      meetingTranscriptFromStart: fullMeeting,
      history,
      speakerMap: {},
      knowledge: KNOWLEDGE,
      brief: scenario.brief,
      company: COMPANY,
    })

    console.log(coaching.trim() || '(empty)')
    console.log('')

    history.push({ role: 'user', content: utterances.map(transcriptLine).join('\n') })
    history.push({ role: 'assistant', content: coaching })
  }
}

const arg = process.argv[2]
if (!arg || arg === '--list' || arg === '-h' || arg === '--help') {
  listScenarios()
  if (arg && arg !== '--list') process.exit(arg === '-h' || arg === '--help' ? 0 : 1)
} else {
  runScenario(arg).catch(err => {
    console.error(`\nFailed: ${err.message}`)
    console.error('Is `npm run dev` running?')
    process.exit(1)
  })
}
