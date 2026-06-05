import { useCallback } from 'react'

export function useAnalyze({ onChunk, onDone, onError, history }) {
  const analyze = useCallback(async (transcript) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, history }),
      })

      if (!response.ok) {
        const err = await response.json()
        onError(err.error || 'Request failed')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onDone()
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) onChunk(parsed.text)
              if (parsed.error) onError(parsed.error)
            } catch (_) {}
          }
        }
      }

      onDone()
    } catch (error) {
      onError(error.message)
    }
  }, [history, onChunk, onDone, onError])

  return { analyze }
}
