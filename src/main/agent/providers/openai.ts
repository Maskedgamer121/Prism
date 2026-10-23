import OpenAI from 'openai'
import type { ProviderConfig } from '@shared/types'
import { ThinkSplitter, stripThink } from '../think-splitter'
import type { CompleteRequest, NMessage, StopReason, TurnRequest, TurnResult } from '../types'

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

function client(p: ProviderConfig): OpenAI {
  // Local servers (LM Studio, vLLM, llama.cpp) accept any key.
  return new OpenAI({ apiKey: p.apiKey || 'not-needed', baseURL: p.baseUrl, dangerouslyAllowBrowser: false })
}

export function toOpenAI(system: string, messages: NMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [{ role: 'system', content: system }]
  for (const m of messages) {
    if (m.role === 'assistant') {
      const text = m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('')
      const calls = m.parts.filter((p) => p.type === 'tool_call') as { id: string; name: string; input: unknown }[]
      out.push({
        role: 'assistant',
        content: text || null,
        ...(calls.length
          ? { tool_calls: calls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) } })) }
          : {})
      })
    } else {
      const text: string[] = []
      for (const part of m.parts) {
        if (part.type === 'tool_result') out.push({ role: 'tool', tool_call_id: part.id, content: part.content || '(empty)' })
        else if (part.type === 'text') text.push(part.text)
      }
      if (text.length) out.push({ role: 'user', content: text.join('\n\n') })
    }
  }
  return out
}

function isToolSupportError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /does not support tools|tool(s)? (are|is) not supported|tool_choice|function calling is not/i.test(msg)
}

export async function runOpenAITurn(req: TurnRequest): Promise<TurnResult> {
  const openai = client(req.provider)
  const tools = req.tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.schema }
  }))
  let useTools = tools.length > 0

  for (;;) {
    try {
      const stream = await openai.chat.completions.create(
        {
          model: req.model,
          messages: toOpenAI(req.system, req.messages),
          stream: true,
          stream_options: { include_usage: true },
          ...(useTools ? { tools } : {})
        },
        { signal: req.signal }
      )
      let text = ''
      const splitter = new ThinkSplitter(
        (s) => {
          text += s
          req.onText(s)
        },
        req.onThinking
      )
      const calls = new Map<number, { id: string; name: string; args: string }>()
      let finish: string | null = null
      for await (const chunk of stream) {
        if (chunk.usage) req.onUsage(chunk.usage.prompt_tokens, chunk.usage.completion_tokens)
        const choice = chunk.choices?.[0]
        if (!choice) continue
        const delta = choice.delta as typeof choice.delta & { reasoning_content?: string; reasoning?: string }
        const reasoning = delta.reasoning_content ?? delta.reasoning
        if (reasoning) req.onThinking(reasoning)
        if (delta.content) splitter.push(delta.content)
        for (const tc of delta.tool_calls ?? []) {
          let call = calls.get(tc.index)
          if (!call) {
            call = { id: tc.id || `call_${Date.now()}_${tc.index}`, name: '', args: '' }
            calls.set(tc.index, call)
          }
          if (tc.id) call.id = tc.id
          if (tc.function?.name) {
            const first = !call.name
            call.name += tc.function.name
            if (first) req.onToolStart(call.id, call.name)
          }
          if (tc.function?.arguments) call.args += tc.function.arguments
        }
        if (choice.finish_reason) finish = choice.finish_reason
      }
      splitter.flush()

      const parts: NMessage['parts'] = []
      if (text.trim()) parts.push({ type: 'text', text: stripThink(text) })
      for (const call of calls.values()) {
        let input: unknown = {}
        try {
          input = call.args ? JSON.parse(call.args) : {}
        } catch {
          input = { __invalid_json: call.args }
        }
        parts.push({ type: 'tool_call', id: call.id, name: call.name, input })
      }
      const stopReason: StopReason = calls.size ? 'tool_use' : finish === 'length' ? 'max_tokens' : 'end_turn'
      return { message: { role: 'assistant', parts }, stopReason }
    } catch (err) {
      if (useTools && isToolSupportError(err)) {
        useTools = false
        req.onNotice('warn', `${req.model} doesn't support tool calling, so it can only chat — it can't read or edit files. Pick a tool-capable model (e.g. qwen2.5-coder, llama3.1, mistral-nemo) for agent mode.`)
        continue
      }
      throw err
    }
  }
}

export async function openAIComplete(req: CompleteRequest): Promise<string> {
  const openai = client(req.provider)
  const stream = await openai.chat.completions.create(
    {
      model: req.model,
      max_tokens: req.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt }
      ]
    },
    { signal: req.signal }
  )
  let out = ''
  for await (const chunk of stream) {
    const d = chunk.choices?.[0]?.delta?.content
    if (d) {
      out += d
      req.onText?.(d)
    }
  }
  return stripThink(out)
}

export async function listOpenAIModels(p: ProviderConfig): Promise<string[]> {
  const openai = client(p)
  const ids: string[] = []
  for await (const m of openai.models.list()) ids.push(m.id)
  return ids.sort()
}
