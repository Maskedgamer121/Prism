import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Files, GitBranch, RefreshCw, Search, Settings, Sparkles, Shield, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useApp, baseName, joinPath } from '../store'
import { commands, onFsChangedDebounced, showView } from '../lib/actions'
import { openFile } from '../lib/editor'
import { useModelMenu } from './ChatPanel'
import { FileIcon, Menu, fuzzyScore } from './ui'

export function ActivityBar() {
  const view = useApp((s) => s.sidebarView)
  const shown = useApp((s) => s.showSidebar)
  const [changes, setChanges] = useState(0)
  const workspace = useApp((s) => s.workspace)

  useEffect(() => {
    const refresh = () => void window.prism.git.status().then((s) => setChanges(s.files.length))
    refresh()
    return onFsChangedDebounced(refresh, 600)
  }, [workspace])

  const item = (id: 'explorer' | 'search' | 'git' | 'knowledge', icon: React.ReactNode, title: string, badge?: number) => (
    <button className={`icon-btn${shown && view === id ? ' active' : ''}`} title={title} onClick={() => showView(id)}>
      {icon}
      {badge ? <span className="badge">{badge > 99 ? '99+' : badge}</span> : null}
    </button>
  )
  return (
    <div className="activitybar">
      {item('explorer', <Files size={19} />, 'Explorer (Ctrl+Shift+E)')}
      {item('search', <Search size={19} />, 'Search (Ctrl+Shift+F)')}
      {item('git', <GitBranch size={19} />, 'Source Control (Ctrl+Shift+G)', changes)}
      {item('knowledge', <BookOpen size={19} />, 'Knowledge Base')}
      <div className="spacer" />
      <button className="icon-btn" title="Settings (Ctrl+,)" onClick={() => useApp.setState({ settingsOpen: true })}>
        <Settings size={18} />
      </button>
    </div>
  )
}

export function StatusBar() {
  const settings = useApp((s) => s.settings)
  const cursor = useApp((s) => s.cursor)
  const update = useApp((s) => s.update)
  const running = useApp((s) => s.running)
  const workspace = useApp((s) => s.workspace)
  const [branch, setBranch] = useState<string | undefined>()
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const modelMenu = useModelMenu()

  useEffect(() => {
    const refresh = () => void window.prism.git.status().then((s) => setBranch(s.isRepo ? s.branch : undefined))
    refresh()
    return onFsChangedDebounced(refresh, 1500)
  }, [workspace])

  const perm = settings?.permissionMode === 'full-auto' ? 'Full auto' : settings?.permissionMode === 'auto-edit' ? 'Auto-edit' : 'Ask first'
  return (
    <div className="statusbar">
      {branch && (
        <span className="sb-item">
          <GitBranch size={12} /> {branch}
        </span>
      )}
      {running && (
        <span className="sb-item">
          <Sparkles size={12} className="shimmer" /> <span className="shimmer">AI working…</span>
        </span>
      )}
      <span className="grow" />
      {update?.status === 'downloaded' && (
        <button className="sb-item update-ready" onClick={() => void window.prism.updates.install()} title={`Install Prism ${update.latest}`}>
          <RefreshCw size={12} /> Restart to update
        </button>
      )}
      {update?.status === 'downloading' && <span className="sb-item">Downloading update… {update.progress ?? 0}%</span>}
      {cursor && (
        <>
          <span className="sb-item">
            Ln {cursor.line}, Col {cursor.col}
          </span>
          <span className="sb-item">Spaces: {settings?.editor.tabSize}</span>
          <span className="sb-item">UTF-8</span>
          <span className="sb-item">{cursor.eol}</span>
          <span className="sb-item">{cursor.language}</span>
        </>
      )}
      <button className="sb-item" title="AI permissions" onClick={() => useApp.setState({ settingsOpen: true })}>
        <Shield size={12} /> {perm}
      </button>
      <button className="sb-item" title="Switch model" onClick={(e) => setMenu(e.currentTarget.getBoundingClientRect())}>
        <Sparkles size={12} /> {settings?.activeModel || 'No model'}
      </button>
      {menu && <Menu items={modelMenu()} anchor={menu} onClose={() => setMenu(null)} align="right" up />}
    </div>
  )
}

export function Palette() {
  const mode = useApp((s) => s.palette)
  const files = useApp((s) => s.fileList)
  const workspace = useApp((s) => s.workspace)
  const [q, setQ] = useState(mode === 'commands' ? '>' : '')
  const [idx, setIdx] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQ(mode === 'commands' ? '>' : '')
    setIdx(0)
    setTimeout(() => input.current?.focus(), 0)
  }, [mode])

  const isCmd = q.startsWith('>')
  const results = useMemo(() => {
    if (isCmd) {
      const query = q.slice(1).trim()
      return commands()
        .map((c) => ({ c, score: fuzzyScore(query, c.title) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => (query ? b.score - a.score : 0))
        .slice(0, 60)
        .map((x) => ({ key: x.c.id, label: x.c.title, detail: x.c.shortcut ?? '', run: x.c.run, file: null as string | null }))
    }
    const [query, line] = q.split(':')
    return files
      .map((f) => ({ f, score: fuzzyScore(query.trim(), f) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
      .map((x) => ({
        key: x.f,
        label: baseName(x.f),
        detail: x.f.includes('/') ? x.f.slice(0, x.f.lastIndexOf('/')) : '',
        file: x.f,
        run: () => workspace && void openFile(joinPath(workspace, x.f), line ? Number(line) || undefined : undefined)
      }))
  }, [q, isCmd, files, workspace])

  useEffect(() => setIdx(0), [q])
  useEffect(() => {
    listRef.current?.children[idx]?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  if (!mode) return null
  const close = () => useApp.setState({ palette: null })
  const run = (i: number) => {
    const r = results[i]
    if (!r) return
    close()
    r.run()
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="palette">
        <input
          ref={input}
          value={q}
          placeholder={isCmd ? 'Type a command' : workspace ? 'Search files by name (append :line to jump), or type > for commands' : 'Type > for commands'}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIdx((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIdx((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') run(idx)
          }}
        />
        <div className="list" ref={listRef}>
          {results.map((r, i) => (
            <div key={r.key} className={`row${i === idx ? ' active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => run(i)}>
              {r.file && <FileIcon name={r.file} size={15} />}
              <span>{r.label}</span>
              {r.file ? <span className="dir">{r.detail}</span> : <span className="shortcut">{r.detail}</span>}
            </div>
          ))}
          {!results.length && <div className="row" style={{ color: 'var(--text-faint)' }}>No results</div>}
        </div>
      </div>
    </div>
  )
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'error' ? <AlertCircle size={15} color="var(--red)" /> : t.kind === 'success' ? <CheckCircle2 size={15} color="var(--green)" /> : <Info size={15} color="var(--accent)" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
