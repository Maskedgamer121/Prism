import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  AtSign,
  Brain,
  ChevronDown,
  ChevronRight,
  Check,
  Circle,
  CircleCheck,
  CircleDot,
  History,
  Infinity as InfinityIcon,
  ListTodo,
  MessageCircleQuestion,
  Plus,
  Shield,
  Square,
  Trash2,
  X,
  AlertTriangle,
  Info,
  Bug,
  Sparkles,
  Globe,
  FlaskConical,
  ArrowRight,
  FileCode2
} from 'lucide-react'
import type { ChatMode, PermissionMode, PlanItem, UiBlock, UiMessage } from '@shared/types'
import { useApp, baseName, relToWorkspace, updateSettings, toast, errorText, shortModelName } from '../store'
import { allCommands, deleteChat, loadChat, newChat, sendMessage, stopChat } from '../lib/chat'
import { activeFilePath, openFile } from '../lib/editor'
import { acceptAll, rejectAll, reviewStats } from '../lib/review'
import { CONTEXT_SIZES, formatTokens, nextContextSize, raiseContext, setContextSize, useModelContextMax } from '../lib/context'
import { Markdown } from './Markdown'
import { ToolCard } from './ToolCard'
import { FileIcon, Menu, fuzzyScore, type MenuItem } from './ui'

const MODE_META: Record<ChatMode, { label: string; icon: React.ReactNode; hint: string }> = {
  agent: { label: 'Agent', icon: <InfinityIcon size={13} />, hint: 'Reads, edits files and runs commands' },
  ask: { label: 'Ask', icon: <MessageCircleQuestion size={13} />, hint: 'Answers and researches, read-only' },
  plan: { label: 'Plan', icon: <ListTodo size={13} />, hint: 'Investigates and writes a plan first' }
}

const PERM_META: Record<PermissionMode, { label: string; hint: string }> = {
  ask: { label: 'Ask first', hint: 'Approve every edit and command' },
  'auto-edit': { label: 'Auto-edit', hint: 'Edits apply automatically, commands need approval' },
  'full-auto': { label: 'Full auto', hint: 'Edits and commands run without asking' }
}

function PlanView({ items, title = 'Plan' }: { items: PlanItem[]; title?: string }) {
  const done = items.filter((i) => i.status === 'completed').length
  return (
    <div className="plan">
      <div className="plan-title">
        <ListTodo size={12} /> {title} · {done}/{items.length}
      </div>
      {items.map((it, i) => (
        <div key={i} className={`pi ${it.status}`}>
          {it.status === 'completed' ? (
            <CircleCheck size={14} color="var(--green)" />
          ) : it.status === 'in_progress' ? (
            <CircleDot size={14} color="var(--accent)" />
          ) : (
            <Circle size={14} color="var(--text-faint)" />
          )}
          <span>{it.content}</span>
        </div>
      ))}
    </div>
  )
}

function Thinking({ text, live }: { text: string; live: boolean }) {
  return (
    <details className="thinking">
      <summary>
        <Brain size={13} />
        <span className={live ? 'shimmer' : ''}>{live ? 'Thinking' : 'Thought'}</span>
        <ChevronDown size={12} />
      </summary>
      <div className="body">{text.trim() || '…'}</div>
    </details>
  )
}

function Block({ block, live }: { block: UiBlock; live: boolean }) {
  switch (block.kind) {
    case 'text':
      return <Markdown text={block.text} />
    case 'thinking':
      return <Thinking text={block.text} live={live} />
    case 'tool':
      return <ToolCard block={block} />
    case 'plan':
      return <PlanView items={block.items} />
    case 'notice':
      return (
        <div className={`notice ${block.level}`}>
          {block.level === 'info' ? <Info size={14} /> : <AlertTriangle size={14} />}
          <span>{block.text}</span>
          {block.action === 'raise-context' && <RaiseContextButton />}
        </div>
      )
  }
}

function RaiseContextButton() {
  const settings = useApp((s) => s.settings)
  const isOllama = settings?.providers.find((p) => p.id === settings.activeProviderId)?.kind === 'ollama'
  const max = useModelContextMax(settings?.activeModel, isOllama)
  if (!settings || !isOllama) return null
  const next = nextContextSize(settings.ollamaNumCtx, max)
  return (
    <button className="btn sm notice-action" disabled={!next} onClick={() => void raiseContext()} title={next ? 'Uses more memory; the model reloads once' : 'Already at the largest size for this model'}>
      {next ? `Raise to ${formatTokens(next)}` : `${formatTokens(settings.ollamaNumCtx)} (max)`}
    </button>
  )
}

const Message = memo(function Message({ msg, live }: { msg: UiMessage; live: boolean }) {
  if (msg.role === 'user') {
    const text = msg.blocks[0]?.kind === 'text' ? msg.blocks[0].text : ''
    return (
      <div className="msg user">
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="chips">
            {msg.attachments.map((a, i) => (
              <span key={i} className="chip" title={a.path}>
                <FileIcon name={a.path} size={12} />
                <span>{baseName(a.path)}</span>
                {a.kind === 'selection' && <span style={{ color: 'var(--text-faint)' }}>sel</span>}
              </span>
            ))}
          </div>
        )}
        <div className="bubble">{text}</div>
      </div>
    )
  }
  return (
    <div className="msg assistant">
      {msg.blocks.map((b, i) => (
        <Block key={i} block={b} live={live && i === msg.blocks.length - 1} />
      ))}
    </div>
  )
})

function EmptyChat() {
  const workspace = useApp((s) => s.workspace)
  const suggestions = [
    { icon: <ListTodo size={15} />, label: 'Start with a plan', sub: 'Align on the approach first', text: '/plan ' },
    { icon: <Bug size={15} />, label: 'Debug an issue', sub: 'Find the root cause and fix it', text: '/debug ' },
    { icon: <Sparkles size={15} />, label: workspace ? 'Explain this codebase' : 'Build something new', sub: workspace ? 'Architecture and key files' : 'Scaffold a project', text: workspace ? '/explain this codebase: what it does, how it is structured, and where to start' : '/new ' },
    { icon: <FlaskConical size={15} />, label: 'Write tests', sub: 'Detects your test framework', text: '/test ' },
    { icon: <Globe size={15} />, label: 'Search the web', sub: 'Docs, errors, latest versions', text: '/search ' }
  ]
  return (
    <div className="chat-empty">
      <h3>What should we build?</h3>
      {suggestions.map((s) => (
        <button key={s.label} className="suggestion" onClick={() => useApp.setState((st) => ({ composerDraft: s.text, composerFocus: st.composerFocus + 1 }))}>
          {s.icon}
          <span>
            {s.label} <span className="sub">{s.sub}</span>
          </span>
          <ArrowRight size={13} className="arrow" />
        </button>
      ))}
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
        Type <kbd>/</kbd> for commands, <kbd>@</kbd> to attach files. Select code and press <kbd>Ctrl</kbd>+<kbd>K</kbd> to edit it inline.
      </div>
    </div>
  )
}

// ---------- model picker ----------

export function useModelMenu(): () => MenuItem[] {
  const settings = useApp((s) => s.settings)
  const detected = useApp((s) => s.detected)
  return () => {
    if (!settings) return []
    const items: MenuItem[] = []
    for (const p of settings.providers.filter((x) => x.enabled)) {
      const status =
        p.kind === 'claude-code'
          ? detected?.claudeCli
            ? 'CLI found'
            : 'CLI not found'
          : p.kind === 'anthropic'
            ? p.hasKey
              ? ''
              : 'needs API key'
            : p.id === 'ollama'
              ? detected?.ollama
                ? 'running'
                : 'not running'
              : p.id === 'lmstudio'
                ? detected?.lmstudio
                  ? 'running'
                  : 'not running'
                : ''
      items.push({ header: `${p.name}${status ? ` · ${status}` : ''}` })
      if (!p.models.length) items.push({ label: 'No models yet — open Settings to refresh', disabled: false, onClick: () => useApp.setState({ settingsOpen: true }) })
      for (const m of p.models) {
        items.push({
          label: m,
          checked: settings.activeProviderId === p.id && settings.activeModel === m,
          onClick: () => void updateSettings({ activeProviderId: p.id, activeModel: m })
        })
      }
    }
    items.push({ separator: true }, { label: 'Manage models…', onClick: () => useApp.setState({ settingsOpen: true }) })
    return items
  }
}

async function refreshLocalModels(): Promise<void> {
  const s = useApp.getState().settings
  if (!s) return
  for (const p of s.providers) {
    if (!p.enabled || (p.kind !== 'ollama' && p.id !== 'lmstudio')) continue
    try {
      useApp.setState({ settings: await window.prism.settings.listModels(p.id) })
    } catch {
      /* not running */
    }
  }
}

// ---------- composer ----------

export function Composer({ center }: { center?: boolean }) {
  const settings = useApp((s) => s.settings)
  const running = useApp((s) => s.running)
  const chatMode = useApp((s) => s.chatMode)
  const attachments = useApp((s) => s.attachments)
  const includeActive = useApp((s) => s.includeActiveFile)
  const focusTick = useApp((s) => s.composerFocus)
  const draft = useApp((s) => s.composerDraft)
  const fileList = useApp((s) => s.fileList)
  const usage = useApp((s) => s.usage)
  useApp((s) => s.activeTabId)
  const active = activeFilePath()
  const [text, setText] = useState('')
  const [popupIndex, setPopupIndex] = useState(0)
  const [caret, setCaret] = useState(0)
  const [menu, setMenu] = useState<{ kind: 'mode' | 'model' | 'perm' | 'ctx'; rect: DOMRect } | null>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  const modelMenu = useModelMenu()

  useEffect(() => {
    if (draft !== null) {
      setText(draft)
      setCaret(draft.length)
      useApp.setState({ composerDraft: null })
    }
  }, [draft])
  useEffect(() => {
    if (focusTick) setTimeout(() => {
      ta.current?.focus()
      const len = ta.current?.value.length ?? 0
      ta.current?.setSelectionRange(len, len)
    }, 0)
  }, [focusTick])
  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`
  }, [text])

  // Slash-command popup: only while typing the command name.
  const slash = /^\/([\w-]*)$/.exec(text.slice(0, caret)) && !text.slice(0, caret).includes(' ')
  const slashItems = useMemo(() => {
    if (!slash) return []
    const q = text.slice(1, caret).toLowerCase()
    return allCommands().filter((c) => c.name.startsWith(q) || (q.length > 1 && c.description.toLowerCase().includes(q))).slice(0, 12)
  }, [slash, text, caret])

  // @-mention popup: the token right before the caret.
  const mention = /(^|\s)@([\w.\-/\\]*)$/.exec(text.slice(0, caret))
  const mentionItems = useMemo(() => {
    if (!mention) return []
    const q = mention[2]
    return fileList
      .map((f) => ({ f, score: fuzzyScore(q, f) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.f)
  }, [mention?.[2], fileList])

  const popupCount = slash ? slashItems.length : mention ? mentionItems.length : 0
  useEffect(() => setPopupIndex(0), [popupCount, text])

  const pick = (i: number) => {
    if (slash && slashItems[i]) {
      const next = `/${slashItems[i].name} `
      setText(next + text.slice(caret))
      setCaret(next.length)
      setTimeout(() => ta.current?.setSelectionRange(next.length, next.length), 0)
    } else if (mention && mentionItems[i]) {
      const start = caret - mention[2].length - 1
      const insert = `@${mentionItems[i]} `
      const next = text.slice(0, start) + insert + text.slice(caret)
      setText(next)
      const pos = start + insert.length
      setCaret(pos)
      setTimeout(() => ta.current?.setSelectionRange(pos, pos), 0)
    }
  }

  const submit = () => {
    if (!text.trim() || running) return
    const t = text
    setText('')
    setCaret(0)
    void sendMessage(t)
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (popupCount > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPopupIndex((i) => (i + 1) % popupCount)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPopupIndex((i) => (i - 1 + popupCount) % popupCount)
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && (mention || (slash && slashItems[popupIndex] && `/${slashItems[popupIndex].name}` !== text.trim())))) {
        e.preventDefault()
        pick(popupIndex)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setText(text + ' ')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const providerName = settings?.providers.find((p) => p.id === settings.activeProviderId)?.name ?? ''
  const isOllama = settings?.providers.find((p) => p.id === settings.activeProviderId)?.kind === 'ollama'
  const ctxMax = useModelContextMax(settings?.activeModel, isOllama)
  const ctxFill = isOllama && settings ? Math.min(1, (usage?.input ?? 0) / settings.ollamaNumCtx) : 0
  const mode = MODE_META[chatMode]
  const perm = settings ? PERM_META[settings.permissionMode] : PERM_META.ask

  const menuItems = (): MenuItem[] => {
    if (!menu) return []
    if (menu.kind === 'mode')
      return (Object.keys(MODE_META) as ChatMode[]).map((m) => ({
        label: MODE_META[m].label,
        sub: MODE_META[m].hint,
        icon: MODE_META[m].icon,
        checked: chatMode === m,
        onClick: () => useApp.setState({ chatMode: m })
      }))
    if (menu.kind === 'ctx')
      return CONTEXT_SIZES.map((c) => {
        const tooBig = ctxMax !== null && c.tokens > ctxMax
        return {
          label: `${formatTokens(c.tokens)} tokens`,
          sub: tooBig ? `This model supports up to ${formatTokens(ctxMax!)}` : c.hint,
          checked: settings?.ollamaNumCtx === c.tokens,
          disabled: tooBig,
          onClick: () => void setContextSize(c.tokens)
        }
      })
    if (menu.kind === 'perm')
      return (Object.keys(PERM_META) as PermissionMode[]).map((m) => ({
        label: PERM_META[m].label,
        sub: PERM_META[m].hint,
        checked: settings?.permissionMode === m,
        onClick: () => void updateSettings({ permissionMode: m })
      }))
    return modelMenu()
  }

  return (
    <div className="composer-wrap" style={center ? { padding: 0 } : undefined}>
      <div className="composer">
        {popupCount > 0 && (
          <div className="popup">
            <div className="head">{slash ? 'Commands' : 'Files'}</div>
            {slash
              ? slashItems.map((c, i) => (
                  <div key={c.name} className={`opt${i === popupIndex ? ' active' : ''}`} onMouseDown={(e) => (e.preventDefault(), pick(i))} onMouseEnter={() => setPopupIndex(i)}>
                    <span className="name">/{c.name}</span>
                    <span className="desc">{c.description}</span>
                  </div>
                ))
              : mentionItems.map((f, i) => (
                  <div key={f} className={`opt${i === popupIndex ? ' active' : ''}`} onMouseDown={(e) => (e.preventDefault(), pick(i))} onMouseEnter={() => setPopupIndex(i)}>
                    <FileIcon name={f} size={14} />
                    <span>{baseName(f)}</span>
                    <span className="desc">{f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : ''}</span>
                  </div>
                ))}
          </div>
        )}
        {(attachments.length > 0 || active) && (
          <div className="chips">
            {active && (
              <span className={`chip${includeActive ? '' : ' off'}`} title={includeActive ? 'The AI knows which file you are viewing. Click to exclude.' : 'Click to include the current file'}>
                <FileCode2 size={12} />
                <span style={{ cursor: 'pointer' }} onClick={() => useApp.setState({ includeActiveFile: !includeActive })}>
                  {baseName(active)}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>current</span>
              </span>
            )}
            {attachments.map((a, i) => (
              <span key={i} className="chip" title={relToWorkspace(a.path)}>
                <FileIcon name={a.path} size={12} />
                <span>
                  {baseName(a.path)}
                  {a.startLine ? `:${a.startLine}-${a.endLine}` : ''}
                </span>
                <button onClick={() => useApp.setState({ attachments: attachments.filter((_, j) => j !== i) })}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={ta}
          value={text}
          rows={center ? 3 : 2}
          placeholder={chatMode === 'plan' ? 'Describe what you want to build — I will plan it first…' : chatMode === 'ask' ? 'Ask anything about your code…' : 'Plan, build, / for commands, @ for files'}
          onChange={(e) => {
            setText(e.target.value)
            setCaret(e.target.selectionStart)
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={onKey}
        />
        <div className="bar">
          <button className={`pill mode-${chatMode}`} onClick={(e) => setMenu({ kind: 'mode', rect: e.currentTarget.getBoundingClientRect() })} title={mode.hint}>
            {mode.icon}
            <span>{mode.label}</span>
            <ChevronDown size={11} />
          </button>
          <button
            className="pill model-pill"
            onClick={(e) => {
              void refreshLocalModels()
              setMenu({ kind: 'model', rect: e.currentTarget.getBoundingClientRect() })
            }}
            title={`${providerName}: ${settings?.activeModel ?? ''}`}
          >
            <span>{settings?.activeModel ? shortModelName(settings.activeModel) : 'Choose a model'}</span>
            <ChevronDown size={11} />
          </button>
          <div className="grow" />
          {isOllama && settings ? (
            <button
              className={`ctx-meter${ctxFill > 0.9 ? ' full' : ctxFill > 0.65 ? ' high' : ''}`}
              onClick={(e) => setMenu({ kind: 'ctx', rect: e.currentTarget.getBoundingClientRect() })}
              title={`Context window: ${usage ? `${usage.input.toLocaleString()} of ` : ''}${settings.ollamaNumCtx.toLocaleString()} tokens in use. Click to change the size.`}
            >
              <span className="ctx-bar">
                <span style={{ width: `${Math.max(ctxFill * 100, usage ? 4 : 0)}%` }} />
              </span>
              {usage ? `${formatTokens(usage.input)}/` : ''}
              {formatTokens(settings.ollamaNumCtx)}
            </button>
          ) : usage && (
            <span className="usage" title={`Input ${usage.input.toLocaleString()} tokens · Output ${usage.output.toLocaleString()} tokens${usage.cacheRead ? ` · ${usage.cacheRead.toLocaleString()} from cache` : ''}`}>
              {usage.input >= 1000 ? `${(usage.input / 1000).toFixed(1)}k` : usage.input} ctx
            </span>
          )}
          <button className="icon-btn sm" title="Attach a file (@)" onClick={() => {
            setText((t) => (t && !t.endsWith(' ') ? t + ' @' : t + '@'))
            setCaret(text.length + (text && !text.endsWith(' ') ? 2 : 1))
            ta.current?.focus()
          }}>
            <AtSign size={14} />
          </button>
          {chatMode === 'agent' && (
            <button className="pill" onClick={(e) => setMenu({ kind: 'perm', rect: e.currentTarget.getBoundingClientRect() })} title={`${perm.label}: ${perm.hint}`}>
              <Shield size={12} style={{ flex: 'none' }} />
              <span>{perm.label}</span>
            </button>
          )}
          {running ? (
            <button className="send-btn stop" title="Stop" onClick={stopChat}>
              <Square size={10} fill="currentColor" />
            </button>
          ) : (
            <button className="send-btn" title="Send (Enter)" disabled={!text.trim()} onClick={submit}>
              <ArrowUp size={15} />
            </button>
          )}
        </div>
        {menu && <Menu items={menuItems()} anchor={menu.rect} onClose={() => setMenu(null)} up />}
      </div>
    </div>
  )
}

// ---------- review card ----------

function ReviewCard() {
  const reviews = useApp((s) => s.reviews)
  const running = useApp((s) => s.running)
  useApp((s) => s.tabs)
  const [open, setOpen] = useState(false)
  const list = Object.values(reviews)
  if (!list.length) return null
  return (
    <div className="review-card">
      <div className="rc-head">
        <button className="rc-toggle" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {list.length} file{list.length > 1 ? 's' : ''} changed{running ? '…' : ''}
        </button>
        <div className="grow" />
        <button className="btn sm ghost" disabled={running} onClick={() => void rejectAll()}>
          Reject all
        </button>
        <button className="btn sm primary" disabled={running} onClick={acceptAll}>
          <Check size={12} /> Accept all
        </button>
      </div>
      {open && (
        <div className="rc-files">
          {list.map((r) => {
            const st = reviewStats(r.path)
            return (
              <button key={r.path} className="rc-file" onClick={() => void openFile(r.path)} title={r.path}>
                <FileIcon name={r.path} size={13} />
                <span className="rc-name">{baseName(r.path)}</span>
                {r.baseline === null && <span className="rc-new">new</span>}
                <span className="grow" />
                <span className="add">+{st.added}</span>
                <span className="del">−{st.removed}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- panel ----------

export function ChatPanel({ center, width }: { center?: boolean; width?: number }) {
  const messages = useApp((s) => s.messages)
  const running = useApp((s) => s.running)
  const chatId = useApp((s) => s.chatId)
  const chatList = useApp((s) => s.chatList)
  const plan = useApp((s) => s.plan)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const [history, setHistory] = useState<DOMRect | null>(null)

  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const title = chatList.find((c) => c.id === chatId)?.title ?? (messages[0]?.blocks[0]?.kind === 'text' ? (messages[0].blocks[0] as { text: string }).text.slice(0, 60) : 'New Chat')
  const showPinnedPlan = running && plan.length > 0 && plan.some((p) => p.status !== 'completed')

  const historyItems: MenuItem[] = chatList.length
    ? chatList.slice(0, 30).map((c) => ({
        label: c.title,
        sub: new Date(c.updatedAt).toLocaleDateString(),
        checked: c.id === chatId,
        onClick: () => void loadChat(c.id).catch((err) => toast(errorText(err), 'error'))
      }))
    : [{ label: 'No previous chats', disabled: true }]

  return (
    <div className={`chat${center ? ' center' : ''}`} style={width ? { width } : undefined}>
      <div className="chat-header">
        <span className="title">{title}</span>
        <button className="icon-btn sm" title="New Chat (Ctrl+Shift+L)" onClick={newChat}>
          <Plus size={15} />
        </button>
        <button className="icon-btn sm" title="Chat History" onClick={(e) => setHistory(e.currentTarget.getBoundingClientRect())}>
          <History size={14} />
        </button>
        {messages.length > 0 && (
          <button
            className="icon-btn sm"
            title="Delete this chat"
            onClick={() => {
              if (window.confirm('Delete this chat?')) void deleteChat(chatId)
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
        {!center && (
          <button className="icon-btn sm" title="Close (Ctrl+I)" onClick={() => useApp.setState({ showChat: false })}>
            <X size={14} />
          </button>
        )}
      </div>
      <div
        className="chat-scroll"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
        }}
      >
        {messages.length === 0 ? <EmptyChat /> : messages.map((m, i) => <Message key={m.id} msg={m} live={running && i === messages.length - 1} />)}
        {running && messages[messages.length - 1]?.role === 'user' && (
          <div className="thinking">
            <span className="shimmer">Working…</span>
          </div>
        )}
      </div>
      <ReviewCard />
      {showPinnedPlan && (
        <div style={{ padding: '0 12px' }}>
          <PlanView items={plan} title="Current plan" />
        </div>
      )}
      <Composer center={center} />
      {history && <Menu items={historyItems} anchor={history} onClose={() => setHistory(null)} align="right" />}
    </div>
  )
}
