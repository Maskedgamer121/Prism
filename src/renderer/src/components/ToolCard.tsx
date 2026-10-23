import { useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FilePlus,
  FileText,
  FolderTree,
  Globe,
  ListChecks,
  Loader2,
  Pencil,
  Search,
  ShieldAlert,
  SquareTerminal,
  Undo2,
  Wrench,
  X,
  Bot,
  Ban
} from 'lucide-react'
import type { UiBlock } from '@shared/types'
import { diffLines, hunks, diffStats } from '@shared/diff'
import { respondApproval } from '../lib/chat'
import { openDiff, openFile } from '../lib/editor'
import { useApp, baseName, joinPath, toast, errorText } from '../store'

type ToolBlock = Extract<UiBlock, { kind: 'tool' }>
type In = Record<string, unknown>

const s = (v: unknown) => (typeof v === 'string' ? v : '')

function host(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname + (u.pathname.length > 1 ? u.pathname : '')
  } catch {
    return url
  }
}

/** Human description of a tool call: works for Prism's tools and Claude Code's. */
export function describe(name: string, input: In = {}): { icon: React.ReactNode; verb: string; target: string; kind: 'read' | 'edit' | 'exec' | 'web' | 'other' } {
  const path = s(input.path) || s(input.file_path) || s(input.notebook_path)
  switch (name) {
    case 'read_file':
    case 'Read':
      return { icon: <FileText size={14} />, verb: 'Read', target: path, kind: 'read' }
    case 'list_dir':
    case 'LS':
      return { icon: <FolderTree size={14} />, verb: 'Listed', target: path || '.', kind: 'read' }
    case 'glob':
    case 'Glob':
      return { icon: <Search size={14} />, verb: 'Found files', target: s(input.pattern), kind: 'read' }
    case 'grep':
    case 'Grep':
      return { icon: <Search size={14} />, verb: 'Searched', target: s(input.pattern), kind: 'read' }
    case 'write_file':
    case 'Write':
      return { icon: <FilePlus size={14} />, verb: 'Wrote', target: path, kind: 'edit' }
    case 'edit_file':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return { icon: <Pencil size={14} />, verb: 'Edited', target: path, kind: 'edit' }
    case 'run_command':
    case 'Bash':
    case 'PowerShell':
      return { icon: <SquareTerminal size={14} />, verb: 'Ran', target: s(input.command), kind: 'exec' }
    case 'web_search':
    case 'WebSearch':
      return { icon: <Globe size={14} />, verb: 'Searched the web', target: s(input.query), kind: 'web' }
    case 'web_fetch':
    case 'WebFetch':
      return { icon: <Globe size={14} />, verb: 'Read', target: host(s(input.url)), kind: 'web' }
    case 'get_best_practices':
      return { icon: <BookOpen size={14} />, verb: 'Loaded best practices', target: s(input.topic), kind: 'other' }
    case 'update_plan':
    case 'TodoWrite':
      return { icon: <ListChecks size={14} />, verb: 'Updated the plan', target: '', kind: 'other' }
    case 'open_file':
      return { icon: <ExternalLink size={14} />, verb: 'Opened', target: path, kind: 'other' }
    case 'Task':
    case 'Agent':
      return { icon: <Bot size={14} />, verb: 'Delegated', target: s(input.description), kind: 'other' }
    default:
      return { icon: <Wrench size={14} />, verb: name, target: '', kind: 'other' }
  }
}

function DiffBlock({ before, after }: { before: string; after: string }) {
  const lines = useMemo(() => hunks(diffLines(before, after), 2), [before, after])
  return (
    <div className="diff">
      {lines.map((l, i) =>
        l === null ? (
          <div key={i} className="gap">
            ⋯
          </div>
        ) : (
          <div key={i} className={`dl ${l.type}`}>
            <span className="no">{l.type === 'del' ? l.oldNo : l.newNo}</span>
            <span>
              {l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  '}
              {l.text}
            </span>
          </div>
        )
      )}
    </div>
  )
}

function absPath(rel: string): string {
  const ws = useApp.getState().workspace
  if (!ws || /^([a-zA-Z]:[\\/]|\/)/.test(rel)) return rel
  return joinPath(ws, rel)
}

function Approval({ block, input }: { block: ToolBlock; input: In }) {
  const d = describe(block.name, input)
  let preview: React.ReactNode = null
  if (block.name === 'run_command') preview = <pre>{s(input.command)}</pre>
  else if (block.name === 'edit_file') preview = <DiffBlock before={s(input.old_string)} after={s(input.new_string)} />
  else if (block.name === 'write_file')
    preview = (
      <pre>
        {s(input.content).split('\n').slice(0, 40).join('\n')}
        {s(input.content).split('\n').length > 40 ? '\n…' : ''}
      </pre>
    )
  else preview = <pre>{JSON.stringify(input, null, 2)}</pre>
  const allowLabel = d.kind === 'exec' ? 'Run' : d.kind === 'edit' ? 'Apply' : 'Allow'
  return (
    <div className="approval">
      <div className="ap-title">
        <ShieldAlert size={14} color="var(--yellow)" />
        <span>
          {d.kind === 'exec' ? 'Run this command?' : d.kind === 'edit' ? `${d.verb === 'Wrote' ? 'Write' : 'Edit'} ${d.target}?` : `Allow ${block.name}?`}
          {block.name === 'run_command' && s(input.cwd) ? <span style={{ color: 'var(--text-faint)' }}> in {s(input.cwd)}</span> : null}
        </span>
      </div>
      {block.name === 'edit_file' ? (
        <div style={{ margin: '0 10px 8px', border: '1px solid var(--border-strong)', borderRadius: 6, overflow: 'hidden', background: '#141414' }}>{preview}</div>
      ) : (
        preview
      )}
      <div className="ap-actions">
        <button className="btn sm primary" onClick={() => respondApproval(block.approvalId!, 'allow')}>
          <Check size={13} /> {allowLabel}
        </button>
        <button className="btn sm" onClick={() => respondApproval(block.approvalId!, 'always')} title={`Don't ask again for ${block.name} in this chat`}>
          Always allow
        </button>
        <button className="btn sm ghost" onClick={() => respondApproval(block.approvalId!, 'deny')}>
          <X size={13} /> Deny
        </button>
      </div>
    </div>
  )
}

export function ToolCard({ block }: { block: ToolBlock }) {
  const input = (block.input ?? {}) as In
  const d = describe(block.name, input)
  const [open, setOpen] = useState(false)
  const [reverted, setReverted] = useState(false)
  const meta = block.meta
  const running = block.status === 'running' || block.status === 'pending'

  if (block.status === 'awaiting' && block.approvalId) return <Approval block={block} input={input} />

  // Diff info: Prism tools send before/after; Claude Code edits carry old/new strings.
  let before: string | null | undefined = meta?.before
  let after: string | undefined = meta?.after
  if (after === undefined && (block.name === 'Edit' || block.name === 'edit_file') && typeof input.new_string === 'string') {
    before = s(input.old_string)
    after = s(input.new_string)
  }
  if (after === undefined && (block.name === 'Write' || block.name === 'write_file') && typeof input.content === 'string') {
    before = ''
    after = s(input.content)
  }
  const stats = after !== undefined && block.status !== 'error' && block.status !== 'denied' ?(meta?.added !== undefined ? { added: meta.added, removed: meta.removed ?? 0 } : diffStats(before ?? '', after)) : null

  const statusIcon = running ? (
    <Loader2 size={13} className="spin" />
  ) : block.status === 'error' ? (
    <X size={13} color="var(--red)" />
  ) : block.status === 'denied' ? (
    <Ban size={13} color="var(--text-faint)" />
  ) : null

  const revert = async () => {
    if (!meta?.path || meta.before === undefined) return
    const abs = absPath(meta.path)
    try {
      if (meta.before === null) await window.prism.fs.deleteFile(abs)
      else await window.prism.fs.writeFile(abs, meta.before)
      setReverted(true)
      toast(`Reverted ${baseName(meta.path)}`, 'success')
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }

  const hasBody = Boolean(block.output) || stats !== null || Boolean(meta?.results?.length)
  const target = d.kind === 'edit' || d.kind === 'read' ? (meta?.path ?? d.target) : d.target

  return (
    <div className={`tool ${block.status}`}>
      <div className="tool-head" onClick={() => hasBody && setOpen(!open)}>
        {d.icon}
        <span className={`verb${running ? ' shimmer' : ''}`}>{block.status === 'denied' ? `Skipped: ${d.verb.toLowerCase()}` : d.verb}</span>
        <span
          className="target"
          onClick={(e) => {
            if ((d.kind === 'edit' || d.kind === 'read') && target) {
              e.stopPropagation()
              void openFile(absPath(target))
            }
          }}
          style={(d.kind === 'edit' || d.kind === 'read') && target ? { cursor: 'pointer' } : undefined}
          title={target}
        >
          {d.kind === 'edit' || d.kind === 'read' ? baseName(target) : target}
        </span>
        <span className="stats">
          {stats && !reverted && (
            <>
              <span className="add">+{stats.added}</span> <span className="del">−{stats.removed}</span>
            </>
          )}
          {reverted && <span style={{ color: 'var(--text-faint)' }}>reverted</span>}
          {meta?.exitCode !== undefined && meta.exitCode !== null && meta.exitCode !== 0 && <span className="del">exit {meta.exitCode}</span>}
        </span>
        {statusIcon}
        {hasBody && (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
      </div>
      {open && (
        <div className="tool-body">
          {stats && after !== undefined ? (
            <DiffBlock before={before ?? ''} after={after} />
          ) : meta?.results?.length ? (
            <div className="results">
              {meta.results.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  onClick={(e) => {
                    e.preventDefault()
                    void window.prism.openExternal(r.url)
                  }}
                >
                  {r.title}
                  <span className="u">{r.url}</span>
                </a>
              ))}
            </div>
          ) : (
            <pre>{block.output}</pre>
          )}
          {meta?.path && meta.before !== undefined && meta.after !== undefined && (
            <div className="tool-actions">
              <button className="btn sm" onClick={() => openDiff(`${baseName(meta.path!)} (AI edit)`, meta.before ?? '', meta.after!, absPath(meta.path!))}>
                Open diff
              </button>
              {!reverted && (
                <button className="btn sm ghost" onClick={() => void revert()}>
                  <Undo2 size={12} /> Revert
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {running && d.kind === 'exec' && block.output && !open && (
        <div className="tool-body">
          <pre>{block.output.split('\n').slice(-8).join('\n')}</pre>
        </div>
      )}
    </div>
  )
}
