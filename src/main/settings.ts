import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ProviderConfig, Settings } from '@shared/types'

const ANTHROPIC_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1']

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: 'anthropic', name: 'Claude (Anthropic API)', kind: 'anthropic', models: ANTHROPIC_MODELS, enabled: true, builtin: true },
  { id: 'claude-code', name: 'Claude Code (subscription)', kind: 'claude-code', models: ['default', 'opus', 'sonnet', 'haiku'], enabled: true, builtin: true },
  { id: 'ollama', name: 'Ollama (local)', kind: 'ollama', baseUrl: 'http://localhost:11434', models: [], enabled: true, builtin: true },
  { id: 'lmstudio', name: 'LM Studio (local)', kind: 'openai', baseUrl: 'http://localhost:1234/v1', models: [], enabled: true, builtin: true },
  { id: 'openai-compatible', name: 'OpenAI-compatible', kind: 'openai', baseUrl: 'https://api.openai.com/v1', models: [], enabled: true, builtin: true }
]

const DEFAULTS: Settings = {
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'anthropic',
  activeModel: 'claude-opus-5-5',
  effort: 'high',
  permissionMode: 'ask',
  chatMode: 'agent',
  ollamaNumCtx: 16384,
  claudeServerWebSearch: false,
  autocomplete: { enabled: false, providerId: 'ollama', model: '' },
  autoUpdate: true,
  editor: {
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    tabSize: 2,
    wordWrap: false,
    minimap: true,
    autoSave: 'afterDelay'
  },
  recentFolders: []
}

const dir = () => app.getPath('userData')
const settingsPath = () => join(dir(), 'settings.json')
const secretsPath = () => join(dir(), 'secrets.json')

let cache: Settings | null = null
let secrets: Record<string, string> = {}

function loadSecrets(): void {
  secrets = {}
  if (!existsSync(secretsPath())) return
  try {
    const raw = JSON.parse(readFileSync(secretsPath(), 'utf8')) as Record<string, string>
    for (const [id, value] of Object.entries(raw)) {
      const buf = Buffer.from(value, 'base64')
      secrets[id] = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8')
    }
  } catch {
    secrets = {}
  }
}

function saveSecrets(): void {
  const out: Record<string, string> = {}
  for (const [id, value] of Object.entries(secrets)) {
    if (!value) continue
    const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(value) : Buffer.from(value, 'utf8')
    out[id] = buf.toString('base64')
  }
  writeFileSync(secretsPath(), JSON.stringify(out, null, 2))
}

export function loadSettings(): Settings {
  if (cache) return cache
  mkdirSync(dir(), { recursive: true })
  loadSecrets()
  let stored: Partial<Settings> = {}
  if (existsSync(settingsPath())) {
    try {
      stored = JSON.parse(readFileSync(settingsPath(), 'utf8'))
    } catch {
      stored = {}
    }
  }
  const providers = [...(stored.providers ?? [])]
  // Make sure every built-in preset exists (new presets appear after upgrades).
  for (const preset of DEFAULT_PROVIDERS) {
    const existing = providers.find((p) => p.id === preset.id)
    if (!existing) providers.push({ ...preset })
    else if (preset.kind === 'anthropic') existing.models = Array.from(new Set([...preset.models, ...existing.models]))
  }
  cache = {
    ...DEFAULTS,
    ...stored,
    providers,
    autocomplete: { ...DEFAULTS.autocomplete, ...stored.autocomplete },
    editor: { ...DEFAULTS.editor, ...stored.editor }
  }
  return cache
}

export function saveSettings(next: Settings): Settings {
  const current = loadSettings()
  const providers = next.providers.map((p) => {
    // A non-empty apiKey coming from the renderer means "replace the key";
    // an empty string means "remove it"; undefined means "keep it".
    if (p.apiKey !== undefined) {
      if (p.apiKey) secrets[p.id] = p.apiKey
      else delete secrets[p.id]
    }
    const { apiKey: _drop, hasKey: _has, ...rest } = p
    return rest
  })
  cache = { ...current, ...next, providers }
  writeFileSync(settingsPath(), JSON.stringify(cache, null, 2))
  saveSecrets()
  return getPublicSettings()
}

/** Settings safe to hand to the renderer: keys are replaced by `hasKey`. */
export function getPublicSettings(): Settings {
  const s = loadSettings()
  return {
    ...s,
    providers: s.providers.map((p) => ({ ...p, apiKey: undefined, hasKey: Boolean(secrets[p.id]) }))
  }
}

export function getProvider(id: string): ProviderConfig | undefined {
  const p = loadSettings().providers.find((x) => x.id === id)
  return p ? { ...p, apiKey: secrets[p.id] } : undefined
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const s = loadSettings()
  cache = { ...s, ...patch }
  writeFileSync(settingsPath(), JSON.stringify(cache, null, 2))
  return getPublicSettings()
}

export function rememberFolder(folder: string): void {
  const s = loadSettings()
  const recent = [folder, ...s.recentFolders.filter((f) => f.toLowerCase() !== folder.toLowerCase())].slice(0, 10)
  updateSettings({ recentFolders: recent, lastFolder: folder })
}

export function setProviderModels(id: string, models: string[]): void {
  const s = loadSettings()
  const p = s.providers.find((x) => x.id === id)
  if (!p) return
  p.models = p.kind === 'anthropic' ? Array.from(new Set([...ANTHROPIC_MODELS, ...models])) : models
  writeFileSync(settingsPath(), JSON.stringify(s, null, 2))
}
