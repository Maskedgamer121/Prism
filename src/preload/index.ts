import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AgentEvent,
  ChatSummary,
  CompletionRequest,
  DirEntry,
  FileContent,
  GitStatus,
  InlineEditRequest,
  SearchHit,
  SendMessageRequest,
  Settings,
  SlashCommand,
  UiMessage,
  UpdateState
} from '@shared/types'
import type { CollectResult, Exercise, GraphicsEvent, LearnLanguage, LearnProgress, LearnTest, RunKind, RunMessage, RunRequest } from '@shared/learn'

function on<T extends unknown[]>(channel: string, cb: (...args: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, ...args: unknown[]) => cb(...(args as T))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  platform: process.platform,
  /** True only under the dev screenshot harness (PRISM_SHOT). */
  automation: Boolean(process.env.PRISM_SHOT),
  devShot: (path: string): Promise<void> => ipcRenderer.invoke('dev:shot', path),
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    save: (s: Settings): Promise<Settings> => ipcRenderer.invoke('settings:save', s),
    update: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:update', patch),
    listModels: (providerId: string): Promise<Settings> => ipcRenderer.invoke('models:list', providerId),
    detect: (): Promise<{ claudeCli: string | null; ollama: boolean; lmstudio: boolean }> => ipcRenderer.invoke('providers:detect'),
    pullOllama: (model: string): Promise<Settings> => ipcRenderer.invoke('ollama:pull', model),
    onPullProgress: (cb: (model: string, status: string, percent: number) => void) => on<[string, string, number]>('ollama:pull-progress', cb)
  },
  workspace: {
    get: (): Promise<string | null> => ipcRenderer.invoke('workspace:get'),
    pick: (): Promise<string | null> => ipcRenderer.invoke('workspace:pick'),
    open: (folder: string | null): Promise<string | null> => ipcRenderer.invoke('workspace:open', folder),
    newProject: (name: string): Promise<string | null> => ipcRenderer.invoke('workspace:newProject', name)
  },
  fs: {
    readDir: (p: string): Promise<DirEntry[]> => ipcRenderer.invoke('fs:readDir', p),
    readFile: (p: string): Promise<FileContent> => ipcRenderer.invoke('fs:readFile', p),
    writeFile: (p: string, content: string): Promise<void> => ipcRenderer.invoke('fs:writeFile', p, content),
    create: (p: string, isDir: boolean): Promise<string> => ipcRenderer.invoke('fs:create', p, isDir),
    rename: (from: string, to: string): Promise<string> => ipcRenderer.invoke('fs:rename', from, to),
    trash: (p: string): Promise<void> => ipcRenderer.invoke('fs:delete', p),
    deleteFile: (p: string): Promise<void> => ipcRenderer.invoke('fs:deleteFile', p),
    listFiles: (): Promise<string[]> => ipcRenderer.invoke('fs:listFiles'),
    search: (q: string, opts: { regex?: boolean; caseSensitive?: boolean; glob?: string }): Promise<SearchHit[]> => ipcRenderer.invoke('fs:search', q, opts),
    reveal: (p: string): Promise<void> => ipcRenderer.invoke('fs:reveal', p),
    onChanged: (cb: (paths: string[]) => void) => on<[string[]]>('fs:changed', cb)
  },
  git: {
    status: (): Promise<GitStatus> => ipcRenderer.invoke('git:status'),
    showHead: (rel: string): Promise<string> => ipcRenderer.invoke('git:showHead', rel),
    commit: (message: string): Promise<string> => ipcRenderer.invoke('git:commit', message),
    init: (): Promise<void> => ipcRenderer.invoke('git:init')
  },
  term: {
    create: (cols: number, rows: number): Promise<number> => ipcRenderer.invoke('term:create', cols, rows),
    write: (id: number, data: string) => ipcRenderer.send('term:write', id, data),
    resize: (id: number, cols: number, rows: number) => ipcRenderer.send('term:resize', id, cols, rows),
    kill: (id: number) => ipcRenderer.send('term:kill', id),
    onData: (cb: (id: number, data: string) => void) => on<[number, string]>('term:data', cb),
    onExit: (cb: (id: number, code: number) => void) => on<[number, number]>('term:exit', cb)
  },
  agent: {
    send: (req: SendMessageRequest): Promise<void> => ipcRenderer.invoke('agent:send', req),
    stop: (chatId: string): Promise<void> => ipcRenderer.invoke('agent:stop', chatId),
    approve: (requestId: string, decision: 'allow' | 'always' | 'deny'): Promise<void> => ipcRenderer.invoke('agent:approve', requestId, decision),
    onEvent: (cb: (chatId: string, e: AgentEvent) => void) => on<[string, AgentEvent]>('agent:event', cb)
  },
  chats: {
    list: (): Promise<ChatSummary[]> => ipcRenderer.invoke('chats:list'),
    load: (id: string): Promise<UiMessage[]> => ipcRenderer.invoke('chats:load', id),
    save: (id: string, ui: UiMessage[]): Promise<void> => ipcRenderer.invoke('chats:save', id, ui),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('chats:delete', id)
  },
  ai: {
    inlineEdit: (req: InlineEditRequest): Promise<string> => ipcRenderer.invoke('ai:inlineEdit', req),
    onInlineChunk: (cb: (requestId: string, delta: string) => void) => on<[string, string]>('ai:inlineChunk', cb),
    complete: (req: CompletionRequest): Promise<string> => ipcRenderer.invoke('ai:complete', req),
    cancel: (requestId: string): Promise<void> => ipcRenderer.invoke('ai:cancel', requestId)
  },
  commands: {
    custom: (): Promise<SlashCommand[]> => ipcRenderer.invoke('commands:custom')
  },
  knowledge: {
    list: (): Promise<string[]> => ipcRenderer.invoke('knowledge:list'),
    get: (topic: string): Promise<string | null> => ipcRenderer.invoke('knowledge:get', topic),
    openDir: (): Promise<string> => ipcRenderer.invoke('knowledge:openDir')
  },
  learn: {
    runtimes: (): Promise<{ python: string | null; javascript: string; lua: string }> => ipcRenderer.invoke('learn:runtimes'),
    run: (id: string, req: RunRequest): Promise<void> => ipcRenderer.invoke('learn:run', id, req),
    send: (id: string, ev: GraphicsEvent) => ipcRenderer.send('learn:send', id, ev),
    stdin: (id: string, text: string) => ipcRenderer.send('learn:stdin', id, text),
    stop: (id: string): Promise<void> => ipcRenderer.invoke('learn:stop', id),
    collect: (req: RunRequest, tests: LearnTest[]): Promise<CollectResult> => ipcRenderer.invoke('learn:collect', req, tests),
    onEvent: (cb: (id: string, msg: RunMessage) => void) => on<[string, RunMessage]>('learn:event', cb),
    getProgress: (): Promise<LearnProgress> => ipcRenderer.invoke('learn:progress:get'),
    saveProgress: (p: LearnProgress): Promise<void> => ipcRenderer.invoke('learn:progress:save', p),
    generate: (req: { language: LearnLanguage; kind: RunKind; topic: string; level: string; recentTitles: string[] }): Promise<Exercise> =>
      ipcRenderer.invoke('learn:generate', req),
    hint: (req: { language: LearnLanguage; kind?: RunKind; prompt: string; code: string; problem: string }): Promise<string> => ipcRenderer.invoke('learn:hint', req)
  },
  updates: {
    get: (): Promise<UpdateState> => ipcRenderer.invoke('update:get'),
    check: (): Promise<UpdateState> => ipcRenderer.invoke('update:check'),
    download: (): Promise<void> => ipcRenderer.invoke('update:download'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    onStatus: (cb: (s: UpdateState) => void) => on<[UpdateState]>('update:status', cb)
  },
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  onOpenFile: (cb: (path: string, line?: number) => void) => on<[string, number | undefined]>('editor:open', cb)
}

export type PrismApi = typeof api

contextBridge.exposeInMainWorld('prism', api)
