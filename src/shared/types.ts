// Types shared by the main process, preload bridge and renderer.

export type ProviderKind = 'anthropic' | 'openai' | 'ollama' | 'claude-code'

export interface ProviderConfig {
  id: string
  name: string
  kind: ProviderKind
  baseUrl?: string
  /** Only ever populated in the main process. The renderer sees `hasKey`. */
  apiKey?: string
  hasKey?: boolean
  models: string[]
  enabled: boolean
  /** Built-in presets can't be deleted from the settings screen. */
  builtin?: boolean
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type PermissionMode = 'ask' | 'auto-edit' | 'full-auto'
export type ChatMode = 'agent' | 'ask' | 'plan'

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'none' | 'error' | 'unconfigured' | 'dev'
  version: string
  latest?: string
  progress?: number
  message?: string
}

export interface EditorSettings {
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  autoSave: 'off' | 'afterDelay' | 'onFocusChange'
}

export interface Settings {
  providers: ProviderConfig[]
  activeProviderId: string
  activeModel: string
  effort: Effort
  permissionMode: PermissionMode
  chatMode: ChatMode
  ollamaNumCtx: number
  /** 'text' streams tool calls live (Prism parses them); 'native' uses Ollama's parser; 'auto' picks per model. */
  ollamaToolCalls: 'auto' | 'native' | 'text'
  claudeServerWebSearch: boolean
  autocomplete: { enabled: boolean; providerId: string; model: string }
  /** Download updates in the background and install them on quit. */
  autoUpdate: boolean
  editor: EditorSettings
  recentFolders: string[]
  lastFolder?: string
}

export interface DirEntry {
  name: string
  path: string
  isDir: boolean
}

export interface FileContent {
  content: string
  isBinary: boolean
  tooLarge: boolean
}

export interface SearchHit {
  path: string
  line: number
  text: string
}

export interface GitStatus {
  isRepo: boolean
  branch?: string
  files: { path: string; status: string }[]
}

export type PlanStatus = 'pending' | 'in_progress' | 'completed'
export interface PlanItem {
  content: string
  status: PlanStatus
}

export interface ToolMeta {
  path?: string
  before?: string | null
  after?: string
  added?: number
  removed?: number
  exitCode?: number | null
  url?: string
  results?: { title: string; url: string; snippet?: string }[]
}

/** Events streamed from the agent (main) to the chat panel (renderer). */
export type AgentEvent =
  | { type: 'turn_start' }
  | { type: 'text'; delta: string }
  | { type: 'thinking'; delta: string }
  | { type: 'tool_start'; id: string; name: string; server?: boolean }
  | { type: 'tool_input'; id: string; name: string; input: unknown }
  /** Raw JSON of a tool call's input as the model types it, before the call is complete. */
  | { type: 'tool_input_delta'; id: string; delta: string }
  | { type: 'tool_output'; id: string; delta: string }
  | { type: 'tool_result'; id: string; output: string; isError: boolean; meta?: ToolMeta }
  | { type: 'approval'; requestId: string; toolId: string; name: string; input: unknown }
  | { type: 'plan'; items: PlanItem[] }
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheRead?: number }
  | { type: 'notice'; level: 'info' | 'warn'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done'; stopReason?: string }

export interface ContextAttachment {
  kind: 'file' | 'selection'
  path: string
  content: string
  startLine?: number
  endLine?: number
}

export interface SendMessageRequest {
  chatId: string
  text: string
  attachments: ContextAttachment[]
  mode: ChatMode
}

export interface ChatSummary {
  id: string
  title: string
  updatedAt: number
}

/** UI representation of a chat, persisted by the renderer. */
export type UiBlock =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | {
      kind: 'tool'
      id: string
      name: string
      input?: unknown
      status: 'pending' | 'awaiting' | 'running' | 'done' | 'error' | 'denied'
      output?: string
      meta?: ToolMeta
      server?: boolean
      approvalId?: string
      /** Raw input JSON while the model is still writing the call. */
      partial?: string
    }
  | { kind: 'plan'; items: PlanItem[] }
  | { kind: 'notice'; level: 'info' | 'warn' | 'error'; text: string }

export interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  blocks: UiBlock[]
  attachments?: { path: string; kind: string }[]
  model?: string
}

export interface InlineEditRequest {
  requestId: string
  filePath: string
  language: string
  selection: string
  prefix: string
  suffix: string
  instruction: string
}

export interface CompletionRequest {
  requestId: string
  filePath: string
  language: string
  prefix: string
  suffix: string
}

export interface SlashCommand {
  name: string
  description: string
  /** Template; `$ARGUMENTS` is replaced with what the user typed after the command. */
  template?: string
  mode?: ChatMode
  /** Local UI actions that never reach the model. */
  action?: 'clear' | 'model' | 'mode' | 'help' | 'settings' | 'terminal' | 'compact'
  source?: 'builtin' | 'project'
}
