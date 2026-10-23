import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, mkdirSync, promises as fsp, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import type { CompletionRequest, InlineEditRequest, SendMessageRequest, Settings, SlashCommand, UiMessage } from '@shared/types'
import { Agent } from './agent/agent'
import { getTopic, listTopics, userDir } from './agent/knowledge'
import { findClaudeCli } from './agent/providers/claude-code'
import { listAnthropicModels } from './agent/providers/anthropic'
import { listOllamaModels, ollamaPull } from './agent/providers/ollama'
import { listOpenAIModels } from './agent/providers/openai'
import { gitCommitAll, gitInit, gitShowHead, gitStatus } from './git'
import { getProvider, getPublicSettings, loadSettings, rememberFolder, saveSettings, setProviderModels, updateSettings } from './settings'
import { createTerminal, killAllTerminals, killTerminal, resizeTerminal, writeTerminal } from './terminal'
import { getRoot, readDir, readFileSafe, resolveInWorkspace, searchText, setRoot, walkFiles } from './workspace'
import { registerLearnIpc, stopAllRuns } from './learn'
import { initUpdater } from './updater'

let win: BrowserWindow | null = null
const send = (channel: string, ...args: unknown[]) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}

const agent = new Agent({
  emit: (chatId, event) => send('agent:event', chatId, event),
  openFile: (path, line) => send('editor:open', path, line),
  fileChanged: (path) => send('fs:changed', [path])
})

function openWorkspace(folder: string | null): string | null {
  if (folder && (!existsSync(folder) || !statSync(folder).isDirectory())) folder = null
  setRoot(folder, (paths) => send('fs:changed', paths))
  if (folder) rememberFolder(folder)
  else updateSettings({ lastFolder: undefined })
  return getRoot()
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: '#141414',
    title: 'Prism',
    icon: join(__dirname, '../../build/icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? true : { color: '#141414', symbolColor: '#a8a8a8', height: 36 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false
    }
  })
  // The screenshot harness must not steal focus from whatever the developer is doing.
  win.on('ready-to-show', () => (process.env.PRISM_SHOT && !app.isPackaged ? win?.showInactive() : win?.show()))
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (!(devUrl && url.startsWith(devUrl)) && !url.startsWith('file:')) e.preventDefault()
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  setupScreenshotHarness(win)
}

/**
 * Dev-only harness: PRISM_SHOT=<png> captures the window after PRISM_SHOT_DELAY ms,
 * optionally running the JS in PRISM_SHOT_JS first. Used to check the UI headlessly.
 */
function setupScreenshotHarness(w: BrowserWindow): void {
  const out = process.env.PRISM_SHOT
  if (!out || app.isPackaged) return
  w.webContents.on('console-message', (e) => {
    const ev = e as unknown as { level?: string; message?: string }
    if (ev.level === 'error' || ev.level === 'warning') console.log(`[renderer ${ev.level}]`, ev.message)
  })
  w.webContents.once('did-finish-load', async () => {
    const steps = process.env.PRISM_SHOT_JS && existsSync(process.env.PRISM_SHOT_JS) ? readFileSync(process.env.PRISM_SHOT_JS, 'utf8') : ''
    const delay = Number(process.env.PRISM_SHOT_DELAY ?? 2500)
    await new Promise((r) => setTimeout(r, 1500))
    if (steps) {
      try {
        const result = await w.webContents.executeJavaScript(steps)
        if (result !== undefined) console.log('[shot-js]', JSON.stringify(result).slice(0, 2000))
      } catch (err) {
        console.log('[shot-js error]', err)
      }
    }
    await new Promise((r) => setTimeout(r, delay))
    const image = await w.webContents.capturePage()
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, image.toPNG())
    console.log('[shot] saved', out)
    if (process.env.PRISM_SHOT_QUIT) app.quit()
  })
}

function loadCustomCommands(): SlashCommand[] {
  const root = getRoot()
  if (!root) return []
  const out: SlashCommand[] = []
  for (const dir of ['.prism/commands', '.claude/commands', '.cursor/commands']) {
    const full = join(root, dir)
    if (!existsSync(full)) continue
    for (const f of readdirSync(full)) {
      if (!f.endsWith('.md')) continue
      const body = readFileSync(join(full, f), 'utf8')
      const fm = body.match(/^---\n([\s\S]*?)\n---\n?/)
      const description = fm?.[1].match(/description:\s*(.+)/)?.[1]?.trim() ?? body.replace(/^---[\s\S]*?---\n?/, '').split('\n').find((l) => l.trim())?.slice(0, 80) ?? ''
      out.push({ name: basename(f, '.md'), description, template: body.replace(/^---[\s\S]*?---\n?/, ''), source: 'project' })
    }
  }
  return out
}

function registerIpc(): void {
  // settings & providers
  ipcMain.handle('settings:get', () => getPublicSettings())
  // Autocomplete settings may have changed: load that model now so suggestions are instant.
  ipcMain.handle('settings:save', (_e, s: Settings) => {
    const out = saveSettings(s)
    void agent.warmAutocomplete()
    return out
  })
  ipcMain.handle('settings:update', (_e, patch: Partial<Settings>) => {
    const out = updateSettings(patch)
    if (patch.autocomplete) void agent.warmAutocomplete()
    return out
  })
  ipcMain.handle('models:list', async (_e, providerId: string) => {
    const p = getProvider(providerId)
    if (!p) throw new Error('Unknown provider')
    let models: string[]
    if (p.kind === 'anthropic') models = await listAnthropicModels(p)
    else if (p.kind === 'ollama') models = await listOllamaModels(p)
    else if (p.kind === 'openai') models = await listOpenAIModels(p)
    else models = p.models
    setProviderModels(providerId, models)
    return getPublicSettings()
  })
  ipcMain.handle('ollama:pull', async (_e, model: string) => {
    const p = getProvider('ollama')
    if (!p) throw new Error('Ollama is not set up.')
    await ollamaPull(p, model, (status, percent) => send('ollama:pull-progress', model, status, percent))
    setProviderModels('ollama', await listOllamaModels(p))
    return getPublicSettings()
  })
  ipcMain.handle('providers:detect', async () => {
    const s = loadSettings()
    const probe = async (url: string) => {
      try {
        return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok
      } catch {
        return false
      }
    }
    const ollama = s.providers.find((p) => p.id === 'ollama')?.baseUrl ?? 'http://localhost:11434'
    const lm = s.providers.find((p) => p.id === 'lmstudio')?.baseUrl ?? 'http://localhost:1234/v1'
    const [o, l] = await Promise.all([probe(`${ollama.replace(/\/v1\/?$/, '')}/api/tags`), probe(`${lm}/models`)])
    return { claudeCli: findClaudeCli(), ollama: o, lmstudio: l }
  })

  // workspace & files
  ipcMain.handle('workspace:get', () => getRoot())
  ipcMain.handle('workspace:pick', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'], title: 'Open Folder' })
    return r.canceled || !r.filePaths[0] ? null : openWorkspace(r.filePaths[0])
  })
  ipcMain.handle('workspace:open', (_e, folder: string | null) => openWorkspace(folder))
  ipcMain.handle('workspace:newProject', async (_e, name: string) => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'], title: 'Choose where to create the project' })
    if (r.canceled || !r.filePaths[0]) return null
    const folder = join(r.filePaths[0], name.replace(/[<>:"/\\|?*]/g, '-').trim() || 'new-project')
    mkdirSync(folder, { recursive: true })
    return openWorkspace(folder)
  })
  ipcMain.handle('fs:readDir', (_e, p: string) => readDir(p))
  ipcMain.handle('fs:readFile', (_e, p: string) => readFileSafe(p))
  ipcMain.handle('fs:writeFile', async (_e, p: string, content: string) => {
    await fsp.mkdir(dirname(p), { recursive: true })
    await fsp.writeFile(p, content, 'utf8')
  })
  ipcMain.handle('fs:create', async (_e, p: string, isDir: boolean) => {
    const abs = resolveInWorkspace(p)
    if (existsSync(abs)) throw new Error(`${basename(abs)} already exists`)
    if (isDir) await fsp.mkdir(abs, { recursive: true })
    else {
      await fsp.mkdir(dirname(abs), { recursive: true })
      await fsp.writeFile(abs, '', 'utf8')
    }
    return abs
  })
  ipcMain.handle('fs:rename', async (_e, from: string, to: string) => {
    const dest = resolveInWorkspace(to)
    await fsp.rename(resolveInWorkspace(from), dest)
    return dest
  })
  ipcMain.handle('fs:delete', async (_e, p: string) => shell.trashItem(resolveInWorkspace(p)))
  ipcMain.handle('fs:deleteFile', async (_e, p: string) => {
    const abs = resolveInWorkspace(p)
    if (existsSync(abs)) await fsp.unlink(abs)
  })
  ipcMain.handle('fs:listFiles', async () => {
    const root = getRoot()
    return root ? walkFiles(root) : []
  })
  ipcMain.handle('fs:search', (_e, q: string, opts: { regex?: boolean; caseSensitive?: boolean; glob?: string }) => searchText(q, { ...opts, maxResults: 2000 }))
  ipcMain.handle('fs:reveal', (_e, p: string) => shell.showItemInFolder(p))
  ipcMain.handle('shell:openExternal', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) return shell.openExternal(url)
  })

  // git
  ipcMain.handle('git:status', () => (getRoot() ? gitStatus(getRoot()!) : { isRepo: false, files: [] }))
  ipcMain.handle('git:showHead', (_e, rel: string) => gitShowHead(getRoot()!, rel))
  ipcMain.handle('git:commit', (_e, message: string) => gitCommitAll(getRoot()!, message))
  ipcMain.handle('git:init', () => gitInit(getRoot()!))

  // terminal
  ipcMain.handle('term:create', (_e, cols: number, rows: number) =>
    createTerminal(getRoot(), cols, rows, (id, data) => send('term:data', id, data), (id, code) => send('term:exit', id, code))
  )
  ipcMain.on('term:write', (_e, id: number, data: string) => writeTerminal(id, data))
  ipcMain.on('term:resize', (_e, id: number, cols: number, rows: number) => resizeTerminal(id, cols, rows))
  ipcMain.on('term:kill', (_e, id: number) => killTerminal(id))

  // agent & chats
  ipcMain.handle('agent:send', (_e, req: SendMessageRequest) => {
    void agent.send(req).catch((err) => send('agent:event', req.chatId, { type: 'error', message: String(err?.message ?? err) }))
  })
  ipcMain.handle('agent:stop', (_e, chatId: string) => agent.stop(chatId))
  ipcMain.handle('agent:approve', (_e, requestId: string, decision: 'allow' | 'always' | 'deny') => agent.resolveApproval(requestId, decision))
  ipcMain.handle('chats:list', () => agent.list())
  ipcMain.handle('chats:load', (_e, id: string) => agent.load(id))
  ipcMain.handle('chats:save', (_e, id: string, ui: UiMessage[]) => agent.saveUi(id, ui))
  ipcMain.handle('chats:delete', (_e, id: string) => agent.remove(id))
  ipcMain.handle('ai:inlineEdit', (_e, req: InlineEditRequest) => agent.inlineEdit(req, (delta) => send('ai:inlineChunk', req.requestId, delta)))
  ipcMain.handle('ai:complete', (_e, req: CompletionRequest) => agent.autocomplete(req))
  ipcMain.handle('ai:cancel', (_e, requestId: string) => agent.cancelRequest(requestId))
  ipcMain.handle('commands:custom', () => loadCustomCommands())
  ipcMain.handle('knowledge:list', () => listTopics())
  ipcMain.handle('knowledge:get', (_e, topic: string) => getTopic(topic))
  ipcMain.handle('knowledge:openDir', () => shell.openPath(userDir()))
  registerLearnIpc(agent, send)
  initUpdater((s) => send('update:status', s))
  ipcMain.handle('app:version', () => app.getVersion())
}

app.whenReady().then(() => {
  registerIpc()
  const s = loadSettings()
  // First run: pick a provider that works out of the box.
  if (!existsSync(join(app.getPath('userData'), 'settings.json'))) {
    if (findClaudeCli()) updateSettings({ activeProviderId: 'claude-code', activeModel: 'default' })
  }
  const argFolder = process.argv.slice(app.isPackaged ? 1 : 2).find((a) => !a.startsWith('-') && existsSync(a) && statSync(a).isDirectory())
  openWorkspace(argFolder ?? s.lastFolder ?? null)
  createWindow()
  void agent.warmAutocomplete()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  killAllTerminals()
  stopAllRuns()
  if (process.platform !== 'darwin') app.quit()
})
