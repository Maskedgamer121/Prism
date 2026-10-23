import { spawn } from 'child_process'
import { existsSync, promises as fsp } from 'fs'
import { dirname, join, relative, sep } from 'path'
import { z } from 'zod'
import type { ChatMode, PermissionMode, PlanItem, ToolMeta } from '@shared/types'
import { diffStats } from '@shared/diff'
import { getRoot, globToRegExp, IGNORED_DIRS, isBinary, resolveInWorkspace, searchText, toRel, walkFiles } from '../workspace'
import { getTopic, listTopics } from './knowledge'
import { webFetch, webSearch } from './web'
import type { ToolSpec } from './types'

export type ToolCategory = 'read' | 'edit' | 'exec' | 'web' | 'meta'

export interface ToolContext {
  signal: AbortSignal
  emitOutput: (delta: string) => void
  openFile: (path: string, line?: number) => void
  setPlan: (items: PlanItem[]) => void
  fileChanged: (path: string) => void
}

export interface ToolOutcome {
  output: string
  isError?: boolean
  meta?: ToolMeta
}

interface ToolDef<S extends z.ZodType = z.ZodType> {
  name: string
  category: ToolCategory
  description: string
  input: S
  run: (input: z.infer<S>, ctx: ToolContext) => Promise<ToolOutcome>
}

const define = <S extends z.ZodType>(t: ToolDef<S>): ToolDef => t as unknown as ToolDef

const MAX_OUTPUT = 30000

function truncateMiddle(s: string, max = MAX_OUTPUT): string {
  if (s.length <= max) return s
  const half = Math.floor(max / 2)
  return `${s.slice(0, half)}\n\n[… ${s.length - max} characters omitted …]\n\n${s.slice(-half)}`
}

async function readText(abs: string): Promise<string> {
  const buf = await fsp.readFile(abs)
  if (isBinary(buf)) throw new Error(`${toRel(abs)} is a binary file.`)
  return buf.toString('utf8')
}

const readFile = define({
  name: 'read_file',
  category: 'read',
  description:
    'Read a text file from the workspace. Returns lines prefixed with line numbers. Use offset/limit to page through large files. Always read a file before editing it.',
  input: z.object({
    path: z.string().describe('File path, relative to the workspace root'),
    offset: z.number().int().min(1).optional().describe('1-based line to start from'),
    limit: z.number().int().min(1).max(5000).optional().describe('Max lines to return (default 2000)')
  }),
  async run({ path, offset, limit }) {
    const abs = resolveInWorkspace(path)
    const lines = (await readText(abs)).split(/\r?\n/)
    const start = (offset ?? 1) - 1
    const end = Math.min(lines.length, start + (limit ?? 2000))
    const body = lines
      .slice(start, end)
      .map((l, i) => `${String(start + i + 1).padStart(5)}\t${l.length > 2000 ? l.slice(0, 2000) + '…' : l}`)
      .join('\n')
    const more = end < lines.length ? `\n\n[${lines.length - end} more lines — call read_file with offset=${end + 1}]` : ''
    return { output: (body || '(empty file)') + more, meta: { path: toRel(abs) } }
  }
})

const listDir = define({
  name: 'list_dir',
  category: 'read',
  description: 'List files and folders as a tree. Skips node_modules, .git, build output and similar folders.',
  input: z.object({
    path: z.string().optional().describe('Folder relative to the workspace root (default: root)'),
    depth: z.number().int().min(1).max(6).optional().describe('How many levels to descend (default 2)')
  }),
  async run({ path, depth }) {
    const abs = resolveInWorkspace(path ?? '.')
    const lines: string[] = []
    const walk = async (dir: string, level: number, indent: string) => {
      if (lines.length > 600) return
      let entries = await fsp.readdir(dir, { withFileTypes: true })
      entries = entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      for (const e of entries) {
        if (e.name === '.git') continue
        if (e.isDirectory()) {
          const skipped = IGNORED_DIRS.has(e.name)
          lines.push(`${indent}${e.name}/${skipped ? ' (skipped)' : ''}`)
          if (!skipped && level < (depth ?? 2)) await walk(join(dir, e.name), level + 1, indent + '  ')
        } else lines.push(`${indent}${e.name}`)
      }
    }
    await walk(abs, 1, '')
    return { output: `${toRel(abs)}/\n${lines.join('\n') || '(empty)'}${lines.length > 600 ? '\n[… truncated]' : ''}` }
  }
})

const glob = define({
  name: 'glob',
  category: 'read',
  description: 'Find files by glob pattern, e.g. "**/*.tsx" or "src/**/test_*.py". Returns workspace-relative paths.',
  input: z.object({
    pattern: z.string(),
    path: z.string().optional().describe('Folder to search in (default: root)')
  }),
  async run({ pattern, path }) {
    const base = resolveInWorkspace(path ?? '.')
    const re = globToRegExp(pattern)
    const files = (await walkFiles(base)).filter((f) => re.test(f))
    const rel = files.map((f) => toRel(join(base, f)))
    return { output: rel.length ? rel.slice(0, 500).join('\n') + (rel.length > 500 ? `\n[… ${rel.length - 500} more]` : '') : 'No files matched.' }
  }
})

const grep = define({
  name: 'grep',
  category: 'read',
  description: 'Search file contents with a regular expression (JavaScript syntax). Returns path:line: text.',
  input: z.object({
    pattern: z.string().describe('Regular expression'),
    path: z.string().optional().describe('Folder to search (default: root)'),
    glob: z.string().optional().describe('Only search files matching this glob, e.g. "*.ts"'),
    case_insensitive: z.boolean().optional(),
    max_results: z.number().int().min(1).max(1000).optional()
  }),
  async run({ pattern, path, glob: g, case_insensitive, max_results }) {
    const base = resolveInWorkspace(path ?? '.')
    const hits = await searchText(pattern, { regex: true, caseSensitive: !case_insensitive, glob: g, maxResults: max_results ?? 200, base })
    if (!hits.length) return { output: 'No matches.' }
    return { output: truncateMiddle(hits.map((h) => `${toRel(h.path)}:${h.line}: ${h.text.trim()}`).join('\n')) }
  }
})

const writeFile = define({
  name: 'write_file',
  category: 'edit',
  description: 'Create a new file or completely overwrite an existing one. Prefer edit_file for changes to existing files. Creates parent folders.',
  input: z.object({ path: z.string(), content: z.string() }),
  async run({ path, content }, ctx) {
    const abs = resolveInWorkspace(path)
    const before = existsSync(abs) ? await readText(abs) : null
    await fsp.mkdir(dirname(abs), { recursive: true })
    await fsp.writeFile(abs, content, 'utf8')
    ctx.fileChanged(abs)
    const stats = diffStats(before ?? '', content)
    return {
      output: `${before === null ? 'Created' : 'Overwrote'} ${toRel(abs)} (+${stats.added} −${stats.removed})`,
      meta: { path: toRel(abs), before, after: content, ...stats }
    }
  }
})

const editFile = define({
  name: 'edit_file',
  category: 'edit',
  description:
    'Replace an exact string in a file. old_string must match the file exactly (including indentation) and be unique unless replace_all is true. Include enough surrounding lines to make it unique.',
  input: z.object({
    path: z.string(),
    old_string: z.string().min(1),
    new_string: z.string(),
    replace_all: z.boolean().optional()
  }),
  async run({ path, old_string, new_string, replace_all }, ctx) {
    const abs = resolveInWorkspace(path)
    const before = await readText(abs)
    const crlf = before.includes('\r\n')
    const text = before.replace(/\r\n/g, '\n')
    const oldS = old_string.replace(/\r\n/g, '\n')
    const newS = new_string.replace(/\r\n/g, '\n')
    const count = text.split(oldS).length - 1
    if (count === 0) {
      return { output: `old_string was not found in ${toRel(abs)}. Re-read the file and copy the text exactly, including whitespace.`, isError: true }
    }
    if (count > 1 && !replace_all) {
      return { output: `old_string appears ${count} times in ${toRel(abs)}. Add surrounding context to make it unique, or set replace_all.`, isError: true }
    }
    let next = replace_all ? text.split(oldS).join(newS) : text.replace(oldS, () => newS)
    if (crlf) next = next.replace(/\n/g, '\r\n')
    await fsp.writeFile(abs, next, 'utf8')
    ctx.fileChanged(abs)
    const stats = diffStats(before, next)
    return {
      output: `Edited ${toRel(abs)} (+${stats.added} −${stats.removed}${replace_all ? `, ${count} replacements` : ''})`,
      meta: { path: toRel(abs), before, after: next, ...stats }
    }
  }
})

function killTree(pid: number | undefined): void {
  if (!pid) return
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
  else {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      /* already gone */
    }
  }
}

export const SHELL_NAME = process.platform === 'win32' ? 'PowerShell' : 'bash'

const runCommand = define({
  name: 'run_command',
  category: 'exec',
  description: `Run a shell command (${SHELL_NAME}) in the workspace and return its output and exit code. Use for builds, tests, linters, git, package managers. Avoid interactive commands and long-running servers (they time out).`,
  input: z.object({
    command: z.string(),
    cwd: z.string().optional().describe('Working directory relative to the workspace root'),
    timeout_ms: z.number().int().min(1000).max(600000).optional().describe('Default 120000')
  }),
  async run({ command, cwd, timeout_ms }, ctx) {
    const dir = resolveInWorkspace(cwd ?? '.')
    const [shell, args] =
      process.platform === 'win32'
        ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; ${command}`]]
        : ['bash', ['-lc', command]]
    return new Promise<ToolOutcome>((resolvePromise) => {
      const child = spawn(shell, args, {
        cwd: dir,
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', CI: '1' },
        windowsHide: true,
        detached: process.platform !== 'win32'
      })
      let out = ''
      let timedOut = false
      const onData = (d: Buffer) => {
        const s = d.toString('utf8')
        out += s
        if (out.length > MAX_OUTPUT * 4) out = out.slice(-MAX_OUTPUT * 2)
        ctx.emitOutput(s)
      }
      child.stdout.on('data', onData)
      child.stderr.on('data', onData)
      const timer = setTimeout(() => {
        timedOut = true
        killTree(child.pid)
      }, timeout_ms ?? 120000)
      const onAbort = () => killTree(child.pid)
      ctx.signal.addEventListener('abort', onAbort, { once: true })
      child.on('error', (err) => {
        clearTimeout(timer)
        resolvePromise({ output: `Failed to start: ${err.message}`, isError: true })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        ctx.signal.removeEventListener('abort', onAbort)
        const clean = out.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').trim()
        const status = timedOut ? `Timed out after ${timeout_ms ?? 120000} ms` : `Exit code ${code}`
        resolvePromise({
          output: `${truncateMiddle(clean) || '(no output)'}\n\n[${status}]`,
          isError: timedOut || code !== 0,
          meta: { exitCode: code }
        })
      })
    })
  }
})

const search = define({
  name: 'web_search',
  category: 'web',
  description: 'Search the web. Returns titles, URLs and snippets. Follow up with web_fetch to read a result. Use for docs, error messages, recent library versions.',
  input: z.object({
    query: z.string(),
    max_results: z.number().int().min(1).max(15).optional()
  }),
  async run({ query, max_results }, ctx) {
    const results = await webSearch(query, max_results ?? 8, ctx.signal)
    return {
      output: results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join('\n\n'),
      meta: { results }
    }
  }
})

const fetchPage = define({
  name: 'web_fetch',
  category: 'web',
  description:
    'Fetch a web page and return it as Markdown. Set render=true for JavaScript-heavy sites (loads it in a real browser). Long pages are paged with offset.',
  input: z.object({
    url: z.string(),
    render: z.boolean().optional(),
    offset: z.number().int().min(0).optional()
  }),
  async run({ url, render, offset }, ctx) {
    const page = await webFetch(url, { render, offset }, ctx.signal)
    return { output: `# ${page.title}\nSource: ${page.url}\n\n${page.content}`, meta: { url: page.url } }
  }
})

const bestPractices = define({
  name: 'get_best_practices',
  category: 'meta',
  description:
    'Load the knowledge base of best practices for a language, framework or topic (e.g. "python", "react", "lua" for Roblox/Luau, "cpp" for Unreal, "security", "testing", "git"). Call with topic "list" to see every topic.',
  input: z.object({ topic: z.string() }),
  async run({ topic }) {
    if (topic.toLowerCase() === 'list') return { output: `Available topics: ${listTopics().join(', ')}` }
    const body = getTopic(topic)
    return body ? { output: body } : { output: `No guide for "${topic}". Available topics: ${listTopics().join(', ')}`, isError: true }
  }
})

const updatePlan = define({
  name: 'update_plan',
  category: 'meta',
  description:
    'Show the user a checklist for multi-step work. Send the whole list every time; keep exactly one item in_progress while working and mark items completed as you finish them.',
  input: z.object({
    items: z.array(z.object({ content: z.string(), status: z.enum(['pending', 'in_progress', 'completed']) })).min(1)
  }),
  async run({ items }, ctx) {
    ctx.setPlan(items)
    return { output: 'Plan updated.' }
  }
})

const openFile = define({
  name: 'open_file',
  category: 'meta',
  description: "Open a file in the user's editor, optionally at a line, to show them something.",
  input: z.object({ path: z.string(), line: z.number().int().min(1).optional() }),
  async run({ path, line }, ctx) {
    const abs = resolveInWorkspace(path)
    ctx.openFile(abs, line)
    return { output: `Opened ${toRel(abs)}` }
  }
})

const ALL_TOOLS: ToolDef[] = [readFile, listDir, glob, grep, editFile, writeFile, runCommand, search, fetchPage, bestPractices, updatePlan, openFile]

function jsonSchema(t: ToolDef): Record<string, unknown> {
  const schema = z.toJSONSchema(t.input) as Record<string, unknown>
  delete schema.$schema
  return schema
}

export interface ToolSelection {
  mode: ChatMode
  hasWorkspace: boolean
  omitWeb: boolean
}

export function selectTools({ mode, hasWorkspace, omitWeb }: ToolSelection): ToolDef[] {
  return ALL_TOOLS.filter((t) => {
    if (omitWeb && t.category === 'web') return false
    if (!hasWorkspace && (t.category === 'read' || t.category === 'edit' || t.category === 'exec' || t.name === 'open_file')) return false
    if (mode !== 'agent' && (t.category === 'edit' || t.category === 'exec')) return false
    return true
  })
}

export function toSpecs(tools: ToolDef[]): ToolSpec[] {
  return tools.map((t) => ({ name: t.name, description: t.description, schema: jsonSchema(t) }))
}

export function findTool(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name)
}

export function needsApproval(tool: ToolDef, mode: PermissionMode): boolean {
  if (mode === 'full-auto') return false
  if (tool.category === 'exec') return true
  if (tool.category === 'edit') return mode === 'ask'
  return false
}

export async function executeTool(tool: ToolDef, rawInput: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  if (rawInput && typeof rawInput === 'object' && '__invalid_json' in rawInput) {
    return { output: 'The tool arguments were not valid JSON. Send them again as a JSON object matching the schema.', isError: true }
  }
  const parsed = tool.input.safeParse(rawInput ?? {})
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ')
    return { output: `Invalid arguments for ${tool.name}: ${issues}`, isError: true }
  }
  try {
    return await tool.run(parsed.data, ctx)
  } catch (err) {
    return { output: err instanceof Error ? err.message : String(err), isError: true }
  }
}

/** Short top-level listing used as context at the start of a chat. */
export async function workspaceOverview(): Promise<string> {
  const root = getRoot()
  if (!root) return ''
  const entries = await fsp.readdir(root, { withFileTypes: true })
  const names = entries
    .filter((e) => e.name !== '.git')
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 80)
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
  return names.join('\n')
}

export function relPath(abs: string): string {
  const root = getRoot()
  return root ? relative(root, abs).split(sep).join('/') : abs
}
