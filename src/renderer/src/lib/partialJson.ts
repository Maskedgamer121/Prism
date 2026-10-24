/**
 * Best-effort parse of a JSON object that is still being streamed, e.g. `{"path":"a.py","content":"print(`.
 * Closes any open string, array and object so the fields written so far can be shown live.
 */
export function parsePartialJson(raw: string): Record<string, unknown> | undefined {
  let text = raw.trimStart()
  if (!text.startsWith('{')) return undefined
  // A trailing partial escape (`\` or `\u12`) can't be closed, so drop it.
  text = text.replace(/\\(u[0-9a-fA-F]{0,3})?$/, '')
  for (let attempt = 0; attempt < 3; attempt++) {
    const closed = close(text)
    try {
      const value = JSON.parse(closed) as unknown
      return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
    } catch {
      // Usually a dangling key (`{"a":1,"pa`) or separator; cut back to the last complete value.
      const cut = Math.max(text.lastIndexOf(','), text.lastIndexOf('{') + 1)
      if (cut <= 0) return undefined
      text = text.slice(0, cut)
    }
  }
  return undefined
}

function close(text: string): string {
  const stack: string[] = []
  let inString = false
  let escaped = false
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  let out = inString ? text + '"' : text
  out = out.replace(/[\s,:]+$/, '')
  return out + stack.reverse().join('')
}
