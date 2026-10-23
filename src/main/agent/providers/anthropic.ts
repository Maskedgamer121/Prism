import Anthropic from '@anthropic-ai/sdk'
import type { ProviderConfig, ToolMeta } from '@shared/types'
import type { CompleteRequest, NMessage, StopReason, TurnRequest, TurnResult } from '../types'

type BetaMessageParam = Anthropic.Beta.BetaMessageParam
type BetaContentBlockParam = Anthropic.Beta.BetaContentBlockParam
type BetaToolUnion = Anthropic.Beta.BetaToolUnion

function client(p: ProviderConfig): Anthropic {
  if (!p.apiKey) throw new Error('No Anthropic API key. Add one in Settings → Models → Claude (Anthropic API).')
  return new Anthropic({ apiKey: p.apiKey, baseURL: p.baseUrl || undefined })
}

/** Models older than the 4.6 generation don't take adaptive thinking or effort. */
function isLegacy(model: string): boolean {
  return /claude-(3|haiku-4-5|sonnet-4-5|sonnet-4-0|sonnet-4-2|opus-4-0|opus-4-1|opus-4-5)/.test(model)
}

/** Server-side refusal fallback (`fallbacks: "default"`) is supported on these. */
function supportsFallback(model: string): boolean {
  return /claude-(opus-5|fable-5|sonnet-5-5)/.test(model)
}

/** Whether Anthropic's hosted web_search/web_fetch tools are available for this model. */
export function supportsServerWeb(model: string): boolean {
  return /claude-(opus-(4-6|4-7|4-8|5)|sonnet-(4-6|5))/.test(model)
}

function toBeta(messages: NMessage[]): BetaMessageParam[] {
  return messages.map((m): BetaMessageParam => {
    if (m.role === 'assistant' && m.anthropic) {
      return { role: 'assistant', content: m.anthropic.content as BetaContentBlockParam[] }
    }
    const content: BetaContentBlockParam[] = []
    for (const part of m.parts) {
      if (part.type === 'text') {
        if (part.text) content.push({ type: 'text', text: part.text })
      } else if (part.type === 'tool_call') {
        content.push({ type: 'tool_use', id: part.id, name: part.name, input: part.input as Record<string, unknown> })
      } else {
        content.push({ type: 'tool_result', tool_use_id: part.id, content: part.content || '(empty)', is_error: part.isError })
      }
    }
    if (content.length === 0) content.push({ type: 'text', text: '(empty)' })
    return { role: m.role, content }
  })
}

function mapStop(reason: string | null | undefined): StopReason {
  switch (reason) {
    case 'end_turn':
    case 'tool_use':
    case 'max_tokens':
    case 'refusal':
    case 'pause_turn':
      return reason
    default:
      return 'other'
  }
}

function friendlyError(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) return new Error('Anthropic rejected the API key. Check it in Settings.')
  if (err instanceof Anthropic.PermissionDeniedError) return new Error(`Anthropic: permission denied — ${err.message}`)
  if (err instanceof Anthropic.NotFoundError) return new Error(`Anthropic: model or endpoint not found — ${err.message}`)
  if (err instanceof Anthropic.RateLimitError) return new Error('Anthropic rate limit hit. Wait a moment and try again.')
  if (err instanceof Anthropic.BadRequestError) return new Error(`Anthropic rejected the request: ${err.message}`)
  if (err instanceof Anthropic.APIError) return new Error(`Anthropic API error ${err.status ?? ''}: ${err.message}`)
  return err instanceof Error ? err : new Error(String(err))
}

function baseParams(model: string, effort: TurnRequest['effort']) {
  const betas: string[] = []
  const extra: Record<string, unknown> = {}
  if (!isLegacy(model)) {
    extra.thinking = { type: 'adaptive', display: 'summarized' }
    extra.output_config = { effort }
  }
  if (supportsFallback(model)) {
    betas.push('server-side-fallback-2026-07-01')
    extra.fallbacks = 'default'
  }
  return { betas, extra }
}

export async function runAnthropicTurn(req: TurnRequest): Promise<TurnResult> {
  const anthropic = client(req.provider)
  const serverWeb = req.serverWebSearch && supportsServerWeb(req.model)
  const tools: BetaToolUnion[] = req.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.schema as Anthropic.Beta.BetaTool.InputSchema,
    eager_input_streaming: true
  }))
  if (serverWeb) {
    tools.push({ type: 'web_search_20260209', name: 'web_search', max_uses: 8 })
    tools.push({ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 8 })
  }
  const { betas, extra } = baseParams(req.model, req.effort)

  for (let attempt = 0; ; attempt++) {
    try {
      const stream = anthropic.beta.messages.stream(
        {
          model: req.model,
          max_tokens: 64000,
          system: req.system,
          messages: toBeta(req.messages),
          tools,
          cache_control: { type: 'ephemeral' },
          ...(betas.length ? { betas } : {}),
          ...extra
        } as Anthropic.Beta.Messages.MessageCreateParamsStreaming,
        { signal: req.signal }
      )
      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block
          if (block.type === 'tool_use') req.onToolStart(block.id, block.name)
          else if (block.type === 'server_tool_use') req.onServerTool?.(block.id, block.name, {})
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') req.onText(event.delta.text)
          else if (event.delta.type === 'thinking_delta') req.onThinking(event.delta.thinking)
        }
      }
      const message = await stream.finalMessage()
      reportServerTools(message.content, req)
      const u = message.usage
      req.onUsage(u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), u.output_tokens, u.cache_read_input_tokens ?? 0)
      if (message.stop_reason === 'refusal') {
        const details = (message as { stop_details?: { category?: string | null; explanation?: string | null } }).stop_details
        req.onNotice('warn', `Claude declined this request${details?.category ? ` (${details.category})` : ''}.${details?.explanation ? ' ' + details.explanation : ''}`)
      }

      const parts: NMessage['parts'] = []
      for (const block of message.content) {
        if (block.type === 'text') parts.push({ type: 'text', text: block.text })
        else if (block.type === 'tool_use') parts.push({ type: 'tool_call', id: block.id, name: block.name, input: block.input })
      }
      return {
        message: { role: 'assistant', parts, anthropic: { model: req.model, content: message.content as unknown[] } },
        stopReason: mapStop(message.stop_reason)
      }
    } catch (err) {
      if (req.signal.aborted) throw err
      // With eager input streaming the SDK can fail to parse a tool input; re-issue the turn.
      if (err instanceof Anthropic.APIError || attempt >= 2) throw friendlyError(err)
      req.onNotice('warn', 'A tool call arrived malformed — retrying the turn.')
    }
  }
}

function reportServerTools(content: Anthropic.Beta.BetaContentBlock[], req: TurnRequest): void {
  for (const block of content) {
    if (block.type === 'server_tool_use') {
      req.onServerTool?.(block.id, block.name, block.input)
    } else if (block.type === 'web_search_tool_result') {
      const c = block.content
      if (Array.isArray(c)) {
        const results = c.map((r) => ({ title: r.title, url: r.url }))
        const meta: ToolMeta = { results }
        req.onServerToolResult?.(block.tool_use_id, results.map((r) => `${r.title}\n${r.url}`).join('\n\n'), false, meta)
      } else {
        req.onServerToolResult?.(block.tool_use_id, `Search failed: ${c.error_code}`, true)
      }
    } else if (block.type === 'web_fetch_tool_result') {
      const c = block.content as { type: string; url?: string; error_code?: string; content?: { title?: string | null } }
      if (c.type === 'web_fetch_result') {
        req.onServerToolResult?.(block.tool_use_id, `Fetched ${c.content?.title ?? c.url}`, false, { url: c.url })
      } else {
        req.onServerToolResult?.(block.tool_use_id, `Fetch failed: ${c.error_code ?? 'unknown error'}`, true)
      }
    }
  }
}

export async function anthropicComplete(req: CompleteRequest): Promise<string> {
  const anthropic = client(req.provider)
  const { betas, extra } = baseParams(req.model, 'low')
  try {
    const stream = anthropic.beta.messages.stream(
      {
        model: req.model,
        max_tokens: Math.max(req.maxTokens, 2048),
        system: req.system,
        messages: [{ role: 'user', content: req.prompt }],
        ...(betas.length ? { betas } : {}),
        ...extra
      } as Anthropic.Beta.Messages.MessageCreateParamsStreaming,
      { signal: req.signal }
    )
    if (req.onText) stream.on('text', req.onText)
    const message = await stream.finalMessage()
    return message.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  } catch (err) {
    throw friendlyError(err)
  }
}

export async function listAnthropicModels(p: ProviderConfig): Promise<string[]> {
  const anthropic = client(p)
  const ids: string[] = []
  for await (const m of anthropic.models.list({ limit: 100 })) ids.push(m.id)
  return ids
}
