import { useApp, baseName, toast, errorText, type Tab } from '../store'
import { languageFor, modelUri, monaco } from './monaco'

const savedVersion = new Map<string, number>()
let activeEditor: monaco.editor.IStandaloneCodeEditor | null = null
let pendingReveal: { path: string; line: number } | null = null

export function setActiveEditor(e: monaco.editor.IStandaloneCodeEditor | null): void {
  activeEditor = e
}

export function getActiveEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return activeEditor
}

export function getModel(path: string): monaco.editor.ITextModel | null {
  return monaco.editor.getModel(modelUri(path))
}

function setTab(id: string, patch: Partial<Tab>): void {
  useApp.setState((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
}

const autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

function refreshDirty(path: string): void {
  const m = getModel(path)
  if (!m) return
  const dirty = m.getAlternativeVersionId() !== savedVersion.get(path)
  const tab = useApp.getState().tabs.find((t) => t.id === path)
  if (tab && Boolean(tab.dirty) !== dirty) setTab(path, { dirty })
  if (dirty && useApp.getState().settings?.editor.autoSave === 'afterDelay') {
    clearTimeout(autoSaveTimers.get(path))
    autoSaveTimers.set(path, setTimeout(() => void saveFile(path), 1000))
  }
}

/** Saves every unsaved file when the "on focus change" auto-save mode is on. */
export function autoSaveOnBlur(): void {
  if (useApp.getState().settings?.editor.autoSave === 'onFocusChange') void saveAll()
}

async function ensureModel(path: string): Promise<monaco.editor.ITextModel | null> {
  let model = getModel(path)
  if (model) return model
  const file = await window.prism.fs.readFile(path)
  if (file.isBinary) {
    toast(`${baseName(path)} is a binary file and can't be opened in the editor.`)
    return null
  }
  if (file.tooLarge) {
    toast(`${baseName(path)} is larger than 5 MB.`)
    return null
  }
  model = monaco.editor.createModel(file.content, languageFor(path), modelUri(path))
  model.updateOptions({ tabSize: useApp.getState().settings?.editor.tabSize ?? 2 })
  savedVersion.set(path, model.getAlternativeVersionId())
  model.onDidChangeContent(() => refreshDirty(path))
  return model
}

export async function openFile(path: string, line?: number): Promise<void> {
  try {
    const model = await ensureModel(path)
    if (!model) return
    const s = useApp.getState()
    if (!s.tabs.some((t) => t.id === path)) {
      useApp.setState({ tabs: [...s.tabs, { id: path, kind: 'file', title: baseName(path), path }] })
    }
    useApp.setState({ activeTabId: path })
    if (line) {
      pendingReveal = { path, line }
      setTimeout(flushReveal, 30)
    }
  } catch (err) {
    toast(`Couldn't open ${baseName(path)}: ${errorText(err)}`, 'error')
  }
}

export function flushReveal(): void {
  if (!pendingReveal || !activeEditor) return
  const model = activeEditor.getModel()
  if (!model || model.uri.toString() !== modelUri(pendingReveal.path).toString()) return
  const line = Math.min(pendingReveal.line, model.getLineCount())
  activeEditor.revealLineInCenter(line)
  activeEditor.setPosition({ lineNumber: line, column: 1 })
  activeEditor.focus()
  pendingReveal = null
}

export async function saveFile(path: string): Promise<void> {
  const model = getModel(path)
  if (!model) return
  try {
    await window.prism.fs.writeFile(path, model.getValue())
    savedVersion.set(path, model.getAlternativeVersionId())
    refreshDirty(path)
  } catch (err) {
    toast(`Save failed: ${errorText(err)}`, 'error')
  }
}

export async function saveActive(): Promise<void> {
  const { activeTabId, tabs } = useApp.getState()
  const tab = tabs.find((t) => t.id === activeTabId)
  if (tab?.kind === 'file' && tab.path) await saveFile(tab.path)
}

export async function saveAll(): Promise<void> {
  for (const t of useApp.getState().tabs) if (t.kind === 'file' && t.dirty && t.path) await saveFile(t.path)
}

export function closeTab(id: string): void {
  const s = useApp.getState()
  const tab = s.tabs.find((t) => t.id === id)
  if (!tab) return
  if (tab.dirty && !window.confirm(`${tab.title} has unsaved changes. Close it anyway and discard them?`)) return
  const idx = s.tabs.findIndex((t) => t.id === id)
  const tabs = s.tabs.filter((t) => t.id !== id)
  let active = s.activeTabId
  if (active === id) active = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null
  useApp.setState({ tabs, activeTabId: active })
  if (tab.kind === 'file' && tab.path) {
    getModel(tab.path)?.dispose()
    savedVersion.delete(tab.path)
  }
}

export function closeAllTabs(): void {
  for (const t of [...useApp.getState().tabs]) closeTab(t.id)
}

/** Reloads open, unmodified files that changed on disk (e.g. edited by the agent). */
export async function reloadFromDisk(paths: string[]): Promise<void> {
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase()
  const changed = new Set(paths.map(norm))
  for (const model of monaco.editor.getModels()) {
    const path = model.uri.fsPath
    if (!changed.has(norm(path))) continue
    const key = Array.from(savedVersion.keys()).find((k) => norm(k) === norm(path))
    if (!key) continue
    if (model.getAlternativeVersionId() !== savedVersion.get(key)) continue
    try {
      const file = await window.prism.fs.readFile(key)
      if (file.isBinary || file.tooLarge || file.content === model.getValue()) continue
      // pushEditOperations keeps the change on the undo stack, so Ctrl+Z undoes an AI edit.
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text: file.content }], () => null)
      savedVersion.set(key, model.getAlternativeVersionId())
      refreshDirty(key)
    } catch {
      /* file deleted */
    }
  }
}

export function openDiff(title: string, original: string, modified: string, path?: string): void {
  const id = `diff:${path ?? title}`
  const tab: Tab = { id, kind: 'diff', title, diff: { original, modified, language: path ? languageFor(path) : 'plaintext', path } }
  useApp.setState((s) => ({ tabs: s.tabs.some((t) => t.id === id) ? s.tabs.map((t) => (t.id === id ? tab : t)) : [...s.tabs, tab], activeTabId: id }))
}

export function openTextTab(id: string, title: string, content: string, language = 'markdown'): void {
  const tab: Tab = { id, kind: 'text', title, text: { content, language } }
  useApp.setState((s) => ({ tabs: s.tabs.some((t) => t.id === id) ? s.tabs.map((t) => (t.id === id ? tab : t)) : [...s.tabs, tab], activeTabId: id }))
}

export function activeFilePath(): string | null {
  const { tabs, activeTabId } = useApp.getState()
  const tab = tabs.find((t) => t.id === activeTabId)
  return tab?.kind === 'file' ? (tab.path ?? null) : null
}

/** Current selection in the active editor, if any. */
export function activeSelection(): { path: string; text: string; startLine: number; endLine: number } | null {
  const path = activeFilePath()
  if (!activeEditor || !path) return null
  const sel = activeEditor.getSelection()
  const model = activeEditor.getModel()
  if (!sel || !model || sel.isEmpty()) return null
  return { path, text: model.getValueInRange(sel), startLine: sel.startLineNumber, endLine: sel.endLineNumber }
}

export function runEditorAction(id: string): void {
  if (!activeEditor) {
    toast('Open a file first.')
    return
  }
  activeEditor.focus()
  activeEditor.trigger('menu', id, null)
}
