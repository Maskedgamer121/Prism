import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, FolderOpen, GitBranch, RefreshCw, Sparkles } from 'lucide-react'
import type { GitStatus, SearchHit } from '@shared/types'
import { useApp, baseName, toast, errorText, joinPath, relToWorkspace } from '../store'
import { openDiff, openFile, openTextTab } from '../lib/editor'
import { sendMessage } from '../lib/chat'
import { onFsChangedDebounced } from '../lib/actions'
import { FileIcon } from './ui'
import { Explorer } from './Explorer'

export function Sidebar() {
  const view = useApp((s) => s.sidebarView)
  return (
    <>
      {view === 'explorer' && <Explorer />}
      {view === 'search' && <SearchView />}
      {view === 'git' && <GitView />}
      {view === 'knowledge' && <KnowledgeView />}
    </>
  )
}

function highlight(text: string, query: string, regex: boolean, cs: boolean) {
  if (!query) return text
  try {
    const re = new RegExp(regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), cs ? '' : 'i')
    const m = text.match(re)
    if (!m || m.index === undefined) return text
    const start = Math.max(0, m.index - 30)
    return (
      <>
        {start > 0 ? '…' : ''}
        {text.slice(start, m.index)}
        <mark>{m[0]}</mark>
        {text.slice(m.index + m[0].length)}
      </>
    )
  } catch {
    return text
  }
}

function SearchView() {
  const workspace = useApp((s) => s.workspace)
  const [query, setQuery] = useState('')
  const [regex, setRegex] = useState(false)
  const [cs, setCs] = useState(false)
  const [glob, setGlob] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => {
    if (!query.trim()) {
      setHits([])
      return
    }
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        setHits(await window.prism.fs.search(query, { regex, caseSensitive: cs, glob: glob || undefined }))
      } catch (err) {
        toast(errorText(err), 'error')
      } finally {
        setBusy(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, regex, cs, glob])

  const groups = useMemo(() => {
    const map = new Map<string, SearchHit[]>()
    for (const h of hits) map.set(h.path, [...(map.get(h.path) ?? []), h])
    return Array.from(map.entries())
  }, [hits])

  if (!workspace) return <div className="empty-hint">Open a folder to search it.</div>

  return (
    <>
      <div className="pane-header">
        <span className="title">Search</span>
        {busy && <RefreshCw size={13} className="spin" />}
      </div>
      <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="field">
          <input ref={inputRef} placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className={`toggle${cs ? ' on' : ''}`} title="Match Case" onClick={() => setCs(!cs)}>
            Aa
          </button>
          <button className={`toggle${regex ? ' on' : ''}`} title="Use Regular Expression" onClick={() => setRegex(!regex)}>
            .*
          </button>
        </div>
        <div className="field">
          <input placeholder="files to include, e.g. *.ts" value={glob} onChange={(e) => setGlob(e.target.value)} />
        </div>
        {query && !busy && (
          <div style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>
            {hits.length} result{hits.length === 1 ? '' : 's'} in {groups.length} file{groups.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
      <div className="pane-body">
        {groups.map(([path, list]) => {
          const rel = relToWorkspace(path)
          const isCollapsed = collapsed.has(path)
          return (
            <div key={path}>
              <div
                className="search-group-title"
                onClick={() =>
                  setCollapsed((c) => {
                    const n = new Set(c)
                    if (n.has(path)) n.delete(path)
                    else n.add(path)
                    return n
                  })
                }
              >
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <FileIcon name={baseName(path)} size={14} />
                <span>{baseName(path)}</span>
                <span className="dir">{rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''}</span>
                <span className="count-pill">{list.length}</span>
              </div>
              {!isCollapsed &&
                list.map((h) => (
                  <div key={h.line} className="search-hit" onClick={() => void openFile(h.path, h.line)} title={`${rel}:${h.line}`}>
                    {highlight(h.text.trim(), query, regex, cs)}
                  </div>
                ))}
            </div>
          )
        })}
      </div>
    </>
  )
}

function GitView() {
  const workspace = useApp((s) => s.workspace)
  const fsVersion = useApp((s) => s.fsVersion)
  const gitVersion = useApp((s) => s.gitVersion)
  const running = useApp((s) => s.running)
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => setStatus(await window.prism.git.status())
  useEffect(() => {
    void refresh()
    return onFsChangedDebounced(() => void refresh(), 600)
  }, [workspace, fsVersion, gitVersion])

  if (!workspace) return <div className="empty-hint">Open a folder to use source control.</div>

  const showDiff = async (rel: string) => {
    const abs = joinPath(workspace, rel)
    const original = await window.prism.git.showHead(rel)
    const file = await window.prism.fs.readFile(abs).catch(() => ({ content: '', isBinary: false, tooLarge: false }))
    openDiff(`${baseName(rel)} (Working Tree)`, original, file.content, abs)
  }

  const commit = async () => {
    if (!message.trim()) return toast('Write a commit message first.')
    setBusy(true)
    try {
      await window.prism.git.commit(message.trim())
      setMessage('')
      toast('Committed.', 'success')
      await refresh()
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="pane-header">
        <span className="title">Source Control</span>
        <button className="icon-btn sm" title="Refresh" onClick={() => void refresh()}>
          <RefreshCw size={13} />
        </button>
      </div>
      {status && !status.isRepo ? (
        <div className="empty-hint">
          This folder isn't a Git repository.
          <div style={{ marginTop: 10 }}>
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await window.prism.git.init()
                  await refresh()
                } catch (err) {
                  toast(errorText(err), 'error')
                }
              }}
            >
              Initialize Repository
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 12 }}>
              <GitBranch size={13} /> {status?.branch ?? '…'}
            </div>
            <textarea
              className="input"
              rows={3}
              placeholder="Commit message (Ctrl+Enter to commit)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void commit()
              }}
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn primary" style={{ flex: 1 }} disabled={busy || !status?.files.length} onClick={() => void commit()}>
                Commit All
              </button>
              <button
                className="btn"
                title="Let the AI review the diff, write a message and commit"
                disabled={running || !status?.files.length}
                onClick={() => {
                  useApp.setState({ showChat: true })
                  void sendMessage('/commit')
                }}
              >
                <Sparkles size={13} /> AI Commit
              </button>
            </div>
          </div>
          <div className="pane-header" style={{ height: 26 }}>
            <span className="title">Changes</span>
            <span className="count-pill">{status?.files.length ?? 0}</span>
          </div>
          <div className="pane-body">
            {status?.files.map((f) => (
              <div key={f.path} className="tree-row" style={{ paddingLeft: 12 }} onClick={() => void showDiff(f.path)} title={f.path}>
                <FileIcon name={baseName(f.path)} />
                <span className="name">{baseName(f.path)}</span>
                <span className="name" style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>
                  {f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''}
                </span>
                <span className={`git-status git-${f.status === '??' ? 'U' : f.status[0]}`}>{f.status === '??' ? 'U' : f.status[0]}</span>
              </div>
            ))}
            {status?.files.length === 0 && <div className="empty-hint">No changes.</div>}
          </div>
        </>
      )}
    </>
  )
}

function KnowledgeView() {
  const [topics, setTopics] = useState<string[]>([])
  useEffect(() => {
    void window.prism.knowledge.list().then(setTopics)
  }, [])
  return (
    <>
      <div className="pane-header">
        <span className="title">Knowledge Base</span>
        <button className="icon-btn sm" title="Open custom knowledge folder" onClick={() => void window.prism.knowledge.openDir()}>
          <FolderOpen size={14} />
        </button>
        <button className="icon-btn sm" title="Refresh" onClick={() => void window.prism.knowledge.list().then(setTopics)}>
          <RefreshCw size={13} />
        </button>
      </div>
      <div className="empty-hint" style={{ paddingTop: 0 }}>
        Best-practice guides the AI loads automatically for the languages in your project, or on demand with the <code>get_best_practices</code> tool. Add your own <code>.md</code> files to the custom folder to teach it your conventions.
      </div>
      <div className="pane-body">
        {topics.map((t) => (
          <div
            key={t}
            className="tree-row"
            style={{ paddingLeft: 12 }}
            onClick={async () => {
              const body = await window.prism.knowledge.get(t)
              openTextTab(`kb:${t}`, `${t}.md`, body ?? '', 'markdown')
            }}
          >
            <BookOpen size={14} color="#9aa4b2" />
            <span className="name">{t}</span>
          </div>
        ))}
      </div>
    </>
  )
}
