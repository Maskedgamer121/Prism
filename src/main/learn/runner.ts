import { app } from 'electron'
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import type { CollectResult, GraphicsEvent, LearnTest, RunMessage, RunRequest, Scene } from '@shared/learn'

/** Folder with prism_graphics.py and js_runner.js (bundled as an extra resource when packaged). */
export function runtimeDir(): string {
  const packaged = join(process.resourcesPath ?? '', 'learn-runtime')
  return app.isPackaged && existsSync(packaged) ? packaged : join(app.getAppPath(), 'learn-runtime')
}

let python: { cmd: string; pre: string[]; version: string } | null | undefined

export function findPython(): typeof python {
  if (python !== undefined) return python
  const candidates: [string, string[]][] = process.platform === 'win32' ? [['python', []], ['py', ['-3']], ['python3', []]] : [['python3', []], ['python', []]]
  for (const [cmd, pre] of candidates) {
    try {
      const out = execFileSync(cmd, [...pre, '--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 5000 }).trim()
      if (/^Python 3\.(\d+)/.test(out) && Number(out.match(/^Python 3\.(\d+)/)![1]) >= 8) {
        python = { cmd, pre, version: out }
        return python
      }
    } catch {
      /* try next */
    }
  }
  python = null
  return python
}

export function detectRuntimes(): { python: string | null; javascript: string; lua: string } {
  return { python: findPython()?.version ?? null, javascript: `Node ${process.versions.node} + TypeScript + SQLite (built in)`, lua: 'Lua 5.3 (built in)' }
}

const EXT = { python: 'py', javascript: 'js', typescript: 'ts', lua: 'lua', sql: 'sql' } as const

function prepare(req: RunRequest, id: string): { cmd: string; args: string[]; env: NodeJS.ProcessEnv; dir: string } {
  const dir = join(tmpdir(), 'prism-learn', id.replace(/[^\w-]/g, ''))
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `main.${EXT[req.language]}`)
  writeFileSync(file, req.code, 'utf8')
  const rt = runtimeDir()
  const env: NodeJS.ProcessEnv = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' }
  if (req.language === 'python') {
    const py = findPython()
    if (!py) throw new Error('Python 3 was not found. Install it from https://www.python.org/downloads/ (tick "Add python.exe to PATH"), then restart Prism.')
    const args = req.kind === 'graphics' ? [...py.pre, '-u', join(rt, 'prism_graphics.py'), file] : [...py.pre, '-u', file]
    return { cmd: py.cmd, args, env, dir }
  }
  env.ELECTRON_RUN_AS_NODE = '1'
  if (req.language === 'lua') {
    env.PRISM_FENGARI = dirname(require.resolve('fengari/package.json'))
    return { cmd: process.execPath, args: [join(rt, 'js_runner.js'), 'lua', file], env, dir }
  }
  if (req.language === 'sql') return { cmd: process.execPath, args: [join(rt, 'js_runner.js'), 'sql', file], env, dir }
  if (req.language === 'typescript') {
    env.PRISM_TS = '1'
    env.NODE_NO_WARNINGS = '1'
  }
  return { cmd: process.execPath, args: [join(rt, 'js_runner.js'), req.kind, file], env, dir }
}

/** Turns a raw console traceback into "Error: message (line N)". */
function cleanConsoleError(language: RunRequest['language'], stderr: string): string {
  const text = stderr.replace(/\r/g, '').trim()
  if (language !== 'python') return text
  const lines = text.split('\n')
  let line: number | undefined
  for (const l of lines) {
    const m = l.match(/File ".*main\.py", line (\d+)/)
    if (m) line = Number(m[1])
  }
  const last = [...lines].reverse().find((l) => l.trim() && !l.startsWith(' ')) ?? text
  return line ? `${last} (line ${line})` : last
}

interface Session {
  child: ChildProcessWithoutNullStreams
  dir: string
  timer: NodeJS.Timeout | null
  done: boolean
  /** Restarts the watchdog that stops programs stuck in an infinite loop. */
  arm: (ms: number) => void
}

const sessions = new Map<string, Session>()
const START_TIMEOUT = 8000
const EVENT_TIMEOUT = 4000

export function startRun(id: string, req: RunRequest, onMessage: (m: RunMessage) => void): void {
  stopRun(id)
  const { cmd, args, env, dir } = prepare(req, id)
  const child = spawn(cmd, args, { cwd: dir, env, windowsHide: true })
  const s: Session = { child, dir, timer: null, done: false, arm: () => {} }
  sessions.set(id, s)
  let stdoutBuf = ''
  let stderr = ''
  let reportedError = false

  const arm = (ms: number) => {
    if (s.timer) clearTimeout(s.timer)
    s.timer = setTimeout(() => {
      reportedError = true
      onMessage({ type: 'error', message: 'Your program took too long to respond, so it was stopped. Is there an infinite loop?' })
      child.kill()
    }, ms)
  }
  const disarm = () => {
    if (s.timer) clearTimeout(s.timer)
    s.timer = null
  }
  s.arm = arm
  if (req.kind === 'graphics') arm(START_TIMEOUT)

  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    if (req.kind === 'console') {
      onMessage({ type: 'print', text: chunk })
      return
    }
    stdoutBuf += chunk
    let nl: number
    while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
      const line = stdoutBuf.slice(0, nl).trim()
      stdoutBuf = stdoutBuf.slice(nl + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line) as RunMessage
        if (msg.type === 'scene') disarm()
        if (msg.type === 'error') reportedError = true
        onMessage(msg)
      } catch {
        onMessage({ type: 'print', text: line + '\n' })
      }
    }
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (d: string) => (stderr += d))
  child.on('error', (err) => onMessage({ type: 'error', message: err.message }))
  child.on('close', (code) => {
    disarm()
    s.done = true
    if (!reportedError && stderr.trim()) onMessage({ type: 'error', message: cleanConsoleError(req.language, stderr) })
    onMessage({ type: 'exit', code })
    sessions.delete(id)
    setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500)
  })
}

export function sendEvent(id: string, event: GraphicsEvent): void {
  const s = sessions.get(id)
  if (!s || s.done || !s.child.stdin.writable) return
  s.arm(EVENT_TIMEOUT)
  s.child.stdin.write(JSON.stringify(event) + '\n')
}

export function sendStdin(id: string, text: string): void {
  const s = sessions.get(id)
  if (s && !s.done && s.child.stdin.writable) s.child.stdin.write(text + '\n')
}

export function stopRun(id: string): void {
  const s = sessions.get(id)
  if (!s) return
  sessions.delete(id)
  try {
    s.child.kill()
  } catch {
    /* already gone */
  }
}

export function stopAllRuns(): void {
  for (const id of Array.from(sessions.keys())) stopRun(id)
}

/** Runs a program once per test (fresh process each time) and returns what it produced. */
export async function collect(req: RunRequest, tests: LearnTest[]): Promise<CollectResult> {
  const results: CollectResult['results'] = []
  const list = tests.length ? tests : [{ label: 'Run' }]
  for (let i = 0; i < list.length; i++) {
    results.push(await collectOne(req, list[i], `check-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`))
  }
  return { results }
}

function collectOne(req: RunRequest, test: LearnTest, id: string): Promise<CollectResult['results'][number]> {
  return new Promise((resolve) => {
    let output = ''
    let scene: Scene | undefined
    let error: string | undefined
    const pending = [...(test.events ?? [])]
    let started = false // the initial 'ready' arrived
    let awaitingScene = false // an event was sent and its scene hasn't come back yet
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(overall)
      stopRun(id)
      resolve({ scene, output, error })
    }
    const overall = setTimeout(() => {
      error = error ?? 'Your program took too long to finish. Is there an infinite loop, or is it waiting for input?'
      finish()
    }, req.kind === 'graphics' ? 15000 : 8000)
    const sendNext = () => {
      if (!pending.length) return finish()
      awaitingScene = true
      sendEvent(id, pending.shift()!)
    }

    try {
      startRun(id, req, (m) => {
        switch (m.type) {
          case 'print':
            output += m.text
            break
          case 'scene':
            scene = m.scene
            if (awaitingScene) {
              awaitingScene = false
              sendNext()
            }
            break
          case 'ready':
            if (started) break
            started = true
            if (!m.handlers.length) finish()
            else sendNext()
            break
          case 'error':
            error = m.message + (m.line ? ` (line ${m.line})` : '')
            finish()
            break
          case 'exit':
            finish()
            break
        }
      })
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      finish()
      return
    }
    if (req.kind === 'console') {
      const s = sessions.get(id)
      if (s) {
        if (test.stdin) s.child.stdin.write(test.stdin.endsWith('\n') ? test.stdin : test.stdin + '\n')
        s.child.stdin.end()
      }
    }
  })
}
