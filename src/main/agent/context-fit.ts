import type { NMessage, NPart } from './types'

/**
 * Local models have a fixed context window (Ollama's num_ctx). Sending a long agent
 * conversation whole makes Ollama run out of room mid-reply, usually while the model is
 * writing a file. Before each request we fit the history into the window:
 *   1. shorten old tool results and the file contents of old tool calls,
 *   2. if that's not enough, drop the oldest turns (keeping the first request).
 * The agent's own history is never modified; this returns a trimmed copy.
 */

/** Rough token count, on the safe side: code, JSON and Lua measured ~2.5–3 characters per token in Ollama. */
const tokens = (s: string): number => Math.ceil(s.length / 2.5)

function partTokens(p: NPart): number {
  if (p.type === 'text') return tokens(p.text)
  if (p.type === 'tool_result') return tokens(p.content) + 8
  return tokens(JSON.stringify(p.input ?? {})) + 12
}

const msgTokens = (m: NMessage): number => m.parts.reduce((n, p) => n + partTokens(p), 4)

const KEEP_RECENT = 4
const TRIM_TO = 400

function shortenPart(p: NPart): NPart {
  if (p.type === 'tool_result' && p.content.length > TRIM_TO * 2) {
    return { ...p, content: `${p.content.slice(0, TRIM_TO)}\n… [${p.content.length - TRIM_TO} more characters trimmed to fit the context window — run the tool again if you need them]` }
  }
  if (p.type === 'tool_call' && p.input && typeof p.input === 'object') {
    const input = { ...(p.input as Record<string, unknown>) }
    let changed = false
    for (const key of ['content', 'new_string', 'old_string']) {
      const v = input[key]
      if (typeof v === 'string' && v.length > TRIM_TO * 2) {
        input[key] = `${v.slice(0, TRIM_TO)}… [${v.length - TRIM_TO} characters trimmed]`
        changed = true
      }
    }
    if (changed) return { ...p, input }
  }
  return p
}

export interface FitResult {
  messages: NMessage[]
  /** Whole turns had to be dropped (not just shortened). */
  dropped: number
  estimate: number
}

/**
 * @param fixed tokens taken by the system prompt and tool definitions
 * @param numCtx the model's context window
 */
export function fitToContext(messages: NMessage[], fixed: number, numCtx: number): FitResult {
  // Leave room for the reply: a whole file can easily be a few thousand tokens.
  const budget = Math.floor(numCtx * 0.7) - fixed
  let out = messages.slice()
  const total = () => out.reduce((n, m) => n + msgTokens(m), 0)
  if (total() <= budget) return { messages: out, dropped: 0, estimate: total() + fixed }

  // 1. Shorten old tool output, oldest first, sparing the most recent steps.
  for (let i = 0; i < out.length - KEEP_RECENT && total() > budget; i++) {
    out[i] = { ...out[i], parts: out[i].parts.map(shortenPart) }
  }

  // 2. Drop the oldest turns after the first user message.
  let dropped = 0
  while (total() > budget && out.length > KEEP_RECENT + 1) {
    out.splice(1, 1)
    dropped++
    // Never leave tool results whose calls were dropped (or calls without results).
    while (out.length > KEEP_RECENT + 1 && out[1].role === 'user' && out[1].parts.some((p) => p.type === 'tool_result')) {
      out.splice(1, 1)
      dropped++
    }
  }
  if (dropped) {
    const note: NPart = { type: 'text', text: `(${dropped} earlier messages were removed to fit the context window. Re-read files if you need their current contents.)` }
    out = [{ ...out[0], parts: [...out[0].parts, note] }, ...out.slice(1)]
  }
  // Still too big (e.g. one huge recent result): shorten everything except the last message.
  for (let i = 0; i < out.length - 1 && total() > budget; i++) out[i] = { ...out[i], parts: out[i].parts.map(shortenPart) }
  return { messages: out, dropped, estimate: total() + fixed }
}

export const estimateTokens = tokens
