import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FilePlus, FolderPlus, RefreshCw, ChevronsDownUp } from 'lucide-react'
import type { DirEntry } from '@shared/types'
import { useApp, baseName, toast, errorText, joinPath, relToWorkspace } from '../store'
import { openFile } from '../lib/editor'
import { askAbout } from '../lib/chat'
import { onFsChangedDebounced, openFolder, refreshFileList } from '../lib/actions'
import { FileIcon, Menu, type MenuItem } from './ui'

const parentOf = (p: string) => p.replace(/[\\/][^\\/]+$/, '')
const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase()

export function Explorer() {
  const workspace = useApp((s) => s.workspace)
  const fsVersion = useApp((s) => s.fsVersion)
  const activeTabId = useApp((s) => s.activeTabId)
  const tabs = useApp((s) => s.tabs)
  const [children, setChildren] = useState<Map<string, DirEntry[]>>(new Map())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ path: string; mode: 'rename' | 'newFile' | 'newFolder' } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; entry: DirEntry | null } | null>(null)
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded

  const load = useCallback(async (dir: string) => {
    try {
      const entries = await window.prism.fs.readDir(dir)
      setChildren((m) => new Map(m).set(dir, entries))
    } catch {
      setChildren((m) => {
        const next = new Map(m)
        next.delete(dir)
        return next
      })
    }
  }, [])

  useEffect(() => {
    if (!workspace) return
    setExpanded((e) => new Set(e).add(workspace))
    void load(workspace)
    for (const dir of expandedRef.current) if (dir !== workspace) void load(dir)
  }, [workspace, fsVersion, load])

  useEffect(() => {
    const offTree = window.prism.fs.onChanged((paths) => {
      const dirs = new Set<string>()
      for (const p of paths) dirs.add(norm(parentOf(p)))
      for (const dir of expandedRef.current) if (dirs.has(norm(dir))) void load(dir)
    })
    const offList = onFsChangedDebounced(() => void refreshFileList(), 800)
    return () => {
      offTree()
      offList()
    }
  }, [load])

  if (!workspace) {
    return (
      <div className="empty-hint">
        No folder open.
        <div style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => void openFolder()}>
            Open Folder
          </button>
        </div>
      </div>
    )
  }

  const toggleDir = (dir: string) => {
    setExpanded((e) => {
      const next = new Set(e)
      if (next.has(dir)) next.delete(dir)
      else {
        next.add(dir)
        if (!children.has(dir)) void load(dir)
      }
      return next
    })
  }

  const targetDir = (entry: DirEntry | null) => (entry ? (entry.isDir ? entry.path : parentOf(entry.path)) : workspace)

  const startCreate = (mode: 'newFile' | 'newFolder', entry: DirEntry | null) => {
    const dir = targetDir(entry)
    setExpanded((e) => new Set(e).add(dir))
    if (!children.has(dir)) void load(dir)
    setEditing({ path: dir, mode })
  }

  const commitEdit = async (value: string) => {
    const e = editing
    setEditing(null)
    if (!e || !value.trim()) return
    try {
      if (e.mode === 'rename') {
        const dest = joinPath(parentOf(e.path), value.trim())
        if (dest !== e.path) await window.prism.fs.rename(e.path, dest)
        void load(parentOf(e.path))
      } else {
        const abs = await window.prism.fs.create(joinPath(e.path, value.trim()), e.mode === 'newFolder')
        void load(e.path)
        if (e.mode === 'newFile') void openFile(abs)
      }
      void refreshFileList()
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }

  const remove = async (entry: DirEntry) => {
    if (!window.confirm(`Move ${entry.name} to the Recycle Bin?`)) return
    try {
      await window.prism.fs.trash(entry.path)
      void load(parentOf(entry.path))
      void refreshFileList()
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }

  const menuItems = (entry: DirEntry | null): MenuItem[] => [
    { label: 'New File…', onClick: () => startCreate('newFile', entry) },
    { label: 'New Folder…', onClick: () => startCreate('newFolder', entry) },
    ...(entry
      ? [
          { separator: true },
          { label: 'Ask AI about this', onClick: () => askAbout(`@${relToWorkspace(entry.path)} `) },
          { label: 'Rename…', shortcut: 'F2', onClick: () => setEditing({ path: entry.path, mode: 'rename' }) },
          { label: 'Delete', shortcut: 'Del', onClick: () => void remove(entry) },
          { separator: true },
          { label: 'Copy Path', onClick: () => void navigator.clipboard.writeText(entry.path) },
          { label: 'Copy Relative Path', onClick: () => void navigator.clipboard.writeText(relToWorkspace(entry.path)) },
          { label: 'Reveal in File Explorer', onClick: () => void window.prism.fs.reveal(entry.path) }
        ]
      : [{ separator: true }, { label: 'Reveal in File Explorer', onClick: () => void window.prism.fs.reveal(workspace) }])
  ]

  const dirtyPaths = new Set(tabs.filter((t) => t.dirty && t.path).map((t) => norm(t.path!)))

  const renderEdit = (depth: number, mode: 'newFile' | 'newFolder') => (
    <div className="tree-row" style={{ paddingLeft: 8 + depth * 12 }}>
      <span className="chev" />
      <FileIcon name="" isDir={mode === 'newFolder'} />
      <EditInput initial="" onDone={commitEdit} />
    </div>
  )

  const renderDir = (dir: string, depth: number): React.ReactNode => {
    const entries = children.get(dir) ?? []
    return (
      <>
        {editing && editing.mode !== 'rename' && norm(editing.path) === norm(dir) && renderEdit(depth, editing.mode)}
        {entries.map((entry) => {
          const isOpen = expanded.has(entry.path)
          const isRenaming = editing?.mode === 'rename' && editing.path === entry.path
          return (
            <div key={entry.path}>
              <div
                className={`tree-row${selected === entry.path || activeTabId === entry.path ? ' selected' : ''}${dirtyPaths.has(norm(entry.path)) ? ' dirty' : ''}`}
                style={{ paddingLeft: 8 + depth * 12 }}
                onClick={() => {
                  setSelected(entry.path)
                  if (entry.isDir) toggleDir(entry.path)
                  else void openFile(entry.path)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setSelected(entry.path)
                  setMenu({ x: e.clientX, y: e.clientY, entry })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'F2') setEditing({ path: entry.path, mode: 'rename' })
                  if (e.key === 'Delete') void remove(entry)
                }}
                tabIndex={0}
                title={relToWorkspace(entry.path)}
              >
                <span className="chev">{entry.isDir ? isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}</span>
                <FileIcon name={entry.name} isDir={entry.isDir} open={isOpen} />
                {isRenaming ? <EditInput initial={entry.name} onDone={commitEdit} /> : <span className="name">{entry.name}</span>}
              </div>
              {entry.isDir && isOpen && renderDir(entry.path, depth + 1)}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <>
      <div className="pane-header">
        <span className="title">{baseName(workspace)}</span>
        <button className="icon-btn sm" title="New File" onClick={() => startCreate('newFile', selected ? findEntry(children, selected) : null)}>
          <FilePlus size={14} />
        </button>
        <button className="icon-btn sm" title="New Folder" onClick={() => startCreate('newFolder', selected ? findEntry(children, selected) : null)}>
          <FolderPlus size={14} />
        </button>
        <button
          className="icon-btn sm"
          title="Refresh"
          onClick={() => {
            for (const d of expanded) void load(d)
            void refreshFileList()
          }}
        >
          <RefreshCw size={13} />
        </button>
        <button className="icon-btn sm" title="Collapse All" onClick={() => setExpanded(new Set([workspace]))}>
          <ChevronsDownUp size={14} />
        </button>
      </div>
      <div
        className="pane-body"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault()
            setMenu({ x: e.clientX, y: e.clientY, entry: null })
          }
        }}
      >
        {renderDir(workspace, 0)}
      </div>
      {menu && <Menu items={menuItems(menu.entry)} anchor={new DOMRect(menu.x, menu.y, 0, 0)} onClose={() => setMenu(null)} />}
    </>
  )
}

function findEntry(children: Map<string, DirEntry[]>, path: string): DirEntry | null {
  for (const list of children.values()) {
    const e = list.find((x) => x.path === path)
    if (e) return e
  }
  return null
}

function EditInput({ initial, onDone }: { initial: string; onDone: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const dot = initial.lastIndexOf('.')
    el.setSelectionRange(0, dot > 0 ? dot : initial.length)
  }, [initial])
  const finish = (v: string) => {
    if (done.current) return
    done.current = true
    onDone(v)
  }
  return (
    <input
      ref={ref}
      defaultValue={initial}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') finish(e.currentTarget.value)
        if (e.key === 'Escape') finish('')
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  )
}
