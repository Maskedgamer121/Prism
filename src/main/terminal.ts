import * as pty from '@lydell/node-pty'
import { homedir } from 'os'

interface Term {
  proc: pty.IPty
}

const terms = new Map<number, Term>()
let nextId = 1

export function defaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe'
  return process.env.SHELL || '/bin/bash'
}

export function createTerminal(
  cwd: string | null,
  cols: number,
  rows: number,
  onData: (id: number, data: string) => void,
  onExit: (id: number, code: number) => void
): number {
  const id = nextId++
  const proc = pty.spawn(defaultShell(), process.platform === 'win32' ? ['-NoLogo'] : [], {
    name: 'xterm-256color',
    cols: Math.max(cols, 20),
    rows: Math.max(rows, 5),
    cwd: cwd ?? homedir(),
    env: { ...process.env, TERM_PROGRAM: 'Prism' } as Record<string, string>
  })
  proc.onData((d) => onData(id, d))
  proc.onExit(({ exitCode }) => {
    terms.delete(id)
    onExit(id, exitCode)
  })
  terms.set(id, { proc })
  return id
}

export function writeTerminal(id: number, data: string): void {
  terms.get(id)?.proc.write(data)
}

export function resizeTerminal(id: number, cols: number, rows: number): void {
  try {
    terms.get(id)?.proc.resize(Math.max(cols, 20), Math.max(rows, 5))
  } catch {
    /* pty already closed */
  }
}

export function killTerminal(id: number): void {
  const t = terms.get(id)
  if (!t) return
  terms.delete(id)
  try {
    t.proc.kill()
  } catch {
    /* already dead */
  }
}

export function killAllTerminals(): void {
  for (const id of Array.from(terms.keys())) killTerminal(id)
}
