import {
  getSheetsClient,
  getSheetId,
  TAB_ALL_WORK,
} from '../../../lib/googleSheets'

const VALID_COMPANIES = ['codeupscale', 'ridgetheory']

async function loadKnowledgeForCompany(sheets, company) {
  const sheetId = getSheetId(company)
  if (!sheetId) return []

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB_ALL_WORK}!A:I`,
  })

  const rows = response.data.values || []
  return rows
    .slice(1)
    .filter(row => row[0] && String(row[0]).trim())
    .map(row => ({
      companyName: row[0] || '',
      scopeOfServices: row[1] || '',
      projectName: row[2] || '',
      industry: row[3] || '',
      techStack: row[4] || '',
      projectSummary: row[5] || '',
      link: row[6] || '',
      workedUnderPrime: row[7] || '',
      owner: row[8] || '',
      portfolioSource: company,
    }))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ knowledge: [] })
  }

  try {
    const { company } = req.query
    const sheets = getSheetsClient()

    if (company === 'all') {
      const [codeupscale, ridgetheory] = await Promise.all([
        loadKnowledgeForCompany(sheets, 'codeupscale'),
        loadKnowledgeForCompany(sheets, 'ridgetheory'),
      ])
      const knowledge = [...codeupscale, ...ridgetheory]
      return res.status(200).json({ knowledge, total: knowledge.length })
    }

    if (!company || !VALID_COMPANIES.includes(company)) {
      return res.status(200).json({ knowledge: [] })
    }

    const knowledge = await loadKnowledgeForCompany(sheets, company)
    return res.status(200).json({ knowledge, total: knowledge.length })
  } catch (err) {
    console.error('Sheets knowledge error:', err)
    return res.status(200).json({ knowledge: [], error: err.message })
  }
}
