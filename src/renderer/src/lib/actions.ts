import { useApp, toast, errorText, joinPath, baseName } from '../store'
import { askText } from '../components/Dialog'
import { addSelectionToChat, newChat, refreshCustomCommands } from './chat'
import { closeAllTabs, openFile, runEditorAction, saveActive, saveAll, closeTab } from './editor'

export const bus = new EventTarget()
export const emit = (name: string, detail?: unknown) => bus.dispatchEvent(new CustomEvent(name, { detail }))

/** fs:changed fires in bursts (installs, builds); run expensive refreshes once per burst. */
export function onFsChangedDebounced(cb: () => void, ms = 400): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const off = window.prism.fs.onChanged(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(cb, ms)
  })
  return () => {
    if (timer) clearTimeout(timer)
    off()
  }
}

export async function refreshFileList(): Promise<void> {
  const files = await window.prism.fs.listFiles().catch(() => [] as string[])
  useApp.setState({ fileList: files })
}

export async function setWorkspace(folder: string | null): Promise<void> {
  closeAllTabs()
  if (useApp.getState().tabs.some((t) => t.dirty)) return
  const ws = await window.prism.workspace.open(folder)
  useApp.setState({ workspace: ws, chatOnly: false, fsVersion: useApp.getState().fsVersion + 1, settings: await window.prism.settings.get() })
  newChat()
  await Promise.all([refreshFileList(), refreshCustomCommands()])
  useApp.setState({ chatList: await window.prism.chats.list() })
}

export async function openFolder(): Promise<void> {
  const picked = await window.prism.workspace.pick()
  if (picked) {
    await setWorkspace(picked)
  }
}

const BAD_NAME = /[<>:"|?*]/

export async function newProject(): Promise<void> {
  const name = await askText({
    title: 'New project',
    message: 'Name your project. Next you’ll choose the folder to create it in.',
    value: 'my-app',
    confirm: 'Choose location…',
    validate: (v) => (BAD_NAME.test(v) || /[\\/]/.test(v) ? 'A project name can’t contain \\ / : * ? " < > |' : null)
  })
  if (!name) return
  try {
    const folder = await window.prism.workspace.newProject(name)
    if (!folder) return
    useApp.setState({ view: 'code' })
    await setWorkspace(folder)
    toast(`Created ${name}`, 'success')
  } catch (err) {
    toast(errorText(err), 'error')
  }
}

export async function newFile(): Promise<void> {
  const ws = useApp.getState().workspace
  if (!ws) {
    toast('Open or create a folder first — files live inside a project folder.')
    return
  }
  const name = await askText({
    title: 'New file',
    message: 'File name, or a path inside the project like src/utils.py. Missing folders are created.',
    value: 'untitled.txt',
    confirm: 'Create',
    validate: (v) => (BAD_NAME.test(v) ? 'A file name can’t contain : * ? " < > |' : null)
  })
  if (!name) return
  try {
    const abs = await window.prism.fs.create(joinPath(ws, name), false)
    useApp.setState({ view: 'code' })
    await openFile(abs)
    void refreshFileList()
  } catch (err) {
    toast(errorText(err), 'error')
  }
}

export function toggle(key: 'showSidebar' | 'showPanel' | 'showChat'): void {
  const s = useApp.getState()
  // From the Learn tab, sidebar and terminal shortcuts take you back to the editor.
  if (s.view === 'learn' && key !== 'showChat') {
    useApp.setState({ view: 'code', [key]: true })
    return
  }
  useApp.setState({ [key]: !s[key] } as Partial<typeof s>)
}

export function showView(view: 'explorer' | 'search' | 'git' | 'knowledge'): void {
  const s = useApp.getState()
  if (s.view === 'learn') {
    useApp.setState({ view: 'code', sidebarView: view, showSidebar: true })
    return
  }
  if (s.showSidebar && s.sidebarView === view) useApp.setState({ showSidebar: false })
  else useApp.setState({ sidebarView: view, showSidebar: true })
}

/** Starts a fresh chat and makes sure it's on screen with the cursor in the message box. */
export function startNewChat(): void {
  newChat()
  revealChat()
}

/** Opens whichever chat is visible in the current view and focuses its message box. */
export function revealChat(): void {
  const s = useApp.getState()
  if (s.view === 'learn') useApp.setState({ showLearnChat: true, composerFocus: s.composerFocus + 1 })
  // With no folder open the welcome page is the chat.
  else if (!s.workspace) useApp.setState({ composerFocus: s.composerFocus + 1 })
  else useApp.setState({ showChat: true, composerFocus: s.composerFocus + 1 })
}

export function focusChat(): void {
  const s = useApp.getState()
  if (s.view === 'learn') {
    useApp.setState({ showLearnChat: !s.showLearnChat, composerFocus: s.composerFocus + 1 })
    return
  }
  if (!s.workspace) return revealChat()
  if (s.showChat && document.activeElement?.closest('.chat')) useApp.setState({ showChat: false })
  else useApp.setState({ showChat: true, composerFocus: s.composerFocus + 1 })
}

export interface Command {
  id: string
  title: string
  shortcut?: string
  run: () => void
}

export function commands(): Command[] {
  const s = useApp.getState()
  return [
    { id: 'file.openFolder', title: 'File: Open Folder…', shortcut: 'Ctrl+O', run: () => void openFolder() },
    { id: 'file.newProject', title: 'File: New Project…', run: () => void newProject() },
    { id: 'file.new', title: 'File: New File…', shortcut: 'Ctrl+N', run: () => void newFile() },
    { id: 'file.save', title: 'File: Save', shortcut: 'Ctrl+S', run: () => void saveActive() },
    { id: 'file.saveAll', title: 'File: Save All', shortcut: 'Ctrl+Alt+S', run: () => void saveAll() },
    { id: 'file.close', title: 'File: Close Editor', shortcut: 'Ctrl+W', run: () => s.activeTabId && closeTab(s.activeTabId) },
    { id: 'file.closeFolder', title: 'File: Close Folder', run: () => void setWorkspace(null) },
    { id: 'go.file', title: 'Go to File…', shortcut: 'Ctrl+P', run: () => useApp.setState({ palette: 'files' }) },
    { id: 'view.explorer', title: 'View: Explorer', shortcut: 'Ctrl+Shift+E', run: () => showView('explorer') },
    { id: 'view.search', title: 'View: Search in Files', shortcut: 'Ctrl+Shift+F', run: () => useApp.setState({ view: 'code', sidebarView: 'search', showSidebar: true }) },
    { id: 'view.git', title: 'View: Source Control', shortcut: 'Ctrl+Shift+G', run: () => showView('git') },
    { id: 'view.knowledge', title: 'View: Knowledge Base', run: () => showView('knowledge') },
    { id: 'view.sidebar', title: 'View: Toggle Sidebar', shortcut: 'Ctrl+B', run: () => toggle('showSidebar') },
    { id: 'view.panel', title: 'View: Toggle Terminal', shortcut: 'Ctrl+J', run: () => toggle('showPanel') },
    { id: 'view.chat', title: 'View: Toggle AI Chat', shortcut: 'Ctrl+I', run: () => focusChat() },
    { id: 'ai.newChat', title: 'AI: New Chat', shortcut: 'Ctrl+Shift+L', run: () => startNewChat() },
    { id: 'ai.addSelection', title: 'AI: Add Selection to Chat', shortcut: 'Ctrl+L', run: () => addSelectionToChat() },
    { id: 'ai.inlineEdit', title: 'AI: Edit Selection Inline', shortcut: 'Ctrl+K', run: () => emit('inline-edit') },
    { id: 'ai.mode.agent', title: 'AI: Switch to Agent Mode', run: () => useApp.setState({ chatMode: 'agent' }) },
    { id: 'ai.mode.ask', title: 'AI: Switch to Ask Mode', run: () => useApp.setState({ chatMode: 'ask' }) },
    { id: 'ai.mode.plan', title: 'AI: Switch to Plan Mode', run: () => useApp.setState({ chatMode: 'plan' }) },
    { id: 'edit.find', title: 'Edit: Find', shortcut: 'Ctrl+F', run: () => runEditorAction('actions.find') },
    { id: 'edit.replace', title: 'Edit: Replace', shortcut: 'Ctrl+H', run: () => runEditorAction('editor.action.startFindReplaceAction') },
    { id: 'edit.format', title: 'Edit: Format Document', shortcut: 'Shift+Alt+F', run: () => runEditorAction('editor.action.formatDocument') },
    { id: 'edit.comment', title: 'Edit: Toggle Line Comment', shortcut: 'Ctrl+/', run: () => runEditorAction('editor.action.commentLine') },
    { id: 'edit.goToLine', title: 'Go to Line…', shortcut: 'Ctrl+G', run: () => runEditorAction('editor.action.gotoLine') },
    { id: 'terminal.new', title: 'Terminal: New Terminal', shortcut: 'Ctrl+Shift+`', run: () => emit('terminal-new') },
    { id: 'settings.open', title: 'Preferences: Open Settings', shortcut: 'Ctrl+,', run: () => useApp.setState({ settingsOpen: true }) },
    { id: 'knowledge.folder', title: 'Knowledge: Open Custom Knowledge Folder', run: () => void window.prism.knowledge.openDir() },
    ...s.settings!.recentFolders.slice(0, 6).map((f) => ({ id: `recent.${f}`, title: `Open Recent: ${baseName(f)}`, run: () => void setWorkspace(f) }))
  ]
}

/** Global shortcuts. Returns true when handled. */
export function handleShortcut(e: KeyboardEvent): boolean {
  const ctrl = e.ctrlKey || e.metaKey
  if (!ctrl && !(e.key === 'F1')) return false
  const k = e.key.toLowerCase()
  const run = (fn: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
    return true
  }
  if (e.key === 'F1' || (ctrl && e.shiftKey && k === 'p')) return run(() => useApp.setState({ palette: 'commands' }))
  if (ctrl && e.shiftKey) {
    if (k === 'e') return run(() => showView('explorer'))
    if (k === 'f') return run(() => useApp.setState({ view: 'code', sidebarView: 'search', showSidebar: true }))
    if (k === 'g') return run(() => showView('git'))
    if (k === 'l') return run(() => startNewChat())
    if (e.code === 'Backquote') return run(() => {
      useApp.setState({ showPanel: true })
      emit('terminal-new')
    })
    return false
  }
  if (e.altKey) {
    if (k === 's') return run(() => void saveAll())
    if (k === 'b') return run(() => toggle('showChat'))
    return false
  }
  switch (k) {
    case 'p':
      return run(() => useApp.setState({ palette: 'files' }))
    case 'o':
      return run(() => void openFolder())
    case 'n':
      return run(() => void newFile())
    case 's':
      return run(() => void saveActive())
    case 'w':
      return run(() => {
        const id = useApp.getState().activeTabId
        if (id) closeTab(id)
      })
    case 'b':
      return run(() => toggle('showSidebar'))
    case 'j':
      return run(() => toggle('showPanel'))
    case 'i':
      return run(() => focusChat())
    case 'l':
      return run(() => addSelectionToChat())
    case 'k':
      return run(() => emit('inline-edit'))
    case ',':
      return run(() => useApp.setState({ settingsOpen: true }))
  }
  if (e.code === 'Backquote') return run(() => toggle('showPanel'))
  return false
}
