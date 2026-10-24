import type { Effort, ProviderConfig, ToolMeta } from '@shared/types'

/**
 * Provider-neutral conversation history. Each provider converts it to its own
 * wire format. Anthropic turns also keep the exact content array the API
 * returned, because thinking blocks must be passed back unchanged.
 */
export type NPart =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; content: string; isError?: boolean }

export interface NMessage {
  role: 'user' | 'assistant'
  parts: NPart[]
  anthropic?: { model: string; content: unknown[] }
}

export interface ToolSpec {
  name: string
  description: string
  schema: Record<string, unknown>
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'refusal' | 'pause_turn' | 'other'

export interface TurnCallbacks {
  onText: (delta: string) => void
  onThinking: (delta: string) => void
  onToolStart: (id: string, name: string) => void
  /** Partial JSON of a tool call's input, streamed while the model writes it. */
  onToolInputDelta?: (id: string, delta: string) => void
  /** Anthropic server tools (web search/fetch) run remotely; we only display them. */
  onServerTool?: (id: string, name: string, input: unknown) => void
  onServerToolResult?: (id: string, output: string, isError: boolean, meta?: ToolMeta) => void
  onNotice: (level: 'info' | 'warn', text: string) => void
  onUsage: (input: number, output: number, cacheRead?: number) => void
}

export interface TurnRequest extends TurnCallbacks {
  provider: ProviderConfig
  model: string
  system: string
  messages: NMessage[]
  tools: ToolSpec[]
  effort: Effort
  signal: AbortSignal
  ollamaNumCtx: number
  /** How Ollama models make tool calls: Ollama's own parser, or tagged text we stream and parse. */
  ollamaToolCalls?: 'auto' | 'native' | 'text'
  serverWebSearch: boolean
}

export interface TurnResult {
  message: NMessage
  stopReason: StopReason
}

export interface CompleteRequest {
  provider: ProviderConfig
  model: string
  system: string
  prompt: string
  maxTokens: number
  signal: AbortSignal
  onText?: (delta: string) => void
  ollamaNumCtx: number
}
