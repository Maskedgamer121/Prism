import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, FolderOpen, FolderPlus, GraduationCap, History } from 'lucide-react'
import { useApp, baseName, updateSettings } from '../store'
import { newProject, openFolder, setWorkspace } from '../lib/actions'
import { ChatPanel, Composer } from './ChatPanel'
import { Logo, Menu, type MenuItem } from './ui'

export function Welcome() {
  const settings = useApp((s) => s.settings)
  const detected = useApp((s) => s.detected)
  const messages = useApp((s) => s.messages)
  const [folderMenu, setFolderMenu] = useState<DOMRect | null>(null)

  useEffect(() => {
    void window.prism.settings.detect().then((d) => useApp.setState({ detected: d }))
  }, [])

  if (messages.length) {
    return (
      <div className="welcome" style={{ padding: 0 }}>
        <ChatPanel center />
      </div>
    )
  }
  if (!settings) return null

  const ollama = settings.providers.find((p) => p.id === 'ollama')
  const anthropic = settings.providers.find((p) => p.id === 'anthropic')
  const cards = [
    {
      id: 'claude-code',
      name: 'Claude Code',
      sub: detected?.claudeCli ? 'Uses your Claude subscription' : 'Install the Claude Code CLI to use your subscription',
      on: Boolean(detected?.claudeCli),
      model: 'default'
    },
    {
      id: 'anthropic',
      name: 'Claude API',
      sub: anthropic?.hasKey ? 'API key saved' : 'Add an Anthropic API key',
      on: Boolean(anthropic?.hasKey),
      model: 'claude-opus-5-5'
    },
    {
      id: 'ollama',
      name: 'Ollama',
      sub: detected?.ollama ? `Running · ${ollama?.models.length ?? 0} models` : 'Not running — start Ollama',
      on: Boolean(detected?.ollama),
      model: ollama?.models.find((m) => /coder|qwen|llama3\.[12]|mistral/i.test(m)) ?? ollama?.models[0] ?? ''
    },
    {
      id: 'lmstudio',
      name: 'LM Studio',
      sub: detected?.lmstudio ? 'Server running' : 'Start the local server in LM Studio',
      on: Boolean(detected?.lmstudio),
      model: settings.providers.find((p) => p.id === 'lmstudio')?.models[0] ?? ''
    }
  ]

  return (
    <div className="welcome">
      <div className="inner">
        <div className="brand">
          <Logo size={34} />
          <div>
            <h1>Prism</h1>
            <p>The AI code editor that works with Claude and your local models.</p>
          </div>
        </div>
        <div className="context-row">
          <button className="pill" onClick={(e) => setFolderMenu(e.currentTarget.getBoundingClientRect())}>
            <FolderOpen size={13} /> Open folder <ChevronDown size={11} />
          </button>
          <button className="pill" onClick={() => void newProject()}>
            <FolderPlus size={13} /> Start from scratch
          </button>
          {folderMenu && (
            <Menu
              anchor={folderMenu}
              onClose={() => setFolderMenu(null)}
              items={[
                { label: 'Browse for a folder…', icon: <FolderOpen size={13} />, shortcut: 'Ctrl+O', onClick: () => void openFolder() },
                ...(settings.recentFolders.length
                  ? [{ separator: true }, { header: 'Recent' }, ...settings.recentFolders.slice(0, 8).map((f): MenuItem => ({ label: baseName(f), sub: f, icon: <History size={13} />, onClick: () => void setWorkspace(f) }))]
                  : [])
              ]}
            />
          )}
        </div>
        <Composer center />

        <button className="learn-card" onClick={() => useApp.setState({ view: 'learn' })}>
          <GraduationCap size={22} />
          <div>
            <div className="lc-title">Learn to code</div>
            <div className="lc-sub">12 step-by-step courses in Python, JavaScript, TypeScript, Lua and SQL — docs first, then challenges, with an AI tutor.</div>
          </div>
          <ArrowRight size={16} />
        </button>

        <div className="section-title">AI provider</div>
        <div className="provider-cards">
          {cards.map((c) => (
            <button
              key={c.id}
              className={`provider-card${settings.activeProviderId === c.id ? ' active' : ''}`}
              onClick={async () => {
                if (!c.on) {
                  useApp.setState({ settingsOpen: true })
                  return
                }
                if (c.id === 'ollama' || c.id === 'lmstudio') {
                  const s = await window.prism.settings.listModels(c.id).catch(() => null)
                  if (s) useApp.setState({ settings: s })
                }
                const fresh = useApp.getState().settings!.providers.find((p) => p.id === c.id)
                await updateSettings({ activeProviderId: c.id, activeModel: c.model || fresh?.models[0] || '' })
              }}
            >
              <span className="pc-name">
                <span className={`dot ${c.on ? 'on' : 'off'}`} />
                {c.name}
              </span>
              <span className="pc-sub">{c.sub}</span>
            </button>
          ))}
        </div>

        {settings.recentFolders.length > 0 && (
          <>
            <div className="section-title">Recent</div>
            <div>
              {settings.recentFolders.slice(0, 6).map((f) => (
                <button key={f} className="recent" onClick={() => void setWorkspace(f)}>
                  <FolderOpen size={14} color="#9aa4b2" />
                  <span>{baseName(f)}</span>
                  <span className="path">{f}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
