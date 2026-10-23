import { spawn, execFileSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import type { AgentEvent, ChatMode, PermissionMode, ToolMeta } from '@shared/types'

/**
 * Bridges to the Claude Code CLI in headless mode (`claude -p --output-format
 * stream-json`). This lets people use their Claude subscription: Claude Code
 * runs its own tools (Read, Edit, Bash, WebSearch, …) and we render its stream.
 */

let cachedPath: string | null | undefined

export function findClaudeCli(): string | null {
  if (cachedPath !== undefined) return cachedPath
  const candidates: string[] = []
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const found = execFileSync(cmd, ['claude'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    candidates.push(...found.split(/\r?\n/).filter(Boolean))
  } catch {
    /* not on PATH */
  }
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude'
  candidates.push(join(homedir(), '.local', 'bin', exe), join(homedir(), '.claude', 'local', exe))
  if (process.platform === 'win32') candidates.push(join(process.env.APPDATA ?? '', 'npm', 'claude.cmd'))
  // Prefer real executables; .cmd shims need a shell.
  const sorted = candidates.sort((a, b) => Number(b.endsWith('.exe')) - Number(a.endsWith('.exe')))
  cachedPath = sorted.find((c) => existsSync(c)) ?? null
  return cachedPath
}

interface RunOptions {
  prompt: string
  cwd: string
  model: string
  sessionId?: string
  permissionMode: PermissionMode
  chatMode: ChatMode
  appendSystemPrompt: string
  signal: AbortSignal
  emit: (e: AgentEvent) => void
  onSession: (id: string) => void
}

function permissionFlag(mode: PermissionMode, chatMode: ChatMode): string {
  if (chatMode === 'plan' || chatMode === 'ask') return 'plan'
  if (mode === 'full-auto') return 'bypassPermissions'
  if (mode === 'auto-edit') return 'acceptEdits'
  return 'default'
}

function toolMeta(name: string, input: Record<string, unknown>): ToolMeta | undefined {
  const path = (input.file_path ?? input.path ?? input.notebook_path) as string | undefined
  if (path && /^(Edit|Write|MultiEdit|NotebookEdit|Read)$/.test(name)) return { path }
  if (name === 'WebFetch' && typeof input.url === 'string') return { url: input.url }
  return undefined
}

function readIfExists(path: string): string | null {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null
  } catch {
    return null
  }
}

function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c: { type?: string; text?: string }) => (c.type === 'text' ? c.text : c.type === 'image' ? '[image]' : ''))
      .join('\n')
  }
  return content == null ? '' : JSON.stringify(content)
}

export function runClaudeCode(opts: RunOptions): Promise<void> {
  const cli = findClaudeCli()
  if (!cli) {
    return Promise.reject(
      new Error('Claude Code CLI not found. Install it from https://claude.com/claude-code (or `npm i -g @anthropic-ai/claude-code`), then sign in by running `claude` once in a terminal.')
    )
  }
  const promptFile = join(tmpdir(), `prism-append-${process.pid}.md`)
  writeFileSync(promptFile, opts.appendSystemPrompt)

  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode', permissionFlag(opts.permissionMode, opts.chatMode),
    '--append-system-prompt-file', promptFile
  ]
  if (opts.model && opts.model !== 'default') args.push('--model', opts.model)
  if (opts.sessionId) args.push('--resume', opts.sessionId)

  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, {
      cwd: opts.cwd,
      shell: cli.endsWith('.cmd'),
      env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'prism-ide' },
      windowsHide: true
    })
    const onAbort = () => child.kill()
    opts.signal.addEventListener('abort', onAbort, { once: true })

    let buf = ''
    let stderr = ''
    let sawPartial = false
    const toolNames = new Map<string, string>()
    const toolInputs = new Map<string, Record<string, unknown>>()
    const beforeEdit = new Map<string, string | null>()
    const startedTools = new Set<string>()

    const handle = (msg: Record<string, any>) => {
      switch (msg.type) {
        case 'system':
          if (msg.subtype === 'init' && msg.session_id) opts.onSession(msg.session_id)
          break
        case 'stream_event': {
          sawPartial = true
          const ev = msg.event
          if (ev?.type === 'content_block_start' && ev.content_block?.type === 'tool_use') {
            const b = ev.content_block
            toolNames.set(b.id, b.name)
            startedTools.add(b.id)
            opts.emit({ type: 'tool_start', id: b.id, name: b.name })
          } else if (ev?.type === 'content_block_delta') {
            if (ev.delta?.type === 'text_delta') opts.emit({ type: 'text', delta: ev.delta.text })
            else if (ev.delta?.type === 'thinking_delta') opts.emit({ type: 'thinking', delta: ev.delta.thinking })
          } else if (ev?.type === 'message_start') {
            opts.emit({ type: 'turn_start' })
          }
          break
        }
        case 'assistant': {
          for (const block of msg.message?.content ?? []) {
            if (block.type === 'text' && !sawPartial) opts.emit({ type: 'text', delta: block.text })
            else if (block.type === 'tool_use') {
              toolNames.set(block.id, block.name)
              if (!startedTools.has(block.id)) {
                startedTools.add(block.id)
                opts.emit({ type: 'tool_start', id: block.id, name: block.name })
              }
              toolInputs.set(block.id, block.input ?? {})
              // Remember the file as it was, so the edit can be reviewed (accepted or rejected) in the editor.
              const target = block.input?.file_path ?? block.input?.notebook_path
              if (typeof target === 'string' && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(block.name) && !beforeEdit.has(block.id)) {
                beforeEdit.set(block.id, readIfExists(target))
              }
              opts.emit({ type: 'tool_input', id: block.id, name: block.name, input: block.input })
              if (block.name === 'TodoWrite' && Array.isArray(block.input?.todos)) {
                opts.emit({
                  type: 'plan',
                  items: block.input.todos.map((t: { content: string; status: string }) => ({
                    content: t.content,
                    status: t.status === 'completed' ? 'completed' : t.status === 'in_progress' ? 'in_progress' : 'pending'
                  }))
                })
              }
            }
          }
          break
        }
        case 'user': {
          const content = msg.message?.content
          if (!Array.isArray(content)) break
          for (const block of content) {
            if (block.type !== 'tool_result') continue
            const name = toolNames.get(block.tool_use_id) ?? ''
            const input = toolInputs.get(block.tool_use_id) ?? {}
            let meta = toolMeta(name, input)
            if (beforeEdit.has(block.tool_use_id) && meta?.path && !block.is_error) {
              const after = readIfExists(meta.path)
              if (after !== null) meta = { ...meta, before: beforeEdit.get(block.tool_use_id) ?? null, after }
            }
            opts.emit({
              type: 'tool_result',
              id: block.tool_use_id,
              output: resultText(block.content),
              isError: Boolean(block.is_error),
              meta
            })
          }
          break
        }
        case 'result': {
          const u = msg.usage ?? {}
          opts.emit({
            type: 'usage',
            inputTokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
            outputTokens: u.output_tokens ?? 0,
            cacheRead: u.cache_read_input_tokens ?? 0
          })
          if (Array.isArray(msg.permission_denials) && msg.permission_denials.length) {
            const names = Array.from(new Set(msg.permission_denials.map((d: { tool_name: string }) => d.tool_name))).join(', ')
            opts.emit({
              type: 'notice',
              level: 'warn',
              text: `Claude Code was blocked from using: ${names}. It can't pause to ask for approval, so switch permissions to "Auto-edit" or "Full auto" to let it make changes.`
            })
          }
          if (msg.is_error && msg.result) opts.emit({ type: 'error', message: String(msg.result) })
          break
        }
      }
    }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buf += chunk
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue
        try {
          handle(JSON.parse(line))
        } catch {
          /* ignore non-JSON lines */
        }
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (d: string) => (stderr += d))
    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      opts.signal.removeEventListener('abort', onAbort)
      if (opts.signal.aborted) return resolve()
      if (code === 0) return resolve()
      const hint = /login|auth|credential/i.test(stderr) ? ' Run `claude` in a terminal once to sign in.' : ''
      reject(new Error(`Claude Code exited with code ${code}. ${stderr.trim().slice(0, 800)}${hint}`))
    })

    child.stdin.write(opts.prompt)
    child.stdin.end()
  })
}

/** One-shot completion through Claude Code (used for inline edits). */
export function claudeCodeComplete(prompt: string, system: string, model: string, cwd: string, signal: AbortSignal): Promise<string> {
  const cli = findClaudeCli()
  if (!cli) return Promise.reject(new Error('Claude Code CLI not found.'))
  const args = ['-p', '--output-format', 'json', '--tools', '', '--append-system-prompt', system]
  if (model && model !== 'default') args.push('--model', model)
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { cwd, shell: cli.endsWith('.cmd'), windowsHide: true })
    signal.addEventListener('abort', () => child.kill(), { once: true })
    let out = ''
    let err = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (d: string) => (out += d))
    child.stderr.on('data', (d: Buffer) => (err += d.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      if (signal.aborted) return reject(new Error('aborted'))
      try {
        const parsed = JSON.parse(out) as { result?: string; is_error?: boolean }
        if (parsed.is_error) return reject(new Error(parsed.result ?? 'Claude Code error'))
        resolve(parsed.result ?? '')
      } catch {
        reject(new Error(`Claude Code exited with code ${code}: ${err.slice(0, 500)}`))
      }
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}
