import type { ProviderConfig } from '@shared/types'
import { ThinkSplitter, stripThink } from '../think-splitter'
import type { CompleteRequest, NMessage, TurnRequest, TurnResult } from '../types'

interface OllamaToolCall {
  id?: string
  function: { name: string; arguments: Record<string, unknown> | string }
}
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: OllamaToolCall[]
  tool_name?: string
}
interface OllamaChunk {
  message?: { content?: string; thinking?: string; tool_calls?: OllamaToolCall[] }
  done?: boolean
  done_reason?: string
  prompt_eval_count?: number
  eval_count?: number
  error?: string
}

const base = (p: ProviderConfig) => (p.baseUrl || 'http://localhost:11434').replace(/\/+$/, '').replace(/\/v1$/, '')

function toOllama(system: string, messages: NMessage[]): OllamaMessage[] {
  const out: OllamaMessage[] = [{ role: 'system', content: system }]
  const names = new Map<string, string>()
  for (const m of messages) {
    if (m.role === 'assistant') {
      const text = m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')
      const calls: OllamaToolCall[] = []
      for (const p of m.parts) {
        if (p.type === 'tool_call') {
          names.set(p.id, p.name)
          calls.push({ function: { name: p.name, arguments: (p.input ?? {}) as Record<string, unknown> } })
        }
      }
      out.push({ role: 'assistant', content: text, ...(calls.length ? { tool_calls: calls } : {}) })
    } else {
      const text: string[] = []
      for (const p of m.parts) {
        if (p.type === 'tool_result') out.push({ role: 'tool', content: p.content || '(empty)', tool_name: names.get(p.id) })
        else if (p.type === 'text') text.push(p.text)
      }
      if (text.length) out.push({ role: 'user', content: text.join('\n\n') })
    }
  }
  return out
}

async function* readNdjson(res: Response): AsyncGenerator<OllamaChunk> {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (line) yield JSON.parse(line) as OllamaChunk
    }
  }
  if (buf.trim()) yield JSON.parse(buf) as OllamaChunk
}

async function post(p: ProviderConfig, path: string, body: unknown, signal: AbortSignal): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${base(p)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    })
  } catch (err) {
    if (signal.aborted) throw err
    throw new Error(`Can't reach Ollama at ${base(p)}. Is it running? Start it with \`ollama serve\` or open the Ollama app.`)
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg
    } catch {
      /* keep status text */
    }
    throw new Error(msg)
  }
  return res
}

export async function runOllamaTurn(req: TurnRequest): Promise<TurnResult> {
  const tools = req.tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.schema }
  }))
  let useTools = tools.length > 0
  for (;;) {
    let res: Response
    try {
      res = await post(
        req.provider,
        '/api/chat',
        {
          model: req.model,
          messages: toOllama(req.system, req.messages),
          stream: true,
          options: { num_ctx: req.ollamaNumCtx },
          ...(useTools ? { tools } : {})
        },
        req.signal
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (useTools && /does not support tools/i.test(msg)) {
        useTools = false
        req.onNotice('warn', `${req.model} doesn't support tool calling, so it can only chat — it can't read or edit files. Try qwen2.5-coder, qwen3, llama3.1 or mistral-nemo for agent mode.`)
        continue
      }
      throw err
    }

    let text = ''
    const splitter = new ThinkSplitter(
      (s) => {
        text += s
        req.onText(s)
      },
      req.onThinking
    )
    const parts: NMessage['parts'] = []
    let doneReason = ''
    for await (const chunk of readNdjson(res)) {
      if (chunk.error) throw new Error(chunk.error)
      const msg = chunk.message
      if (msg?.thinking) req.onThinking(msg.thinking)
      if (msg?.content) splitter.push(msg.content)
      for (const call of msg?.tool_calls ?? []) {
        const id = call.id || `call_${Date.now()}_${parts.length}`
        let input: unknown = call.function.arguments
        if (typeof input === 'string') {
          try {
            input = JSON.parse(input)
          } catch {
            input = { __invalid_json: input }
          }
        }
        req.onToolStart(id, call.function.name)
        parts.push({ type: 'tool_call', id, name: call.function.name, input })
      }
      if (chunk.done) {
        doneReason = chunk.done_reason ?? ''
        req.onUsage(chunk.prompt_eval_count ?? 0, chunk.eval_count ?? 0)
      }
    }
    splitter.flush()
    if (text.trim()) parts.unshift({ type: 'text', text: stripThink(text) })
    const hasCalls = parts.some((p) => p.type === 'tool_call')
    return {
      message: { role: 'assistant', parts },
      stopReason: hasCalls ? 'tool_use' : doneReason === 'length' ? 'max_tokens' : 'end_turn'
    }
  }
}

export async function ollamaComplete(req: CompleteRequest): Promise<string> {
  const res = await post(
    req.provider,
    '/api/chat',
    {
      model: req.model,
      stream: true,
      keep_alive: '30m',
      options: { num_ctx: req.ollamaNumCtx, num_predict: req.maxTokens },
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt }
      ]
    },
    req.signal
  )
  let out = ''
  for await (const chunk of readNdjson(res)) {
    if (chunk.error) throw new Error(chunk.error)
    const d = chunk.message?.content
    if (d) {
      out += d
      req.onText?.(d)
    }
  }
  return stripThink(out)
}

/** Fill-in-the-middle completion for coder models (qwen2.5-coder, codellama, starcoder2…). */
export async function ollamaFim(p: ProviderConfig, model: string, prefix: string, suffix: string, signal: AbortSignal): Promise<string> {
  const res = await post(
    p,
    '/api/generate',
    // keep_alive stops Ollama unloading the model between keystrokes (reloading takes seconds).
    { model, prompt: prefix, suffix, stream: false, keep_alive: '30m', options: { num_predict: 64, temperature: 0.2, stop: ['\n\n\n'] } },
    signal
  )
  const data = (await res.json()) as { response?: string }
  return data.response ?? ''
}

/** Downloads a model from the Ollama library, reporting progress (0–100). */
export async function ollamaPull(p: ProviderConfig, model: string, onProgress: (status: string, percent: number) => void): Promise<void> {
  const res = await post(p, '/api/pull', { model, stream: true }, AbortSignal.timeout(60 * 60 * 1000))
  for await (const chunk of readNdjson(res) as AsyncGenerator<OllamaChunk & { status?: string; completed?: number; total?: number }>) {
    if (chunk.error) throw new Error(chunk.error)
    const pct = chunk.total ? Math.round(((chunk.completed ?? 0) / chunk.total) * 100) : 0
    onProgress(chunk.status ?? '', pct)
  }
}

/** Loads a model into memory ahead of time so the first suggestion isn't slow. */
export async function ollamaWarm(p: ProviderConfig, model: string): Promise<void> {
  await post(p, '/api/generate', { model, keep_alive: '30m' }, AbortSignal.timeout(120_000))
}

export async function listOllamaModels(p: ProviderConfig): Promise<string[]> {
  const res = await fetch(`${base(p)}/api/tags`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`)
  const data = (await res.json()) as { models?: { name: string }[] }
  return (data.models ?? []).map((m) => m.name).sort()
}
