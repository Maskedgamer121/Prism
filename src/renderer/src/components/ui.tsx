import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Braces,
  File,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  FileTerminal,
  FileType,
  Folder,
  FolderOpen,
  Settings2,
  Database,
  Lock,
  Check
} from 'lucide-react'

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="logo" aria-hidden>
      <path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9L12 2.5Z" stroke="#e8e8e8" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 2.5v19M3 7.5l18 9M21 7.5l-18 9" stroke="#e8e8e8" strokeOpacity=".35" strokeWidth="1.2" />
      <path d="M12 2.5 21 7.5 12 12 3 7.5 12 2.5Z" fill="#e8e8e8" fillOpacity=".9" />
    </svg>
  )
}

export interface MenuItem {
  label?: string
  shortcut?: string
  icon?: ReactNode
  checked?: boolean
  disabled?: boolean
  sub?: string
  onClick?: () => void
  separator?: boolean
  header?: string
}

export function Menu({ items, anchor, onClose, align = 'left', up = false }: { items: MenuItem[]; anchor: DOMRect; onClose: () => void; align?: 'left' | 'right'; up?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: anchor.left, top: anchor.bottom + 4 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    let left = align === 'right' ? anchor.right - w : anchor.left
    let top = up ? anchor.top - h - 4 : anchor.bottom + 4
    left = Math.max(6, Math.min(left, window.innerWidth - w - 6))
    if (top + h > window.innerHeight - 6) top = Math.max(6, anchor.top - h - 4)
    if (top < 6) top = 6
    setPos({ left, top })
  }, [anchor, align, up])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  return createPortal(
    <div className="dropdown" ref={ref} style={{ left: pos.left, top: pos.top, maxHeight: window.innerHeight - 20, overflowY: 'auto' }}>
      {items.map((it, i) =>
        it.separator ? (
          <div key={i} className="sep" />
        ) : it.header ? (
          <div key={i} className="label">
            {it.header}
          </div>
        ) : (
          <button
            key={i}
            className="item"
            disabled={it.disabled}
            style={it.disabled ? { opacity: 0.45 } : undefined}
            onClick={() => {
              onClose()
              it.onClick?.()
            }}
          >
            <span className="check-slot">{it.checked ? <Check size={13} /> : it.icon}</span>
            <span className="item-label">
              {it.label}
              {it.sub && <span className="sub"> {it.sub}</span>}
            </span>
            {it.shortcut && <span className="shortcut">{it.shortcut}</span>}
          </button>
        )
      )}
    </div>,
    document.body
  )
}

/** Small helper: a button that opens a Menu anchored to itself. */
export function useMenu() {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  return {
    anchor,
    open: (e: { currentTarget: Element }) => setAnchor(e.currentTarget.getBoundingClientRect()),
    openAt: (x: number, y: number) => setAnchor(new DOMRect(x, y, 0, 0)),
    close: () => setAnchor(null)
  }
}

export function Splitter({ dir, onDrag }: { dir: 'v' | 'h'; onDrag: (delta: number) => void }) {
  const [dragging, setDragging] = useState(false)
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    let last = dir === 'v' ? e.clientX : e.clientY
    const move = (ev: MouseEvent) => {
      const cur = dir === 'v' ? ev.clientX : ev.clientY
      onDrag(cur - last)
      last = cur
    }
    const up = () => {
      setDragging(false)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = dir === 'v' ? 'col-resize' : 'row-resize'
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
  return <div className={`splitter-${dir}${dragging ? ' dragging' : ''}`} onMouseDown={onDown} />
}

const ICON_COLORS: Record<string, string> = {
  ts: '#3b8eea', tsx: '#3b8eea', js: '#e8d44d', jsx: '#e8d44d', mjs: '#e8d44d', cjs: '#e8d44d', json: '#d7ba7d', md: '#7fb8e0',
  py: '#4b8bbe', rs: '#dea584', go: '#00add8', java: '#e76f00', cs: '#9b4f96', cpp: '#5c8dbc', c: '#5c8dbc', h: '#a074c4',
  lua: '#6c7ee1', luau: '#00a2ff', html: '#e44d26', css: '#2965f1', scss: '#cd6799', sql: '#e38c00', sh: '#89e051', ps1: '#5391fe',
  yml: '#cb171e', yaml: '#cb171e', toml: '#9c4221', env: '#ecd53f', svg: '#ffb13b', png: '#a074c4', jpg: '#a074c4', gif: '#a074c4',
  kt: '#a97bff', php: '#777bb4', rb: '#cc342d', swift: '#f05138', vue: '#41b883', svelte: '#ff3e00', lock: '#8a8a8a', txt: '#9a9a9a'
}

export function FileIcon({ name, isDir, open, size = 15 }: { name: string; isDir?: boolean; open?: boolean; size?: number }) {
  if (isDir) {
    const C = open ? FolderOpen : Folder
    return <C size={size} className="file-icon" color="#9aa4b2" />
  }
  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.split('.').pop()! : ''
  const color = ICON_COLORS[ext] ?? '#8a8a8a'
  let C = File
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp'].includes(ext)) C = FileImage
  else if (['json', 'jsonc'].includes(ext)) C = FileJson
  else if (['md', 'mdx', 'txt', 'log', 'rst'].includes(ext)) C = FileText
  else if (['sh', 'ps1', 'bat', 'cmd', 'bash', 'zsh'].includes(ext)) C = FileTerminal
  else if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) C = FileType
  else if (['yml', 'yaml', 'toml', 'ini', 'cfg', 'env'].includes(ext) || lower.startsWith('.')) C = Settings2
  else if (['sql', 'db', 'sqlite'].includes(ext)) C = Database
  else if (lower.endsWith('lock') || ext === 'lock') C = Lock
  else if (['css', 'scss', 'less'].includes(ext)) C = Braces
  else if (ext) C = FileCode2
  return <C size={size} className="file-icon" color={color} />
}

export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />
}

export function fuzzyScore(query: string, target: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  const base = t.split('/').pop() ?? t
  if (base.startsWith(q)) return 1000 - base.length
  if (base.includes(q)) return 800 - base.length
  if (t.includes(q)) return 600 - t.length
  let ti = 0
  let score = 0
  let streak = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found < 0) return -1
    streak = found === ti ? streak + 1 : 0
    score += 10 + streak * 5 - Math.min(found - ti, 10)
    ti = found + 1
  }
  return score - t.length * 0.5
}
