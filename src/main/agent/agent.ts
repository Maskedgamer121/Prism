import { app } from 'electron'
import { createHash, randomUUID } from 'crypto'
import { existsSync, mkdirSync, promises as fsp } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type {
  AgentEvent,
  ChatSummary,
  CompletionRequest,
  InlineEditRequest,
  PlanItem,
  ProviderConfig,
  SendMessageRequest,
  UiMessage
} from '@shared/types'
import { getProvider, loadSettings } from '../settings'
import { getRoot } from '../workspace'
import { buildSystemPrompt } from './prompt'
import { anthropicComplete, runAnthropicTurn, supportsServerWeb } from './providers/anthropic'
import { claudeCodeComplete, runClaudeCode } from './providers/claude-code'
import { ollamaComplete, ollamaFim, ollamaWarm, runOllamaTurn } from './providers/ollama'
import { GRAPHICS_CHEATSHEET } from '../learn'
import { openAIComplete, runOpenAITurn } from './providers/openai'
import { executeTool, findTool, needsApproval, relPath, selectTools, toSpecs, workspaceOverview, type ToolOutcome } from './tools'
import type { NMessage, NPart, TurnRequest, TurnResult } from './types'

interface ChatSession {
  id: string
  title: string
  workspace: string | null
  history: NMessage[]
  ui: UiMessage[]
  system?: string
  systemKey?: string
  claudeSessionId?: string
  createdAt: number
  updatedAt: number
}

type Decision = 'allow' | 'always' | 'deny'

export interface AgentHooks {
  emit: (chatId: string, event: AgentEvent) => void
  openFile: (path: string, line?: number) => void
  fileChanged: (path: string) => void
}

const MAX_TURNS = 80

function isLocalUrl(url?: string): boolean {
  return !url || /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(url)
}

function chatsDir(workspace: string | null): string {
  const key = createHash('sha1').update((workspace ?? '__none__').toLowerCase()).digest('hex').slice(0, 12)
  const dir = join(app.getPath('userData'), 'chats', key)
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function runTurn(kind: ProviderConfig['kind'], req: TurnRequest): Promise<TurnResult> {
  switch (kind) {
    case 'anthropic':
      return runAnthropicTurn(req)
    case 'ollama':
      return runOllamaTurn(req)
    case 'openai':
      return runOpenAITurn(req)
    default:
      throw new Error(`Provider kind ${kind} does not run turns directly.`)
  }
}

export class Agent {
  private sessions = new Map<string, ChatSession>()
  private running = new Map<string, AbortController>()
  private approvals = new Map<string, (d: Decision) => void>()
  private alwaysAllow = new Map<string, Set<string>>()

  constructor(private hooks: AgentHooks) {}

  private session(chatId: string): ChatSession {
    let s = this.sessions.get(chatId)
    if (!s) {
      s = { id: chatId, title: 'New chat', workspace: getRoot(), history: [], ui: [], createdAt: Date.now(), updatedAt: Date.now() }
      this.sessions.set(chatId, s)
    }
    return s
  }

  isRunning(chatId: string): boolean {
    return this.running.has(chatId)
  }

  stop(chatId: string): void {
    this.running.get(chatId)?.abort()
  }

  resolveApproval(requestId: string, decision: Decision): void {
    this.approvals.get(requestId)?.(decision)
    this.approvals.delete(requestId)
  }

  private waitForApproval(requestId: string, signal: AbortSignal): Promise<Decision> {
    return new Promise((resolve) => {
      const onAbort = () => {
        this.approvals.delete(requestId)
        resolve('deny')
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.approvals.set(requestId, (d) => {
        signal.removeEventListener('abort', onAbort)
        resolve(d)
      })
    })
  }

  async send(req: SendMessageRequest): Promise<void> {
    const s = this.session(req.chatId)
    if (this.running.has(req.chatId)) throw new Error('This chat is already running.')
    const emit = (e: AgentEvent) => this.hooks.emit(req.chatId, e)
    const settings = loadSettings()
    const provider = getProvider(settings.activeProviderId)
    if (!provider) throw new Error('No model provider selected. Pick one in Settings.')
    const model = settings.activeModel
    const controller = new AbortController()
    this.running.set(req.chatId, controller)
    if (s.title === 'New chat') s.title = req.text.replace(/\s+/g, ' ').slice(0, 60) || 'New chat'

    const root = getRoot()
    const contextText = req.attachments
      .map((a) => {
        const range = a.startLine ? ` lines="${a.startLine}-${a.endLine}"` : ''
        return `<${a.kind} path="${relPath(a.path)}"${range}>\n${a.content}\n</${a.kind}>`
      })
      .join('\n\n')

    try {
      if (provider.kind === 'claude-code') {
        const built = await buildSystemPrompt({ mode: req.mode, compact: false, claudeCode: true })
        await runClaudeCode({
          prompt: contextText ? `${contextText}\n\n${req.text}` : req.text,
          cwd: root ?? homedir(),
          model,
          sessionId: s.claudeSessionId,
          permissionMode: settings.permissionMode,
          chatMode: req.mode,
          appendSystemPrompt: built.system,
          signal: controller.signal,
          emit,
          onSession: (id) => (s.claudeSessionId = id)
        })
        emit({ type: 'done' })
        return
      }

      const compact = provider.kind !== 'anthropic' && isLocalUrl(provider.baseUrl)
      const systemKey = `${req.mode}|${compact}`
      if (s.systemKey !== systemKey || !s.system) {
        const built = await buildSystemPrompt({ mode: req.mode, compact })
        s.system = built.system
        s.systemKey = systemKey
      }

      const parts: NPart[] = []
      if (s.history.length === 0 && root) {
        const overview = await workspaceOverview()
        if (overview) parts.push({ type: 'text', text: `<workspace_top_level>\n${overview}\n</workspace_top_level>` })
      }
      if (contextText) parts.push({ type: 'text', text: contextText })
      parts.push({ type: 'text', text: req.text })
      s.history.push({ role: 'user', parts })

      const omitWeb = provider.kind === 'anthropic' && settings.claudeServerWebSearch && supportsServerWeb(model)
      const tools = selectTools({ mode: req.mode, hasWorkspace: Boolean(root), omitWeb })
      const specs = toSpecs(tools)
      const allowed = this.alwaysAllow.get(req.chatId) ?? new Set<string>()
      this.alwaysAllow.set(req.chatId, allowed)

      let totalIn = 0
      let totalOut = 0
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (controller.signal.aborted) break
        emit({ type: 'turn_start' })
        const result = await runTurn(provider.kind, {
          provider,
          model,
          system: s.system!,
          messages: s.history,
          tools: specs,
          effort: settings.effort,
          signal: controller.signal,
          ollamaNumCtx: settings.ollamaNumCtx,
          serverWebSearch: omitWeb,
          onText: (delta) => emit({ type: 'text', delta }),
          onThinking: (delta) => emit({ type: 'thinking', delta }),
          onToolStart: (id, name) => emit({ type: 'tool_start', id, name }),
          onServerTool: (id, name, input) => {
            emit({ type: 'tool_start', id, name, server: true })
            emit({ type: 'tool_input', id, name, input })
          },
          onServerToolResult: (id, output, isError, meta) => emit({ type: 'tool_result', id, output, isError, meta }),
          onNotice: (level, text) => emit({ type: 'notice', level, text }),
          onUsage: (i, o, c) => {
            totalIn = i
            totalOut += o
            emit({ type: 'usage', inputTokens: totalIn, outputTokens: totalOut, cacheRead: c })
          }
        })
        s.history.push(result.message)
        if (result.stopReason === 'pause_turn') continue

        const calls = result.message.parts.filter((p): p is Extract<NPart, { type: 'tool_call' }> => p.type === 'tool_call')
        if (calls.length === 0) break

        // Every tool call must get a result, even when we stop early.
        const results = new Map<string, ToolOutcome>()
        try {
          if (result.stopReason === 'max_tokens' || result.stopReason === 'refusal') {
            for (const c of calls) results.set(c.id, { output: 'Not run: the response was cut off before this tool call was complete.', isError: true })
            emit({ type: 'error', message: 'The model ran out of output tokens while writing a tool call.' })
            break
          }
          const runOne = async (call: (typeof calls)[number]) => {
            emit({ type: 'tool_input', id: call.id, name: call.name, input: call.input })
            const tool = findTool(call.name)
            if (!tool || !tools.includes(tool)) {
              const out = { output: `Unknown or unavailable tool: ${call.name}`, isError: true }
              results.set(call.id, out)
              emit({ type: 'tool_result', id: call.id, ...out })
              return
            }
            if (needsApproval(tool, settings.permissionMode) && !allowed.has(tool.name)) {
              const requestId = randomUUID()
              emit({ type: 'approval', requestId, toolId: call.id, name: call.name, input: call.input })
              const decision = await this.waitForApproval(requestId, controller.signal)
              if (decision === 'always') allowed.add(tool.name)
              if (decision === 'deny') {
                const out = { output: controller.signal.aborted ? 'Cancelled.' : 'The user declined this action. Ask them how to proceed or try a different approach.', isError: true }
                results.set(call.id, out)
                emit({ type: 'tool_result', id: call.id, ...out })
                return
              }
            }
            const outcome = await executeTool(tool, call.input, {
              signal: controller.signal,
              emitOutput: (delta) => emit({ type: 'tool_output', id: call.id, delta }),
              openFile: this.hooks.openFile,
              setPlan: (items: PlanItem[]) => emit({ type: 'plan', items }),
              fileChanged: this.hooks.fileChanged
            })
            results.set(call.id, outcome)
            emit({ type: 'tool_result', id: call.id, output: outcome.output, isError: Boolean(outcome.isError), meta: outcome.meta })
          }
          const parallelSafe = calls.every((c) => {
            const t = findTool(c.name)
            return t && (t.category === 'read' || t.category === 'web')
          })
          if (parallelSafe) await Promise.all(calls.map(runOne))
          else for (const call of calls) {
            if (controller.signal.aborted) break
            await runOne(call)
          }
        } finally {
          s.history.push({
            role: 'user',
            parts: calls.map((c) => {
              const r = results.get(c.id) ?? { output: 'Cancelled by the user.', isError: true }
              // Server-side image/diff metadata stays in the UI; the model gets text.
              return { type: 'tool_result' as const, id: c.id, content: r.output, isError: r.isError }
            })
          })
        }
        if (turn === MAX_TURNS - 1) emit({ type: 'notice', level: 'warn', text: `Stopped after ${MAX_TURNS} steps. Send "continue" to keep going.` })
      }
      emit({ type: 'done' })
    } catch (err) {
      if (controller.signal.aborted) emit({ type: 'done', stopReason: 'aborted' })
      else {
        emit({ type: 'error', message: err instanceof Error ? err.message : String(err) })
        emit({ type: 'done', stopReason: 'error' })
      }
    } finally {
      this.running.delete(req.chatId)
      s.updatedAt = Date.now()
      await this.persist(s)
    }
  }

  // ---------- persistence ----------

  private async persist(s: ChatSession): Promise<void> {
    if (s.history.length === 0 && s.ui.length === 0) return
    const file = join(chatsDir(s.workspace), `${s.id}.json`)
    await fsp.writeFile(file, JSON.stringify(s), 'utf8')
  }

  async saveUi(chatId: string, ui: UiMessage[]): Promise<void> {
    const s = this.session(chatId)
    s.ui = ui
    if (!this.running.has(chatId)) await this.persist(s)
  }

  async list(): Promise<ChatSummary[]> {
    const dir = chatsDir(getRoot())
    const out: ChatSummary[] = []
    for (const f of await fsp.readdir(dir)) {
      if (!f.endsWith('.json')) continue
      try {
        const s = JSON.parse(await fsp.readFile(join(dir, f), 'utf8')) as ChatSession
        out.push({ id: s.id, title: s.title, updatedAt: s.updatedAt })
      } catch {
        /* skip corrupt file */
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async load(chatId: string): Promise<UiMessage[]> {
    const cached = this.sessions.get(chatId)
    if (cached) return cached.ui
    const file = join(chatsDir(getRoot()), `${chatId}.json`)
    if (!existsSync(file)) return []
    const s = JSON.parse(await fsp.readFile(file, 'utf8')) as ChatSession
    this.sessions.set(chatId, s)
    return s.ui
  }

  async remove(chatId: string): Promise<void> {
    this.sessions.delete(chatId)
    const file = join(chatsDir(getRoot()), `${chatId}.json`)
    if (existsSync(file)) await fsp.unlink(file)
  }

  // ---------- one-shot completions ----------

  private complete(provider: ProviderConfig, model: string, system: string, prompt: string, maxTokens: number, signal: AbortSignal, onText?: (d: string) => void): Promise<string> {
    const numCtx = loadSettings().ollamaNumCtx
    switch (provider.kind) {
      case 'anthropic':
        return anthropicComplete({ provider, model, system, prompt, maxTokens, signal, onText, ollamaNumCtx: numCtx })
      case 'ollama':
        return ollamaComplete({ provider, model, system, prompt, maxTokens, signal, onText, ollamaNumCtx: numCtx })
      case 'openai':
        return openAIComplete({ provider, model, system, prompt, maxTokens, signal, onText, ollamaNumCtx: numCtx })
      case 'claude-code':
        return claudeCodeComplete(prompt, system, model, getRoot() ?? homedir(), signal)
    }
  }

  /** One-shot question to the active model (used by the Learn tab's tutor). */
  async ask(system: string, prompt: string, maxTokens = 4000): Promise<string> {
    const settings = loadSettings()
    const provider = getProvider(settings.activeProviderId)
    if (!provider) throw new Error('No model selected. Pick one in Settings → Models.')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 180000)
    try {
      return await this.complete(provider, settings.activeModel, system, prompt, maxTokens, controller.signal)
    } finally {
      clearTimeout(timer)
    }
  }

  private inflight = new Map<string, AbortController>()

  cancelRequest(requestId: string): void {
    this.inflight.get(requestId)?.abort()
    this.inflight.delete(requestId)
  }

  async inlineEdit(req: InlineEditRequest, onText: (d: string) => void): Promise<string> {
    const settings = loadSettings()
    const provider = getProvider(settings.activeProviderId)
    if (!provider) throw new Error('No model selected.')
    const controller = new AbortController()
    this.inflight.set(req.requestId, controller)
    const system =
      'You are a precise code editing engine inside an IDE. Rewrite the code in <selection> according to the instruction. Output ONLY the replacement code for the selection — no explanations, no Markdown fences. Preserve indentation and the surrounding style. If the selection is empty, output the code to insert at that position.'
    const prompt = `File: ${relPath(req.filePath)} (${req.language})\n\n<before>\n${req.prefix}\n</before>\n<selection>\n${req.selection}\n</selection>\n<after>\n${req.suffix}\n</after>\n\nInstruction: ${req.instruction}`
    try {
      const out = await this.complete(provider, settings.activeModel, system, prompt, 8000, controller.signal, onText)
      return stripFences(out)
    } finally {
      this.inflight.delete(req.requestId)
    }
  }

  async autocomplete(req: CompletionRequest): Promise<string> {
    const settings = loadSettings()
    if (!settings.autocomplete.enabled) return ''
    const provider = getProvider(settings.autocomplete.providerId)
    const model = settings.autocomplete.model
    if (!provider || !model || provider.kind === 'claude-code') return ''
    this.cancelRequest('autocomplete')
    const controller = new AbortController()
    this.inflight.set('autocomplete', controller)
    try {
      // The Learn sandbox runs Prism's graphics library, which the model can't otherwise know about.
      const graphics = /^sandbox-graphics\./.test(req.filePath)
      const library = graphics
        ? `\n\nThe program uses this built-in library (no imports needed, not turtle/pygame/matplotlib):\n${GRAPHICS_CHEATSHEET[req.language === 'python' ? 'python' : 'javascript']}`
        : ''
      // Fill-in-the-middle is the fast path: one short request, no chat template. Models
      // without FIM support are remembered so we don't pay for a failed attempt every keystroke.
      if (provider.kind === 'ollama' && fimSupport.get(model) !== false) {
        const mark = req.language === 'python' ? '# ' : req.language === 'lua' || req.language === 'sql' ? '-- ' : '// '
        const header = graphics
          ? GRAPHICS_CHEATSHEET[req.language === 'python' ? 'python' : 'javascript']
              .split('\n')
              .map((l) => mark + l)
              .join('\n') + '\n\n'
          : ''
        try {
          const fim = await ollamaFim(provider, model, header + req.prefix, req.suffix, controller.signal)
          fimSupport.set(model, true)
          return cleanCompletion(fim, req.prefix)
        } catch (err) {
          if (controller.signal.aborted) return ''
          if (/insert|suffix/i.test(err instanceof Error ? err.message : String(err))) fimSupport.set(model, false)
          else return ''
        }
      }
      const system =
        'You are a code completion engine inside an editor. Reply with ONLY the code to insert at <CURSOR>: no explanations, no Markdown, no repetition of code that is already there. Complete the current statement, or at most a few lines.' +
        library
      // Chat models are slower, so send less context and ask for fewer tokens.
      const prefix = req.prefix.slice(-1500)
      const prompt = `File: ${req.filePath.startsWith('sandbox-') ? req.filePath : relPath(req.filePath)} (${req.language})\n\n${prefix}<CURSOR>${req.suffix.slice(0, 500)}`
      return cleanCompletion(await this.complete(provider, model, system, prompt, 48, controller.signal), req.prefix)
    } catch {
      return ''
    } finally {
      this.inflight.delete('autocomplete')
    }
  }

  /** Loads the autocomplete model ahead of time (local models take seconds to load). */
  async warmAutocomplete(): Promise<void> {
    const ac = loadSettings().autocomplete
    if (!ac.enabled || !ac.model) return
    const provider = getProvider(ac.providerId)
    if (provider?.kind === 'ollama') await ollamaWarm(provider, ac.model).catch(() => {})
  }
}

const fimSupport = new Map<string, boolean>()

/**
 * Small models often wrap completions in prose or fences, or repeat the code before
 * the cursor. Keep only the new code, a few lines at most.
 */
function cleanCompletion(raw: string, prefix = ''): string {
  let s = raw.replace(/\r/g, '')
  const fence = s.match(/```[\w+-]*\n([\s\S]*?)(?:```|$)/)
  if (fence) s = fence[1]
  // Drop leading sentences such as "Here is how you can…:".
  s = s.replace(/^(?:[A-Z][a-z][^\n]*[:.]\s*\n+)+/, '')
  const first = s.trim().split('\n')[0] ?? ''
  if (/^[A-Z][a-z]+(?: [a-z]+){3,}/.test(first) && !/[=(){}]/.test(first)) return ''
  // If the model rewrote the line being typed, continue from where the user is.
  const line = prefix.slice(prefix.lastIndexOf('\n') + 1)
  const typed = line.trim()
  if (typed) {
    const at = s.indexOf(typed)
    if (at >= 0) s = s.slice(at + typed.length)
  } else {
    // Starting a fresh line: skip comment lines the model added to explain itself.
    s = s.replace(/^\s*(#|\/\/|--)[^\n]*\n/, '')
    if (line && s.startsWith(line)) s = s.slice(line.length)
  }
  // Remove any overlap with the very end of what is already typed.
  for (let k = Math.min(80, s.length, prefix.length); k > 0; k--) {
    if (prefix.endsWith(s.slice(0, k))) {
      s = s.slice(k)
      break
    }
  }
  return s.split('\n').slice(0, 4).join('\n').replace(/\s+$/, '')
}

function stripFences(s: string): string {
  const m = s.match(/^\s*```[\w+-]*\n([\s\S]*?)\n?```\s*$/)
  return m ? m[1] : s
}
