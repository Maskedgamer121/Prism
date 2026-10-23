import { create } from 'zustand'
import type { ChatMode, ChatSummary, ContextAttachment, PlanItem, Settings, UiMessage, UpdateState } from '@shared/types'

export type SidebarView = 'explorer' | 'search' | 'git' | 'knowledge'

export interface Tab {
  id: string
  kind: 'file' | 'diff' | 'text'
  title: string
  path?: string
  dirty?: boolean
  diff?: { original: string; modified: string; language: string; path?: string }
  text?: { content: string; language: string }
}

export interface Toast {
  id: number
  kind: 'info' | 'error' | 'success'
  text: string
}

export interface AppState {
  /** Main area: the code editor or the Learn tab. */
  view: 'code' | 'learn'
  /** The chat panel beside the Learn tab (separate from the editor's). */
  showLearnChat: boolean
  settings: Settings | null
  workspace: string | null
  fileList: string[]
  fsVersion: number
  gitVersion: number
  tabs: Tab[]
  activeTabId: string | null
  sidebarView: SidebarView
  showSidebar: boolean
  showPanel: boolean
  showChat: boolean
  chatOnly: boolean
  sidebarWidth: number
  chatWidth: number
  panelHeight: number
  palette: null | 'files' | 'commands'
  settingsOpen: boolean
  /** AI edits waiting for review, keyed by normalized path. baseline null = the AI created the file. */
  reviews: Record<string, { path: string; baseline: string | null }>
  update: UpdateState | null
  /** Section to show when settings open (e.g. 'about'). */
  settingsSection?: string
  toasts: Toast[]
  cursor: { line: number; col: number; language: string; eol: string } | null
  detected: { claudeCli: string | null; ollama: boolean; lmstudio: boolean } | null

  chatId: string
  chatList: ChatSummary[]
  messages: UiMessage[]
  running: boolean
  usage: { input: number; output: number; cacheRead?: number } | null
  plan: PlanItem[]
  chatMode: ChatMode
  attachments: ContextAttachment[]
  includeActiveFile: boolean
  composerFocus: number
  composerDraft: string | null
}

function loadLayout(): Partial<AppState> {
  try {
    return JSON.parse(localStorage.getItem('prism.layout') ?? '{}')
  } catch {
    return {}
  }
}

export const newId = (): string => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

export const useApp = create<AppState>(() => ({
  view: 'code',
  showLearnChat: false,
  settings: null,
  workspace: null,
  fileList: [],
  fsVersion: 0,
  gitVersion: 0,
  tabs: [],
  activeTabId: null,
  sidebarView: 'explorer',
  showSidebar: true,
  showPanel: false,
  showChat: true,
  chatOnly: false,
  sidebarWidth: 260,
  chatWidth: 420,
  panelHeight: 260,
  palette: null,
  settingsOpen: false,
  reviews: {},
  update: null,
  toasts: [],
  cursor: null,
  detected: null,

  chatId: newId(),
  chatList: [],
  messages: [],
  running: false,
  usage: null,
  plan: [],
  chatMode: 'agent',
  attachments: [],
  includeActiveFile: true,
  composerFocus: 0,
  composerDraft: null,
  ...loadLayout()
}))

useApp.subscribe((s, prev) => {
  if (
    s.sidebarWidth !== prev.sidebarWidth ||
    s.chatWidth !== prev.chatWidth ||
    s.panelHeight !== prev.panelHeight ||
    s.showSidebar !== prev.showSidebar ||
    s.showPanel !== prev.showPanel ||
    s.showChat !== prev.showChat ||
    s.view !== prev.view
  ) {
    try {
      localStorage.setItem(
        'prism.layout',
        JSON.stringify({
          sidebarWidth: s.sidebarWidth,
          chatWidth: s.chatWidth,
          panelHeight: s.panelHeight,
          showSidebar: s.showSidebar,
          showPanel: s.showPanel,
          showChat: s.showChat,
          view: s.view
        })
      )
    } catch {
      /* storage unavailable */
    }
  }
})

let toastId = 1
export function toast(text: string, kind: Toast['kind'] = 'info'): void {
  const id = toastId++
  useApp.setState((s) => ({ toasts: [...s.toasts, { id, kind, text }] }))
  setTimeout(() => useApp.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 7000 : 3500)
}

export function errorText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const settings = await window.prism.settings.update(patch)
  useApp.setState({ settings })
}

export function baseName(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

export function relToWorkspace(p: string): string {
  const ws = useApp.getState().workspace
  if (!ws) return p
  const norm = (x: string) => x.replace(/\\/g, '/')
  const a = norm(p)
  const b = norm(ws).replace(/\/$/, '')
  return a.toLowerCase().startsWith(b.toLowerCase() + '/') ? a.slice(b.length + 1) : a
}

export function joinPath(base: string, rel: string): string {
  const sep = base.includes('\\') ? '\\' : '/'
  return base.replace(/[\\/]+$/, '') + sep + rel.replace(/[\\/]+/g, sep)
}
