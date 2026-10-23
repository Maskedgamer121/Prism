import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X, TerminalSquare } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useApp } from '../store'
import { bus } from '../lib/actions'

interface TermInstance {
  id: number
  title: string
  term: Terminal
  fit: FitAddon
  el: HTMLDivElement
}

const instances = new Map<number, TermInstance>()

const THEME = {
  background: '#161616',
  foreground: '#d4d4d4',
  cursor: '#e8e8e8',
  selectionBackground: '#264f78',
  black: '#1e1e1e',
  red: '#f14c4c',
  green: '#23d18b',
  yellow: '#f5f543',
  blue: '#3b8eea',
  magenta: '#d670d6',
  cyan: '#29b8db',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff'
}

let listening = false
function ensureListeners(onExit: (id: number) => void): void {
  if (listening) return
  listening = true
  window.prism.term.onData((id, data) => instances.get(id)?.term.write(data))
  window.prism.term.onExit((id) => onExit(id))
}

export function TerminalPanel() {
  const [ids, setIds] = useState<number[]>(() => Array.from(instances.keys()))
  const [active, setActive] = useState<number | null>(() => Array.from(instances.keys())[0] ?? null)
  const host = useRef<HTMLDivElement>(null)
  const fontSize = useApp((s) => s.settings?.editor.fontSize ?? 14)
  const workspace = useApp((s) => s.workspace)

  const create = async () => {
    const el = document.createElement('div')
    el.style.height = '100%'
    const term = new Terminal({
      fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      fontSize: Math.max(11, fontSize - 1),
      theme: THEME,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    const id = await window.prism.term.create(80, 24)
    term.onData((d) => window.prism.term.write(id, d))
    term.onResize(({ cols, rows }) => window.prism.term.resize(id, cols, rows))
    // Ctrl+C copies when there is a selection; Ctrl+V pastes.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true
      if (e.ctrlKey && e.key === 'c' && term.hasSelection()) {
        void navigator.clipboard.writeText(term.getSelection())
        return false
      }
      if (e.ctrlKey && e.key === 'v') {
        void navigator.clipboard.readText().then((t) => window.prism.term.write(id, t))
        return false
      }
      if (e.ctrlKey && ['j', 'b', 'p', 'i', 'k', '`'].includes(e.key.toLowerCase())) return false
      return true
    })
    instances.set(id, { id, title: 'powershell', term, fit, el })
    setIds(Array.from(instances.keys()))
    setActive(id)
  }

  const kill = (id: number) => {
    const inst = instances.get(id)
    if (!inst) return
    window.prism.term.kill(id)
    inst.term.dispose()
    instances.delete(id)
    const rest = Array.from(instances.keys())
    setIds(rest)
    setActive((a) => (a === id ? (rest[rest.length - 1] ?? null) : a))
  }

  useEffect(() => {
    ensureListeners((id) => {
      instances.get(id)?.term.write('\r\n\x1b[90m[process exited]\x1b[0m\r\n')
    })
    if (instances.size === 0) void create()
    const onNew = () => void create()
    bus.addEventListener('terminal-new', onNew)
    return () => bus.removeEventListener('terminal-new', onNew)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Workspace changed: old shells point at the wrong folder, start fresh.
  const firstWs = useRef(workspace)
  useEffect(() => {
    if (firstWs.current === workspace) return
    firstWs.current = workspace
    for (const id of Array.from(instances.keys())) kill(id)
    void create()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace])

  useEffect(() => {
    const h = host.current
    const inst = active != null ? instances.get(active) : undefined
    if (!h || !inst) return
    h.replaceChildren(inst.el)
    if (!inst.term.element) inst.term.open(inst.el)
    const doFit = () => {
      try {
        inst.fit.fit()
      } catch {
        /* not visible */
      }
    }
    requestAnimationFrame(doFit)
    inst.term.focus()
    const ro = new ResizeObserver(doFit)
    ro.observe(h)
    return () => ro.disconnect()
  }, [active, ids])

  return (
    <>
      <div className="panel-tabs">
        <div className="panel-tab active">Terminal</div>
        <div style={{ flex: 1 }} />
        {ids.map((id, i) => (
          <button key={id} className={`panel-tab${id === active ? ' active' : ''}`} style={{ textTransform: 'none' }} onClick={() => setActive(id)}>
            <TerminalSquare size={12} /> {instances.get(id)?.title} {i + 1}
            <span
              className="x"
              onClick={(e) => {
                e.stopPropagation()
                kill(id)
              }}
            >
              <X size={11} />
            </span>
          </button>
        ))}
        <button className="icon-btn sm" title="New Terminal" onClick={() => void create()}>
          <Plus size={14} />
        </button>
        <button className="icon-btn sm" title="Kill Terminal" onClick={() => active != null && kill(active)}>
          <Trash2 size={13} />
        </button>
        <button className="icon-btn sm" title="Close Panel" onClick={() => useApp.setState({ showPanel: false })}>
          <X size={14} />
        </button>
      </div>
      <div className="term-host" ref={host} />
    </>
  )
}
