import { promises as fsp, watch, type FSWatcher } from 'fs'
import { extname, isAbsolute, join, relative, resolve, sep } from 'path'
import type { DirEntry, FileContent, SearchHit } from '@shared/types'

/** Directories skipped when walking for search, glob and quick-open. */
export const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'out', 'build', '.next', '.nuxt', '__pycache__', '.venv', 'venv', 'env',
  'target', '.idea', '.vs', 'coverage', '.turbo', '.cache', '.parcel-cache', 'obj', '.gradle', '.svelte-kit',
  'Library', 'Intermediate', 'Binaries', 'DerivedDataCache', 'Saved'
])

const MAX_READ_BYTES = 5 * 1024 * 1024

let root: string | null = null
let watcher: FSWatcher | null = null

export function getRoot(): string | null {
  return root
}

export function setRoot(folder: string | null, onChange?: (paths: string[]) => void): void {
  watcher?.close()
  watcher = null
  root = folder ? resolve(folder) : null
  if (!root || !onChange) return
  let pending = new Set<string>()
  let timer: NodeJS.Timeout | null = null
  try {
    watcher = watch(root, { recursive: true }, (_event, file) => {
      if (!file) return
      const rel = String(file).split(sep).join('/')
      if (rel.split('/').some((seg) => seg === '.git' || seg === 'node_modules')) return
      pending.add(join(root!, rel))
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const paths = Array.from(pending)
        pending = new Set()
        onChange(paths)
      }, 150)
    })
    watcher.on('error', () => {
      /* folder removed or permissions changed; ignore */
    })
  } catch {
    watcher = null
  }
}

/** Resolves a (possibly relative) path and refuses anything outside the workspace. */
export function resolveInWorkspace(p: string): string {
  if (!root) throw new Error('No folder is open. Open a folder first (File → Open Folder).')
  const abs = resolve(isAbsolute(p) ? p : join(root, p))
  const rel = relative(root, abs)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Path is outside the workspace: ${p}`)
  return abs
}

export function toRel(abs: string): string {
  if (!root) return abs
  const rel = relative(root, abs).split(sep).join('/')
  return rel || '.'
}

export function isBinary(buf: Buffer): boolean {
  const len = Math.min(buf.length, 8000)
  for (let i = 0; i < len; i++) if (buf[i] === 0) return true
  return false
}

export async function readDir(dir: string): Promise<DirEntry[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.name !== '.git')
    .map((e) => ({ name: e.name, path: join(dir, e.name), isDir: e.isDirectory() }))
    .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.isDir ? -1 : 1))
}

export async function readFileSafe(path: string): Promise<FileContent> {
  const stat = await fsp.stat(path)
  if (stat.size > MAX_READ_BYTES) return { content: '', isBinary: false, tooLarge: true }
  const buf = await fsp.readFile(path)
  if (isBinary(buf)) return { content: '', isBinary: true, tooLarge: false }
  return { content: buf.toString('utf8'), isBinary: false, tooLarge: false }
}

/** Walks the workspace and returns file paths relative to `base`, using forward slashes. */
export async function walkFiles(base: string, maxFiles = 20000): Promise<string[]> {
  const out: string[] = []
  const stack: string[] = [base]
  while (stack.length && out.length < maxFiles) {
    const dir = stack.pop()!
    let entries: import('fs').Dirent[]
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name)) stack.push(join(dir, e.name))
      } else if (e.isFile()) {
        out.push(relative(base, join(dir, e.name)).split(sep).join('/'))
        if (out.length >= maxFiles) break
      }
    }
  }
  return out.sort()
}

/** Converts a glob (`src/**\/*.{ts,tsx}`) to a RegExp over forward-slash paths. */
export function globToRegExp(glob: string): RegExp {
  let re = ''
  let i = 0
  let inGroup = false
  while (i < glob.length) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?'
          i += 3
        } else {
          re += '.*'
          i += 2
        }
        continue
      }
      re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else if (c === '{') {
      re += '(?:'
      inGroup = true
    } else if (c === '}' && inGroup) {
      re += ')'
      inGroup = false
    } else if (c === ',' && inGroup) re += '|'
    else if ('.+^$()|[]\\'.includes(c)) re += '\\' + c
    else re += c
    i++
  }
  // A pattern without a slash matches the file name anywhere (like ripgrep's -g).
  return glob.includes('/') ? new RegExp(`^${re}$`, 'i') : new RegExp(`(?:^|/)${re}$`, 'i')
}

export interface SearchOptions {
  regex?: boolean
  caseSensitive?: boolean
  glob?: string
  maxResults?: number
  base?: string
}

export async function searchText(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  if (!root) return []
  const base = opts.base ?? root
  const max = opts.maxResults ?? 500
  const flags = opts.caseSensitive ? 'g' : 'gi'
  const pattern = opts.regex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  const globRe = opts.glob ? globToRegExp(opts.glob) : null
  const files = await walkFiles(base)
  const hits: SearchHit[] = []
  for (const rel of files) {
    if (globRe && !globRe.test(rel)) continue
    const abs = join(base, rel)
    let buf: Buffer
    try {
      const stat = await fsp.stat(abs)
      if (stat.size > 2 * 1024 * 1024) continue
      buf = await fsp.readFile(abs)
    } catch {
      continue
    }
    if (isBinary(buf)) continue
    const lines = buf.toString('utf8').split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      pattern.lastIndex = 0
      if (pattern.test(lines[i])) {
        hits.push({ path: abs, line: i + 1, text: lines[i].length > 400 ? lines[i].slice(0, 400) + '…' : lines[i] })
        if (hits.length >= max) return hits
      }
    }
  }
  return hits
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'react', '.js': 'javascript', '.jsx': 'react', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java', '.kt': 'kotlin', '.cs': 'csharp', '.cpp': 'cpp', '.cc': 'cpp',
  '.c': 'c', '.h': 'cpp', '.hpp': 'cpp', '.lua': 'lua', '.luau': 'lua', '.html': 'html-css', '.css': 'html-css', '.scss': 'html-css',
  '.sql': 'sql', '.sh': 'shell', '.ps1': 'shell', '.php': 'php', '.rb': 'ruby', '.swift': 'swift', '.vue': 'vue', '.svelte': 'svelte',
  '.dart': 'dart'
}

/** Most common languages in the workspace, by file count. */
export async function detectLanguages(limit = 4): Promise<string[]> {
  if (!root) return []
  const files = await walkFiles(root, 5000)
  const counts = new Map<string, number>()
  for (const f of files) {
    const lang = LANGUAGE_BY_EXT[extname(f).toLowerCase()]
    if (lang) counts.set(lang, (counts.get(lang) ?? 0) + 1)
  }
  if (files.some((f) => /(^|\/)(default\.project\.json|wally\.toml|aftman\.toml|rokit\.toml)$/i.test(f))) counts.set('lua', (counts.get('lua') ?? 0) + 1000)
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([lang]) => lang)
}
