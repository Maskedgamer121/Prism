import type { AgentEvent, ChatMode, ContextAttachment, SlashCommand, UiBlock, UiMessage } from '@shared/types'
import { useApp, newId, toast, errorText, updateSettings, joinPath, relToWorkspace } from '../store'
import { BUILTIN_COMMANDS } from './commands'
import { activeFilePath, activeSelection, getActiveEditor, openFile } from './editor'
import { absPath, addReview } from './review'

let customCommands: SlashCommand[] = []

export async function refreshCustomCommands(): Promise<void> {
  try {
    customCommands = await window.prism.commands.custom()
  } catch {
    customCommands = []
  }
}

export function allCommands(): SlashCommand[] {
  const names = new Set(customCommands.map((c) => c.name))
  return [...customCommands, ...BUILTIN_COMMANDS.filter((c) => !names.has(c.name))]
}

// ---------- event reducer ----------

function lastAssistant(messages: UiMessage[]): [UiMessage[], UiMessage] {
  const last = messages[messages.length - 1]
  if (last && last.role === 'assistant') {
    const copy = { ...last, blocks: [...last.blocks] }
    return [[...messages.slice(0, -1), copy], copy]
  }
  const msg: UiMessage = { id: newId(), role: 'assistant', blocks: [], model: useApp.getState().settings?.activeModel }
  return [[...messages, msg], msg]
}

function findTool(msg: UiMessage, id: string): number {
  return msg.blocks.findIndex((b) => b.kind === 'tool' && b.id === id)
}

function apply(messages: UiMessage[], e: AgentEvent): UiMessage[] {
  if (e.type === 'usage' || e.type === 'done' || e.type === 'turn_start') {
    return e.type === 'turn_start' ? lastAssistant(messages)[0] : messages
  }
  const [next, msg] = lastAssistant(messages)
  const blocks = msg.blocks
  const tail = blocks[blocks.length - 1]
  switch (e.type) {
    case 'text':
      if (tail?.kind === 'text') blocks[blocks.length - 1] = { ...tail, text: tail.text + e.delta }
      else blocks.push({ kind: 'text', text: e.delta })
      break
    case 'thinking':
      if (tail?.kind === 'thinking') blocks[blocks.length - 1] = { ...tail, text: tail.text + e.delta }
      else blocks.push({ kind: 'thinking', text: e.delta })
      break
    case 'tool_start':
      if (findTool(msg, e.id) < 0) blocks.push({ kind: 'tool', id: e.id, name: e.name, status: 'pending', server: e.server })
      break
    case 'tool_input': {
      const i = findTool(msg, e.id)
      if (i < 0) blocks.push({ kind: 'tool', id: e.id, name: e.name, input: e.input, status: 'running' })
      else {
        const b = blocks[i] as Extract<UiBlock, { kind: 'tool' }>
        blocks[i] = { ...b, input: e.input, status: b.status === 'pending' ? 'running' : b.status }
      }
      break
    }
    case 'tool_output': {
      const i = findTool(msg, e.id)
      if (i >= 0) {
        const b = blocks[i] as Extract<UiBlock, { kind: 'tool' }>
        const out = (b.output ?? '') + e.delta
        blocks[i] = { ...b, status: 'running', output: out.length > 40000 ? out.slice(-40000) : out }
      }
      break
    }
    case 'tool_result': {
      const i = findTool(msg, e.id)
      if (i >= 0) {
        const b = blocks[i] as Extract<UiBlock, { kind: 'tool' }>
        const denied = b.status === 'denied'
        blocks[i] = { ...b, output: e.output, meta: e.meta ?? b.meta, status: denied ? 'denied' : e.isError ? 'error' : 'done', approvalId: undefined }
      }
      break
    }
    case 'approval': {
      const i = findTool(msg, e.toolId)
      if (i >= 0) {
        const b = blocks[i] as Extract<UiBlock, { kind: 'tool' }>
        blocks[i] = { ...b, input: e.input, status: 'awaiting', approvalId: e.requestId }
      } else blocks.push({ kind: 'tool', id: e.toolId, name: e.name, input: e.input, status: 'awaiting', approvalId: e.requestId })
      break
    }
    case 'plan': {
      const i = blocks.findIndex((b) => b.kind === 'plan')
      if (i >= 0) blocks[i] = { kind: 'plan', items: e.items }
      else blocks.push({ kind: 'plan', items: e.items })
      break
    }
    case 'notice':
      blocks.push({ kind: 'notice', level: e.level, text: e.text })
      break
    case 'error':
      blocks.push({ kind: 'notice', level: 'error', text: e.message })
      break
  }
  return next
}

let queue: { chatId: string; e: AgentEvent }[] = []
let scheduled = false

function flush(): void {
  scheduled = false
  const events = queue
  queue = []
  const s = useApp.getState()
  let messages = s.messages
  let running = s.running
  let usage = s.usage
  let plan = s.plan
  let finished = false
  for (const { chatId, e } of events) {
    if (chatId !== s.chatId) continue
    messages = apply(messages, e)
    if (e.type === 'usage') usage = { input: e.inputTokens, output: e.outputTokens, cacheRead: e.cacheRead }
    if (e.type === 'plan') plan = e.items
    // AI file edits go into review: highlighted in the editor until accepted or rejected.
    if (e.type === 'tool_result' && !e.isError && e.meta?.path && e.meta.before !== undefined && e.meta.after !== undefined) {
      const path = absPath(e.meta.path)
      addReview(path, e.meta.before)
      void openFile(path)
    }
    if (e.type === 'done') {
      running = false
      finished = true
    }
  }
  useApp.setState({ messages, running, usage, plan })
  if (finished) void persist()
}

export function initChatEvents(): () => void {
  return window.prism.agent.onEvent((chatId, e) => {
    queue.push({ chatId, e })
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(flush)
    }
  })
}

async function persist(): Promise<void> {
  const { chatId, messages } = useApp.getState()
  if (!messages.length) return
  await window.prism.chats.save(chatId, messages)
  useApp.setState({ chatList: await window.prism.chats.list() })
}

// ---------- actions ----------

function localReply(text: string): void {
  useApp.setState((s) => ({ messages: [...s.messages, { id: newId(), role: 'assistant', blocks: [{ kind: 'text', text }] }] }))
}

function helpText(): string {
  const cmds = allCommands()
    .map((c) => `| \`/${c.name}\` | ${c.description}${c.source === 'project' ? ' *(project)*' : ''} |`)
    .join('\n')
  return `### Slash commands\n| Command | What it does |\n|---|---|\n${cmds}\n\nAdd your own: put Markdown files in \`.prism/commands/\` (or \`.claude/commands/\`) in your project — the file name becomes the command and \`$ARGUMENTS\` is replaced by what you type after it.\n\n### Context\n- Type \`@\` to attach a file. Selected code is attached automatically.\n- **Ctrl+L** adds the editor selection to chat, **Ctrl+K** edits code inline, **Ctrl+I** toggles this panel.\n\n### Modes\n- **Agent** — reads, edits files and runs commands.\n- **Ask** — answers and researches, read-only.\n- **Plan** — investigates and writes a step-by-step plan.`
}

async function expandMentions(text: string): Promise<ContextAttachment[]> {
  const { workspace, fileList } = useApp.getState()
  if (!workspace) return []
  const out: ContextAttachment[] = []
  const seen = new Set<string>()
  for (const m of text.matchAll(/@([\w.\-/\\]+[\w])/g)) {
    const rel = m[1].replace(/\\/g, '/')
    const match = fileList.find((f) => f === rel) ?? fileList.find((f) => f.endsWith('/' + rel))
    if (!match || seen.has(match)) continue
    seen.add(match)
    const abs = joinPath(workspace, match)
    try {
      const file = await window.prism.fs.readFile(abs)
      if (!file.isBinary && !file.tooLarge) out.push({ kind: 'file', path: abs, content: file.content.slice(0, 80000) })
    } catch {
      /* skip */
    }
  }
  return out
}

export async function sendMessage(raw: string): Promise<void> {
  const s = useApp.getState()
  let text = raw.trim()
  if (!text || s.running) return
  let mode: ChatMode = s.chatMode

  if (text.startsWith('/')) {
    const [, name, args = ''] = text.match(/^\/([\w-]+)\s*([\s\S]*)$/) ?? []
    const cmd = allCommands().find((c) => c.name === name)
    if (!cmd) {
      toast(`Unknown command /${name}. Type /help for the list.`, 'error')
      return
    }
    if (cmd.action) {
      await runAction(cmd.action, args.trim())
      return
    }
    const template = cmd.template ?? '$ARGUMENTS'
    text = template.includes('$ARGUMENTS') ? template.replace(/\$ARGUMENTS/g, args.trim()) : `${template}\n\n${args}`.trim()
    if (cmd.mode) mode = cmd.mode
  }

  const attachments: ContextAttachment[] = [...s.attachments, ...(await expandMentions(raw))]
  const sel = activeSelection()
  if (sel && !attachments.some((a) => a.kind === 'selection' && a.path === sel.path && a.startLine === sel.startLine)) {
    attachments.push({ kind: 'selection', path: sel.path, content: sel.text, startLine: sel.startLine, endLine: sel.endLine })
  }
  const active = activeFilePath()
  if (s.includeActiveFile && active && !attachments.some((a) => a.path === active)) {
    const pos = getActiveEditor()?.getPosition()
    text = `${text}\n\n(I'm currently viewing ${relToWorkspace(active)}${pos ? `, cursor at line ${pos.lineNumber}` : ''}.)`
  }

  const userMsg: UiMessage = {
    id: newId(),
    role: 'user',
    blocks: [{ kind: 'text', text: raw.trim() }],
    attachments: attachments.map((a) => ({ path: relToWorkspace(a.path), kind: a.kind }))
  }
  useApp.setState({ messages: [...s.messages, userMsg], running: true, attachments: [], composerDraft: null })
  try {
    await window.prism.agent.send({ chatId: s.chatId, text, attachments, mode })
  } catch (err) {
    useApp.setState({ running: false })
    toast(errorText(err), 'error')
  }
}

async function runAction(action: NonNullable<SlashCommand['action']>, args: string): Promise<void> {
  const s = useApp.getState()
  switch (action) {
    case 'clear':
      newChat()
      break
    case 'help':
      localReply(helpText())
      break
    case 'settings':
      useApp.setState({ settingsOpen: true })
      break
    case 'terminal':
      useApp.setState({ showPanel: !s.showPanel })
      break
    case 'mode':
      if (args === 'agent' || args === 'ask' || args === 'plan') {
        useApp.setState({ chatMode: args })
        toast(`Mode: ${args}`)
      } else toast('Usage: /mode agent | ask | plan', 'error')
      break
    case 'model': {
      const settings = s.settings
      if (!settings) return
      if (!args) {
        localReply(
          settings.providers
            .filter((p) => p.enabled)
            .map((p) => `**${p.name}**: ${p.models.length ? p.models.map((m) => `\`${m}\``).join(', ') : '_no models — open Settings to refresh_'}`)
            .join('\n\n')
        )
        return
      }
      const provider = settings.providers.find((p) => p.enabled && p.models.includes(args))
      if (!provider) {
        toast(`No enabled provider has a model named ${args}`, 'error')
        return
      }
      await updateSettings({ activeProviderId: provider.id, activeModel: args })
      toast(`Model: ${args}`)
      break
    }
    case 'compact':
      break
  }
}

export function stopChat(): void {
  void window.prism.agent.stop(useApp.getState().chatId)
}

export function newChat(): void {
  const s = useApp.getState()
  if (s.running) void window.prism.agent.stop(s.chatId)
  useApp.setState({ chatId: newId(), messages: [], running: false, usage: null, plan: [], attachments: [], composerFocus: s.composerFocus + 1 })
}

export async function loadChat(id: string): Promise<void> {
  const current = useApp.getState()
  if (current.running && current.chatId !== id) void window.prism.agent.stop(current.chatId)
  const messages = await window.prism.chats.load(id)
  const plan = [...messages].reverse().flatMap((m) => m.blocks).find((b) => b.kind === 'plan')
  useApp.setState({ chatId: id, messages, running: false, usage: null, plan: plan?.kind === 'plan' ? plan.items : [] })
}

export async function deleteChat(id: string): Promise<void> {
  await window.prism.chats.remove(id)
  if (useApp.getState().chatId === id) newChat()
  useApp.setState({ chatList: await window.prism.chats.list() })
}

export function respondApproval(requestId: string, decision: 'allow' | 'always' | 'deny'): void {
  useApp.setState((s) => ({
    messages: s.messages.map((m) => ({
      ...m,
      blocks: m.blocks.map((b) =>
        b.kind === 'tool' && b.approvalId === requestId ? { ...b, status: decision === 'deny' ? ('denied' as const) : ('running' as const), approvalId: undefined } : b
      )
    }))
  }))
  void window.prism.agent.approve(requestId, decision)
}

export function addSelectionToChat(): void {
  const sel = activeSelection()
  const s = useApp.getState()
  if (sel) {
    useApp.setState({
      attachments: [...s.attachments, { kind: 'selection', path: sel.path, content: sel.text, startLine: sel.startLine, endLine: sel.endLine }],
      showChat: true,
      composerFocus: s.composerFocus + 1
    })
  } else {
    useApp.setState({ showChat: true, composerFocus: s.composerFocus + 1 })
  }
}

export function askAbout(text: string): void {
  const s = useApp.getState()
  useApp.setState({ showChat: true, composerDraft: text, composerFocus: s.composerFocus + 1 })
}
