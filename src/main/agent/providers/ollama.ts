import type { ProviderConfig } from '@shared/types'
import { ThinkSplitter, stripThink } from '../think-splitter'
import { TextToolParser, textToolsPrompt, toTextToolMessages } from '../text-tools'
import { estimateTokens, fitToContext } from '../context-fit'
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

const BAD_TOOL_CALL = /invalid tool call|unexpected end of JSON|error parsing tool call/i

function brokenCallError(model: string, numCtx: number | undefined): Error {
  return new Error(
    `${model} keeps sending tool calls with broken JSON — usually because it ran out of room mid-file or is too small to write files reliably. ` +
      `Try a stronger tool-calling model (qwen2.5-coder:7b, qwen3:8b or larger), raise Ollama context size in Settings → Models (now ${numCtx ?? 'default'}), or ask for smaller edits.`
  )
}

// Chats already told that old turns were dropped (keyed by the agent's history array).
const trimNoticeShown = new WeakSet<NMessage[]>()

/** The history trimmed to fit num_ctx, with a one-time notice per chat when turns are dropped. */
function fitHistory(req: TurnRequest, system: string): NMessage[] {
  const fit = fitToContext(req.messages, estimateTokens(system), req.ollamaNumCtx)
  if (fit.dropped && !trimNoticeShown.has(req.messages)) {
    trimNoticeShown.add(req.messages)
    req.onNotice(
      'info',
      `This chat is longer than ${req.model}'s ${req.ollamaNumCtx.toLocaleString()}-token context window, so the oldest steps are left out of what the model sees. Start a new chat or raise "Ollama context window" in Settings → Agent to keep more.`
    )
  }
  return fit.messages
}

function contextFullNotice(req: TurnRequest): void {
  req.onNotice(
    'warn',
    `The reply didn't fit in ${req.model}'s ${req.ollamaNumCtx.toLocaleString()}-token context window. Raise "Ollama context window" in Settings → Agent (if your PC has the memory), ask for a smaller change, or start a new chat.`
  )
}

/** Models trained on the Hermes `<tool_call>` format, which Ollama would otherwise parse (and hide) itself. */
const HERMES_MODELS = /qwen|hermes|qwq/i

function useTextTools(req: TurnRequest): boolean {
  if (!req.tools.length) return false
  const mode = req.ollamaToolCalls ?? 'auto'
  return mode === 'text' || (mode === 'auto' && HERMES_MODELS.test(req.model))
}

/**
 * Tool calls written as tagged text that we parse ourselves, so the chat can show each call
 * (a whole file, a command) while the model is still typing it.
 */
async function runOllamaTextTurn(req: TurnRequest): Promise<TurnResult> {
  const res = await post(
    req.provider,
    '/api/chat',
    {
      model: req.model,
      messages: (() => {
        const system = req.system + textToolsPrompt(req.tools)
        return toTextToolMessages(system, fitHistory(req, system))
      })(),
      stream: true,
      options: { num_ctx: req.ollamaNumCtx, stop: ['<tool_response'] }
    },
    req.signal
  )
  const parser = new TextToolParser({
    onText: req.onText,
    onToolStart: req.onToolStart,
    onToolInputDelta: (id, delta) => req.onToolInputDelta?.(id, delta)
  })
  const splitter = new ThinkSplitter((s) => parser.push(s), req.onThinking)
  let doneReason = ''
  for await (const chunk of readNdjson(res)) {
    if (chunk.error) throw new Error(chunk.error)
    const msg = chunk.message
    if (msg?.thinking) req.onThinking(msg.thinking)
    if (msg?.content) splitter.push(msg.content)
    if (chunk.done) {
      doneReason = chunk.done_reason ?? ''
      req.onUsage(chunk.prompt_eval_count ?? 0, chunk.eval_count ?? 0)
    }
  }
  splitter.flush()
  parser.flush()
  if (doneReason === 'length') contextFullNotice(req)
  const parts: NMessage['parts'] = []
  if (parser.text.trim()) parts.push({ type: 'text', text: stripThink(parser.text) })
  for (const c of parser.calls) parts.push({ type: 'tool_call', id: c.id, name: c.name, input: c.input })
  const last = parser.calls[parser.calls.length - 1]
  const lastBroken = !!last && typeof last.input === 'object' && last.input !== null && '__invalid_json' in last.input
  const cutOff = doneReason === 'length' && (!last || lastBroken)
  return {
    message: { role: 'assistant', parts },
    stopReason: cutOff ? 'max_tokens' : parser.calls.length ? 'tool_use' : 'end_turn'
  }
}

export async function runOllamaTurn(req: TurnRequest): Promise<TurnResult> {
  if (useTextTools(req)) return runOllamaTextTurn(req)
  const tools = req.tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.schema }
  }))
  let useTools = tools.length > 0
  let badCalls = 0
  for (;;) {
    let res: Response
    try {
      res = await post(
        req.provider,
        '/api/chat',
        {
          model: req.model,
          messages: toOllama(req.system, fitHistory(req, req.system + JSON.stringify(tools))),
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
      if (BAD_TOOL_CALL.test(msg) && badCalls < 2) {
        badCalls++
        req.onNotice('warn', `${req.model} sent a broken tool call — retrying (${badCalls}/2).`)
        continue
      }
      throw BAD_TOOL_CALL.test(msg) ? brokenCallError(req.model, req.ollamaNumCtx) : err
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
    let streamError = ''
    for await (const chunk of readNdjson(res)) {
      if (chunk.error) {
        streamError = chunk.error
        break
      }
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
    if (streamError) {
      // Ollama parses tool calls itself and fails the stream when the model's JSON is cut off.
      if (!BAD_TOOL_CALL.test(streamError)) throw new Error(streamError)
      if (badCalls >= 2) throw brokenCallError(req.model, req.ollamaNumCtx)
      badCalls++
      req.onNotice('warn', `${req.model} sent a broken tool call — retrying (${badCalls}/2).`)
      continue
    }
    if (doneReason === 'length') contextFullNotice(req)
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
export async function ollamaFim(p: ProviderConfig, model: string, prefix: string, suffix: string, signal: AbortSignal, numCtx?: number): Promise<string> {
  const res = await post(
    p,
    '/api/generate',
    // keep_alive stops Ollama unloading the model between keystrokes (reloading takes seconds).
    // Same num_ctx as chat: Ollama reloads a model whenever the context size changes.
    { model, prompt: prefix, suffix, stream: false, keep_alive: '30m', options: { num_ctx: numCtx, num_predict: 64, temperature: 0.2, stop: ['\n\n\n'] } },
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
export async function ollamaWarm(p: ProviderConfig, model: string, numCtx?: number, keepAlive = '30m'): Promise<void> {
  await post(p, '/api/generate', { model, keep_alive: keepAlive, options: { num_ctx: numCtx } }, AbortSignal.timeout(120_000))
}

export async function listOllamaModels(p: ProviderConfig): Promise<string[]> {
  const res = await fetch(`${base(p)}/api/tags`, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`)
  const data = (await res.json()) as { models?: { name: string }[] }
  return (data.models ?? []).map((m) => m.name).sort()
}
