import type { NMessage, ToolSpec } from './types'

/**
 * Text tool protocol for local models. Ollama only hands over a tool call once the model has
 * finished writing it, so nothing shows while a model types out a whole file. Instead we describe
 * the tools in the prompt and parse `<tool_call>{"name": …, "arguments": {…}}</tool_call>` from the
 * streamed text ourselves (the Hermes format Qwen and many other models are trained on), which lets
 * the chat show the call as it's written.
 */

const OPEN = '<tool_call>'
const CLOSE = '</tool_call>'

export function textToolsPrompt(tools: ToolSpec[]): string {
  const sigs = tools.map((t) => JSON.stringify({ type: 'function', function: { name: t.name, description: t.description, parameters: t.schema } })).join('\n')
  return `

# Tools

You can call tools. Their signatures (JSON Schema) are inside <tools></tools>:
<tools>
${sigs}
</tools>

To call a tool, write a JSON object with the tool name and its arguments inside <tool_call></tool_call> tags:
<tool_call>
{"name": "<tool name>", "arguments": {<arguments as a JSON object>}}
</tool_call>

Rules:
- Arguments must be valid JSON: escape newlines inside strings as \\n and quotes as \\".
- You may make several tool calls in a row. Then stop: the results come back inside <tool_response></tool_response> tags.
- Never write <tool_response> yourself, and don't describe a tool call instead of making it.`
}

/** Conversation in text-protocol form: tool calls become tagged text, tool results become user turns. */
export function toTextToolMessages(system: string, messages: NMessage[]): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const out: { role: 'system' | 'user' | 'assistant'; content: string }[] = [{ role: 'system', content: system }]
  const names = new Map<string, string>()
  for (const m of messages) {
    const chunks: string[] = []
    if (m.role === 'assistant') {
      for (const p of m.parts) {
        if (p.type === 'text' && p.text.trim()) chunks.push(p.text)
        else if (p.type === 'tool_call') {
          names.set(p.id, p.name)
          const args = p.input && typeof p.input === 'object' && '__invalid_json' in p.input ? {} : (p.input ?? {})
          chunks.push(`${OPEN}\n${JSON.stringify({ name: p.name, arguments: args })}\n${CLOSE}`)
        }
      }
      out.push({ role: 'assistant', content: chunks.join('\n') })
    } else {
      for (const p of m.parts) {
        if (p.type === 'tool_result') chunks.push(`<tool_response name="${names.get(p.id) ?? 'tool'}">\n${p.content || '(empty)'}\n</tool_response>`)
        else if (p.type === 'text') chunks.push(p.text)
      }
      if (chunks.length) out.push({ role: 'user', content: chunks.join('\n\n') })
    }
  }
  return out
}

export interface TextToolCall {
  id: string
  name: string
  input: unknown
}

/** Splits streamed model text into plain text and tool calls, reporting each call's arguments as they arrive. */
export class TextToolParser {
  private buf = ''
  private inCall = false
  private callId = ''
  private callName = ''
  private argsFrom = -1
  private sent = 0
  private seq = 0
  readonly calls: TextToolCall[] = []
  text = ''

  constructor(
    private cb: {
      onText: (s: string) => void
      onToolStart: (id: string, name: string) => void
      onToolInputDelta: (id: string, delta: string) => void
    }
  ) {}

  push(chunk: string): void {
    this.buf += chunk
    for (;;) {
      if (!this.inCall) {
        const at = this.buf.indexOf(OPEN)
        if (at >= 0) {
          this.emitText(this.buf.slice(0, at))
          this.buf = this.buf.slice(at + OPEN.length)
          this.inCall = true
          this.callId = `call_${Date.now().toString(36)}_${this.seq++}`
          this.callName = ''
          this.argsFrom = -1
          this.sent = 0
          continue
        }
        const keep = partialTagLength(this.buf, OPEN)
        this.emitText(this.buf.slice(0, this.buf.length - keep))
        this.buf = this.buf.slice(this.buf.length - keep)
        return
      }
      const end = this.buf.indexOf(CLOSE)
      const body = end >= 0 ? this.buf.slice(0, end) : this.buf
      this.progress(body, end >= 0)
      if (end < 0) return
      this.finishCall(body)
      this.buf = this.buf.slice(end + CLOSE.length)
      this.inCall = false
    }
  }

  /** End of stream: a call the model never closed (e.g. it hit the output limit) is still parsed if it can be. */
  flush(): void {
    if (this.inCall) {
      this.finishCall(this.buf)
      this.inCall = false
    } else this.emitText(this.buf)
    this.buf = ''
  }

  private progress(body: string, closed: boolean): void {
    if (!this.callName) {
      const m = body.match(/"name"\s*:\s*"([^"]+)"/)
      if (!m) return
      this.callName = m[1]
      this.cb.onToolStart(this.callId, this.callName)
    }
    if (this.argsFrom < 0) {
      const m = /"(?:arguments|parameters)"\s*:\s*/.exec(body)
      if (!m) return
      this.argsFrom = m.index + m[0].length
      this.sent = this.argsFrom
    }
    // Hold back the tail: it may be the object's closing brace or the start of </tool_call>.
    if (closed) return
    const upto = body.length - 16
    if (upto > this.sent) {
      this.cb.onToolInputDelta(this.callId, body.slice(this.sent, upto))
      this.sent = upto
    }
  }

  private finishCall(body: string): void {
    let name = this.callName
    let input: unknown
    try {
      const obj = JSON.parse(body.trim()) as { name?: string; arguments?: unknown; parameters?: unknown }
      name = obj.name || name
      input = typeof obj.arguments === 'string' ? JSON.parse(obj.arguments) : (obj.arguments ?? obj.parameters ?? {})
    } catch {
      input = { __invalid_json: body.trim() }
    }
    if (!name) {
      // Not a recognisable call; show it as text rather than dropping it.
      this.emitText(OPEN + body)
      return
    }
    if (!this.callName) this.cb.onToolStart(this.callId, name)
    this.calls.push({ id: this.callId, name, input })
  }

  private emitText(s: string): void {
    if (!s) return
    this.text += s
    this.cb.onText(s)
  }
}

function partialTagLength(buf: string, tag: string): number {
  for (let k = Math.min(tag.length - 1, buf.length); k > 0; k--) if (tag.startsWith(buf.slice(-k))) return k
  return 0
}
