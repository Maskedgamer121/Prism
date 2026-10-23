import { app, ipcMain } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '@shared/types'
import { loadSettings } from './settings'

/**
 * Auto-update from GitHub Releases (electron-updater). The repository comes from the
 * `publish` block in electron-builder.yml, which is baked into app-update.yml at build time.
 */

let state: UpdateState = { status: 'idle', version: app.getVersion() }
let notify: (s: UpdateState) => void = () => {}

function set(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch }
  notify(state)
}

function configured(): boolean {
  const file = join(process.resourcesPath ?? '', 'app-update.yml')
  if (!existsSync(file)) return false
  return !/CHANGE_ME/.test(readFileSync(file, 'utf8'))
}

export async function checkForUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) {
    set({ status: 'dev', message: 'Updates are only checked in the installed app.' })
    return state
  }
  if (!configured()) {
    set({ status: 'unconfigured', message: 'No GitHub repository is set for updates yet.' })
    return state
  }
  try {
    set({ status: 'checking', message: undefined })
    await autoUpdater.checkForUpdates()
  } catch (err) {
    set({ status: 'error', message: err instanceof Error ? err.message : String(err) })
  }
  return state
}

export function initUpdater(send: (s: UpdateState) => void): void {
  notify = send
  autoUpdater.autoDownload = loadSettings().autoUpdate !== false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-available', (info) => set({ status: autoUpdater.autoDownload ? 'downloading' : 'available', latest: info.version, progress: 0 }))
  autoUpdater.on('update-not-available', () => set({ status: 'none', message: undefined }))
  autoUpdater.on('download-progress', (p) => set({ status: 'downloading', progress: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => set({ status: 'downloaded', latest: info.version, progress: 100 }))
  autoUpdater.on('error', (err) => set({ status: 'error', message: err?.message ?? String(err) }))

  ipcMain.handle('update:get', () => state)
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', async () => {
    set({ status: 'downloading', progress: 0 })
    await autoUpdater.downloadUpdate()
  })
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())

  if (app.isPackaged && configured()) {
    setTimeout(() => void checkForUpdates(), 15_000)
    setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000)
  }
}
