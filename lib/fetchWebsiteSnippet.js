const MAX_SNIPPET_CHARS = 2500

function stripHtml(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchWebsiteSnippet(url) {
  if (!url || typeof url !== 'string') return ''

  let parsed
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch (_) {
    return ''
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'MeetingCopilot/1.0 (sales prep)' },
    })
    clearTimeout(timeout)

    if (!res.ok) return ''

    const html = await res.text()
    return stripHtml(html).slice(0, MAX_SNIPPET_CHARS)
  } catch (_) {
    return ''
  }
}
