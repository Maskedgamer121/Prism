import { useEffect, useRef, useState } from 'react'
import { Bot, BookOpen, ChevronDown, ChevronRight, Code2, Cpu, ExternalLink, Info, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import type { Effort, PermissionMode, ProviderConfig, Settings } from '@shared/types'
import { useApp, toast, errorText } from '../store'
import { Switch } from './ui'
import { Select, type SelectOption } from './Select'

type Section = 'models' | 'agent' | 'editor' | 'autocomplete' | 'knowledge' | 'about'

const HELP: Record<string, React.ReactNode> = {
  anthropic: (
    <>
      Get a key at{' '}
      <a href="#" onClick={(e) => (e.preventDefault(), void window.prism.openExternal('https://console.anthropic.com/settings/keys'))}>
        console.anthropic.com
      </a>
      . Keys are encrypted with your OS keychain and never leave this computer except to call Anthropic.
    </>
  ),
  'claude-code': (
    <>
      Runs the <code>claude</code> CLI in headless mode, so it uses your Claude Pro/Max subscription. Claude Code brings its own tools. Install from{' '}
      <a href="#" onClick={(e) => (e.preventDefault(), void window.prism.openExternal('https://claude.com/claude-code'))}>
        claude.com/claude-code
      </a>{' '}
      and run <code>claude</code> once in a terminal to sign in.
    </>
  ),
  ollama: (
    <>
      Install from{' '}
      <a href="#" onClick={(e) => (e.preventDefault(), void window.prism.openExternal('https://ollama.com/download'))}>
        ollama.com
      </a>
      , then pull a tool-capable model, e.g. <code>ollama pull qwen2.5-coder:7b</code> or <code>qwen3:8b</code>.
    </>
  ),
  lmstudio: <>In LM Studio open the Developer tab and start the server (default port 1234). Load a model that supports tool use.</>,
  'openai-compatible': <>Works with OpenAI, OpenRouter, Groq, Together, DeepSeek, vLLM, llama.cpp server and anything else with an OpenAI-style /v1 API.</>
}

function ProviderCard({ p, onChange, onRemove, detected, persist }: { p: ProviderConfig; onChange: (p: ProviderConfig) => void; onRemove?: () => void; detected: ReturnType<typeof useApp.getState>['detected']; persist: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [manualModel, setManualModel] = useState('')

  const status =
    p.kind === 'claude-code'
      ? detected?.claudeCli
        ? `CLI: ${detected.claudeCli}`
        : 'CLI not found'
      : p.kind === 'anthropic'
        ? p.hasKey
          ? 'Key saved'
          : 'No key'
        : p.id === 'ollama'
          ? detected?.ollama
            ? 'Running'
            : 'Not running'
          : p.id === 'lmstudio'
            ? detected?.lmstudio
              ? 'Running'
              : 'Not running'
            : p.hasKey
              ? 'Key saved'
              : ''

  const refresh = async () => {
    setBusy(true)
    try {
      await persist()
      const s = await window.prism.settings.listModels(p.id)
      useApp.setState({ settings: s })
      const fresh = s.providers.find((x) => x.id === p.id)
      if (fresh) onChange({ ...p, models: fresh.models })
      toast(`${p.name}: ${fresh?.models.length ?? 0} models`, 'success')
    } catch (err) {
      toast(`${p.name}: ${errorText(err)}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="provider">
      <div className="ph" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="n">{p.name}</span>
        <span className="k">{status}</span>
        <span style={{ flex: 1 }} />
        <span onClick={(e) => e.stopPropagation()}>
          <Switch on={p.enabled} onChange={(v) => onChange({ ...p, enabled: v })} />
        </span>
      </div>
      {open && (
        <div className="pb">
          {!p.builtin && (
            <>
              <label>Name</label>
              <input className="input" value={p.name} onChange={(e) => onChange({ ...p, name: e.target.value })} />
            </>
          )}
          {p.kind !== 'claude-code' && p.kind !== 'anthropic' && (
            <>
              <label>Base URL</label>
              <input className="input" value={p.baseUrl ?? ''} onChange={(e) => onChange({ ...p, baseUrl: e.target.value })} />
            </>
          )}
          {(p.kind === 'anthropic' || p.kind === 'openai') && (
            <>
              <label>API key</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  type="password"
                  placeholder={p.hasKey ? '•••••••• saved — type to replace' : p.kind === 'anthropic' ? 'sk-ant-…' : 'optional for local servers'}
                  value={keyDraft}
                  onChange={(e) => {
                    setKeyDraft(e.target.value)
                    onChange({ ...p, apiKey: e.target.value || undefined })
                  }}
                />
                {p.hasKey && (
                  <button className="btn sm ghost" onClick={() => onChange({ ...p, apiKey: '', hasKey: false })} title="Remove saved key">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </>
          )}
          <label>Models</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="model-tags">
              {p.models.length ? p.models.map((m) => <span key={m}>{m}</span>) : <span>none yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {p.kind !== 'claude-code' && (
                <button className="btn sm" disabled={busy} onClick={() => void refresh()}>
                  <RefreshCw size={12} className={busy ? 'spin' : ''} /> Fetch models
                </button>
              )}
              <input className="input" style={{ height: 24, padding: '0 6px' }} placeholder="add model id manually" value={manualModel} onChange={(e) => setManualModel(e.target.value)} />
              <button
                className="btn sm"
                disabled={!manualModel.trim()}
                onClick={() => {
                  onChange({ ...p, models: Array.from(new Set([...p.models, manualModel.trim()])) })
                  setManualModel('')
                }}
              >
                Add
              </button>
            </div>
          </div>
          {HELP[p.id] && <div className="help">{HELP[p.id]}</div>}
          {onRemove && (
            <div className="help">
              <button className="btn sm danger" onClick={onRemove}>
                Remove provider
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function modelOptions(draft: Settings, excludeClaudeCode: boolean, current: string): SelectOption<string>[] {
  const out: SelectOption<string>[] = []
  for (const p of draft.providers) {
    if (!p.enabled || (excludeClaudeCode && p.kind === 'claude-code')) continue
    for (const m of p.models) out.push({ value: `${p.id}::${m}`, label: m, group: p.name })
  }
  if (!out.length) out.push({ value: '::', label: current || 'No models yet — fetch them below', disabled: true })
  return out
}

function Row({ title, desc, children }: { title: string; desc?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div className="info">
        <div className="t">{title}</div>
        {desc && <div className="d">{desc}</div>}
      </div>
      <div className="ctl">{children}</div>
    </div>
  )
}


const FAST_MODEL = 'qwen2.5-coder:1.5b'
const FIM_MODEL = /coder|starcoder|codellama|codegemma|deepseek-coder|codestral/i

/**
 * Chat models (llama3.2, qwen2.5…) need a full chat request per suggestion, which takes
 * seconds. Small coder models fill in the middle directly and answer almost instantly.
 */
function FastModelCard({ draft, onUse }: { draft: Settings; onUse: (model: string, providers: Settings['providers']) => void }) {
  const detected = useApp((s) => s.detected)
  const [progress, setProgress] = useState<{ status: string; percent: number } | null>(null)
  const ollama = draft.providers.find((p) => p.id === 'ollama')
  const current = draft.autocomplete.model
  const coders = ollama?.models.filter((m) => FIM_MODEL.test(m)) ?? []
  useEffect(() => window.prism.settings.onPullProgress((model, status, percent) => model === FAST_MODEL && setProgress({ status, percent })), [])
  if (!ollama?.enabled) return null
  const usingFast = draft.autocomplete.providerId === 'ollama' && FIM_MODEL.test(current)
  if (usingFast) return null
  return (
    <div className="fast-model">
      <div className="fm-text">
        <b>Want suggestions instantly as you type?</b>
        <span>
          {current ? <>«{current}» is a chat model, so each suggestion takes a few seconds. </> : null}A small coder model fills in code directly and usually answers in well under a second.
        </span>
      </div>
      {coders.length > 0 ? (
        <button className="btn primary sm" onClick={() => onUse(coders[0], draft.providers)}>
          Use {coders[0]}
        </button>
      ) : progress && progress.status !== 'success' ? (
        <div className="fm-progress">
          <div className="pbar">
            <div style={{ width: `${progress.percent}%` }} />
          </div>
          <span>
            {progress.status} {progress.percent ? `${progress.percent}%` : ''}
          </span>
        </div>
      ) : (
        <button
          className="btn primary sm"
          disabled={!detected?.ollama}
          title={detected?.ollama ? '' : 'Start Ollama first'}
          onClick={async () => {
            setProgress({ status: 'starting', percent: 0 })
            try {
              const s = await window.prism.settings.pullOllama(FAST_MODEL)
              useApp.setState({ settings: s })
              setProgress({ status: 'success', percent: 100 })
              onUse(FAST_MODEL, s.providers)
              toast(`Downloaded ${FAST_MODEL}`, 'success')
            } catch (err) {
              setProgress(null)
              toast(`Download failed: ${errorText(err)}`, 'error')
            }
          }}
        >
          Download {FAST_MODEL} (~1 GB)
        </button>
      )}
    </div>
  )
}

function AboutSection({ autoUpdate, onAutoUpdate }: { autoUpdate: boolean; onAutoUpdate: (v: boolean) => void }) {
  const update = useApp((s) => s.update)
  const [busy, setBusy] = useState(false)
  const status: Record<string, string> = {
    idle: 'Not checked yet',
    checking: 'Checking for updates…',
    none: "You're up to date",
    available: `Version ${update?.latest} is available`,
    downloading: `Downloading ${update?.latest ?? 'update'}… ${update?.progress ?? 0}%`,
    downloaded: `Version ${update?.latest} is ready — restart to install`,
    error: `Couldn't check: ${update?.message ?? 'unknown error'}`,
    unconfigured: 'Updates turn on once this app is published to a GitHub repository',
    dev: 'Running from source — updates apply to the installed app only'
  }
  return (
    <>
      <h3>About & updates</h3>
      <p className="lead">Prism checks GitHub Releases for new versions, downloads them in the background, and installs them when you restart.</p>
      <div className="settings-group">
        <Row title={`Prism ${update?.version ?? ''}`} desc={status[update?.status ?? 'idle']}>
          {update?.status === 'downloaded' ? (
            <button className="btn primary" onClick={() => void window.prism.updates.install()}>
              Restart to update
            </button>
          ) : update?.status === 'available' ? (
            <button className="btn primary" onClick={() => void window.prism.updates.download()}>
              Download
            </button>
          ) : (
            <button
              className="btn"
              disabled={busy || update?.status === 'checking' || update?.status === 'downloading'}
              onClick={async () => {
                setBusy(true)
                try {
                  useApp.setState({ update: await window.prism.updates.check() })
                } finally {
                  setBusy(false)
                }
              }}
            >
              <RefreshCw size={13} className={busy ? 'spin' : ''} /> Check for updates
            </button>
          )}
        </Row>
        <Row title="Download updates automatically" desc="Off: you'll be told when a new version is out and can download it here.">
          <Switch on={autoUpdate} onChange={onAutoUpdate} />
        </Row>
      </div>
    </>
  )
}

export function SettingsModal() {
  const open = useApp((s) => s.settingsOpen)
  const saved = useApp((s) => s.settings)
  const detected = useApp((s) => s.detected)
  const [draft, setDraft] = useState<Settings | null>(null)
  const [section, setSection] = useState<Section>('models')
  const [topics, setTopics] = useState<string[]>([])

  useEffect(() => {
    if (open && saved) {
      const wanted = useApp.getState().settingsSection
      if (wanted) {
        setSection(wanted as Section)
        useApp.setState({ settingsSection: undefined })
      }
      setDraft(structuredClone(saved))
      void window.prism.settings.detect().then((d) => useApp.setState({ detected: d }))
      void window.prism.knowledge.list().then(setTopics)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Every change saves itself shortly after you make it.
  const [savedAt, setSavedAt] = useState(0)
  const firstDraft = useRef(true)
  useEffect(() => {
    if (!draft) return
    if (firstDraft.current) {
      firstDraft.current = false
      return
    }
    const t = setTimeout(() => {
      window.prism.settings
        .save(draft)
        .then((s) => {
          useApp.setState({ settings: s })
          setSavedAt(Date.now())
        })
        .catch((err) => toast(errorText(err), 'error'))
    }, 400)
    return () => clearTimeout(t)
  }, [draft])
  useEffect(() => {
    if (open) firstDraft.current = true
  }, [open])

  if (!open || !draft) return null
  const set = (patch: Partial<Settings>) => setDraft({ ...draft, ...patch })
  const close = () => useApp.setState({ settingsOpen: false })
  const updateProvider = (p: ProviderConfig) => set({ providers: draft.providers.map((x) => (x.id === p.id ? p : x)) })

  const nav: [Section, string, React.ReactNode][] = [
    ['models', 'Models', <Cpu size={14} key="m" />],
    ['agent', 'Agent', <Bot size={14} key="a" />],
    ['editor', 'Editor', <Code2 size={14} key="e" />],
    ['autocomplete', 'Tab autocomplete', <Sparkles size={14} key="t" />],
    ['knowledge', 'Knowledge', <BookOpen size={14} key="k" />],
    ['about', 'About & updates', <Info size={14} key="u" />]
  ]

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="settings">
        <nav>
          <h2>Settings</h2>
          {nav.map(([id, label, icon]) => (
            <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              {icon} {label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ margin: '0 10px', fontSize: 12, color: 'var(--text-faint)' }}>{savedAt ? 'All changes saved' : 'Changes save automatically'}</div>
        </nav>
        <div className="content">
          <button className="icon-btn" style={{ position: 'absolute', right: 14, top: 14 }} onClick={close}>
            <X size={16} />
          </button>
          {section === 'models' && (
            <>
              <h3>Models</h3>
              <p className="lead">Connect Claude (API key or your Claude Code subscription) and local models through Ollama, LM Studio or any OpenAI-compatible server.</p>
              <div className="settings-group-title">Default</div>
              <div className="settings-group">
                <Row title="Active model" desc="Used for chat, agent mode, inline edits and the learning tutor.">
                  <Select
                    value={`${draft.activeProviderId}::${draft.activeModel}`}
                    options={modelOptions(draft, false, draft.activeModel)}
                    onChange={(v) => {
                      const [pid, ...rest] = String(v).split('::')
                      set({ activeProviderId: pid, activeModel: rest.join('::') })
                    }}
                  />
                </Row>
              </div>
              <div className="settings-group-title">Providers</div>
              {draft.providers.map((p) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  detected={detected}
                  onChange={updateProvider}
                  persist={async () => useApp.setState({ settings: await window.prism.settings.save(draft) })}
                  onRemove={p.builtin ? undefined : () => set({ providers: draft.providers.filter((x) => x.id !== p.id) })}
                />
              ))}
              <button
                className="btn"
                onClick={() =>
                  set({
                    providers: [
                      ...draft.providers,
                      { id: `custom-${Date.now()}`, name: 'Custom provider', kind: 'openai', baseUrl: 'https://openrouter.ai/api/v1', models: [], enabled: true }
                    ]
                  })
                }
              >
                <Plus size={13} /> Add OpenAI-compatible provider
              </button>
            </>
          )}
          {section === 'agent' && (
            <>
              <h3>Agent</h3>
              <p className="lead">How much the AI may do on its own, and how hard it thinks.</p>
              <div className="settings-group-title">Permissions</div>
              <div className="settings-group">
                <Row title="Approval mode" desc="What the agent may do without asking you first. Edits can always be reverted from the chat.">
                  <Select<PermissionMode>
                    value={draft.permissionMode}
                    onChange={(v) => set({ permissionMode: v })}
                    options={[
                      { value: 'ask', label: 'Ask first', description: 'Approve every edit and command' },
                      { value: 'auto-edit', label: 'Auto-edit', description: 'Edits apply, commands ask' },
                      { value: 'full-auto', label: 'Full auto', description: 'Nothing asks' }
                    ]}
                  />
                </Row>
              </div>
              <div className="settings-group-title">Models</div>
              <div className="settings-group">
                <Row title="Reasoning effort" desc="Claude API models. Higher thinks longer and handles harder problems; lower is faster and cheaper.">
                  <Select<Effort>
                    value={draft.effort}
                    onChange={(v) => set({ effort: v })}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'xhigh', label: 'Extra high' },
                      { value: 'max', label: 'Max' }
                    ]}
                  />
                </Row>
                <Row title="Anthropic web search" desc="Use Anthropic's hosted web search for Claude API models (billed per search). Off: Prism's own browser tools, which work with every model.">
                  <Switch on={draft.claudeServerWebSearch} onChange={(v) => set({ claudeServerWebSearch: v })} />
                </Row>
                <Row title="Ollama context window" desc="Tokens of context for Ollama models. Agents need room for files and tool results.">
                  <Select<number>
                    value={draft.ollamaNumCtx}
                    onChange={(v) => set({ ollamaNumCtx: v })}
                    options={[4096, 8192, 16384, 32768, 65536, 131072].map((n) => ({ value: n, label: `${n.toLocaleString()} tokens` }))}
                  />
                </Row>
              </div>
            </>
          )}
          {section === 'editor' && (
            <>
              <h3>Editor</h3>
              <p className="lead">How code looks in the editor.</p>
              <div className="settings-group-title">Text</div>
              <div className="settings-group">
                <Row title="Font size">
                  <Select<number> value={draft.editor.fontSize} onChange={(v) => set({ editor: { ...draft.editor, fontSize: v } })} options={[11, 12, 13, 14, 15, 16, 18, 20, 24].map((n) => ({ value: n, label: `${n}px` }))} />
                </Row>
                <Row title="Font family" desc="Any font installed on your computer. The first one found is used.">
                  <input className="input" value={draft.editor.fontFamily} onChange={(e) => set({ editor: { ...draft.editor, fontFamily: e.target.value } })} />
                </Row>
                <Row title="Tab size">
                  <Select<number> value={draft.editor.tabSize} onChange={(v) => set({ editor: { ...draft.editor, tabSize: v } })} options={[2, 4, 8].map((n) => ({ value: n, label: `${n} spaces` }))} />
                </Row>
              </div>
              <div className="settings-group-title">Saving</div>
              <div className="settings-group">
                <Row title="Auto save" desc="Save files automatically so you never lose work.">
                  <Select<'off' | 'afterDelay' | 'onFocusChange'>
                    value={draft.editor.autoSave ?? 'afterDelay'}
                    onChange={(v) => set({ editor: { ...draft.editor, autoSave: v } })}
                    options={[
                      { value: 'afterDelay', label: 'After a short delay', description: 'One second after you stop typing' },
                      { value: 'onFocusChange', label: 'When you leave the editor', description: 'Click away or switch tabs' },
                      { value: 'off', label: 'Off', description: 'Save with Ctrl+S' }
                    ]}
                  />
                </Row>
              </div>
              <div className="settings-group-title">Layout</div>
              <div className="settings-group">
                <Row title="Word wrap" desc="Wrap long lines instead of scrolling sideways.">
                  <Switch on={draft.editor.wordWrap} onChange={(v) => set({ editor: { ...draft.editor, wordWrap: v } })} />
                </Row>
                <Row title="Minimap" desc="Show a zoomed-out overview of the file on the right.">
                  <Switch on={draft.editor.minimap} onChange={(v) => set({ editor: { ...draft.editor, minimap: v } })} />
                </Row>
              </div>
            </>
          )}
          {section === 'autocomplete' && (
            <>
              <h3>Tab autocomplete</h3>
              <p className="lead">
                Ghost-text suggestions as you type; press Tab to accept. Works in the code editor and the Learn sandbox.
              </p>
              <FastModelCard
                draft={draft}
                onUse={(model, providers) => setDraft({ ...draft, providers, autocomplete: { enabled: true, providerId: 'ollama', model } })}
              />
              <div className="settings-group">
                <Row title="Enable autocomplete">
                  <Switch on={draft.autocomplete.enabled} onChange={(v) => set({ autocomplete: { ...draft.autocomplete, enabled: v } })} />
                </Row>
                <Row title="Model" desc="Claude Code can't be used for autocomplete.">
                  <Select
                    value={`${draft.autocomplete.providerId}::${draft.autocomplete.model}`}
                    options={modelOptions(draft, true, draft.autocomplete.model)}
                    onChange={(v) => {
                      const [pid, ...rest] = String(v).split('::')
                      set({ autocomplete: { ...draft.autocomplete, providerId: pid, model: rest.join('::') } })
                    }}
                  />
                </Row>
              </div>
            </>
          )}
          {section === 'about' && <AboutSection autoUpdate={draft.autoUpdate !== false} onAutoUpdate={(v) => set({ autoUpdate: v })} />}
          {section === 'knowledge' && (
            <>
              <h3>Knowledge base</h3>
              <p className="lead">
                Best-practice guides the agent uses. Guides for your project's main languages are loaded automatically; the agent loads others with <code>get_best_practices</code>. Project rules from <code>AGENTS.md</code>, <code>CLAUDE.md</code> or{' '}
                <code>.cursorrules</code> are always followed.
              </p>
              <div className="settings-group">
                <Row title="Custom knowledge" desc="Add Markdown files (e.g. my-team.md, or python.md to override the built-in guide).">
                  <button className="btn" onClick={() => void window.prism.knowledge.openDir()}>
                    <ExternalLink size={13} /> Open folder
                  </button>
                </Row>
              </div>
              <div className="model-tags" style={{ marginTop: 14 }}>
                {topics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
