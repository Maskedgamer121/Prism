import { useState } from 'react'
import { Code2, GraduationCap, PanelBottom, PanelLeft, PanelRight, Search, Settings } from 'lucide-react'
import { useApp, baseName } from '../store'
import { focusChat, newFile, newProject, openFolder, setWorkspace, startNewChat, toggle } from '../lib/actions'
import { saveActive, saveAll, closeTab, runEditorAction } from '../lib/editor'
import { addSelectionToChat, newChat, sendMessage } from '../lib/chat'
import { emit } from '../lib/actions'
import { Logo, Menu, type MenuItem } from './ui'

type MenuName = 'File' | 'Edit' | 'View' | 'AI' | 'Terminal' | 'Help'

export function TitleBar() {
  const workspace = useApp((s) => s.workspace)
  const settings = useApp((s) => s.settings)
  const { showSidebar, showPanel, showChat, activeTabId, view, showLearnChat, chatMode } = useApp()
  const [open, setOpen] = useState<{ name: MenuName; rect: DOMRect } | null>(null)

  const tabs = useApp((s) => s.tabs)
  const fileOpen = tabs.some((t) => t.id === activeTabId && t.kind === 'file')
  const anyDirty = tabs.some((t) => t.dirty)
  // Editor-related items only make sense in Code view; switch there first.
  const inCode = (fn: () => void) => () => {
    if (view !== 'code') useApp.setState({ view: 'code' })
    fn()
  }
  const sidebar = (v: 'explorer' | 'search' | 'git' | 'knowledge') => inCode(() => useApp.setState({ sidebarView: v, showSidebar: true }))
  const chatOn = view === 'learn' ? showLearnChat : showChat
  const toggleChat = () => (view === 'learn' ? useApp.setState({ showLearnChat: !showLearnChat }) : toggle('showChat'))
  const editorItem = (label: string, shortcut: string, action: string): MenuItem => ({
    label,
    shortcut,
    disabled: !fileOpen,
    onClick: inCode(() => runEditorAction(action))
  })

  const menus: Record<MenuName, MenuItem[]> = {
    File: [
      { label: 'New File…', shortcut: 'Ctrl+N', disabled: !workspace, onClick: inCode(() => void newFile()) },
      { label: 'New Project…', onClick: inCode(() => void newProject()) },
      { label: 'Open Folder…', shortcut: 'Ctrl+O', onClick: inCode(() => void openFolder()) },
      { separator: true },
      { header: 'Recent' },
      ...(settings?.recentFolders.length
        ? settings.recentFolders.slice(0, 6).map((f) => ({ label: baseName(f), sub: f, onClick: inCode(() => void setWorkspace(f)) }))
        : [{ label: 'No recent folders', disabled: true }]),
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', disabled: !fileOpen, onClick: () => void saveActive() },
      { label: 'Save All', shortcut: 'Ctrl+Alt+S', disabled: !anyDirty, onClick: () => void saveAll() },
      { label: 'Close Editor', shortcut: 'Ctrl+W', disabled: !activeTabId, onClick: () => activeTabId && closeTab(activeTabId) },
      { label: 'Close Folder', disabled: !workspace, onClick: () => void setWorkspace(null) },
      { separator: true },
      { label: 'Settings', shortcut: 'Ctrl+,', onClick: () => useApp.setState({ settingsOpen: true }) }
    ],
    Edit: [
      editorItem('Undo', 'Ctrl+Z', 'undo'),
      editorItem('Redo', 'Ctrl+Y', 'redo'),
      { separator: true },
      editorItem('Find', 'Ctrl+F', 'actions.find'),
      editorItem('Replace', 'Ctrl+H', 'editor.action.startFindReplaceAction'),
      { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', onClick: sidebar('search') },
      { separator: true },
      editorItem('Format Document', 'Shift+Alt+F', 'editor.action.formatDocument'),
      editorItem('Toggle Comment', 'Ctrl+/', 'editor.action.commentLine')
    ],
    View: [
      { label: 'Code', checked: view === 'code', onClick: () => useApp.setState({ view: 'code' }) },
      { label: 'Learn', checked: view === 'learn', onClick: () => useApp.setState({ view: 'learn' }) },
      { separator: true },
      { label: 'Command Palette…', shortcut: 'Ctrl+Shift+P', onClick: () => useApp.setState({ palette: 'commands' }) },
      { label: 'Go to File…', shortcut: 'Ctrl+P', disabled: !workspace, onClick: inCode(() => useApp.setState({ palette: 'files' })) },
      { separator: true },
      { label: 'Explorer', shortcut: 'Ctrl+Shift+E', onClick: sidebar('explorer') },
      { label: 'Search', shortcut: 'Ctrl+Shift+F', onClick: sidebar('search') },
      { label: 'Source Control', shortcut: 'Ctrl+Shift+G', onClick: sidebar('git') },
      { label: 'Knowledge Base', onClick: sidebar('knowledge') },
      { separator: true },
      { label: 'Sidebar', shortcut: 'Ctrl+B', checked: view === 'code' && showSidebar, onClick: inCode(() => toggle('showSidebar')) },
      { label: 'Terminal', shortcut: 'Ctrl+J', checked: view === 'code' && showPanel, onClick: inCode(() => toggle('showPanel')) },
      { label: 'AI Chat', shortcut: 'Ctrl+I', checked: chatOn, disabled: view === 'code' && !workspace, onClick: toggleChat }
    ],
    AI: [
      { label: 'New Chat', shortcut: 'Ctrl+Shift+L', onClick: () => startNewChat() },
      { label: 'Focus Chat', shortcut: 'Ctrl+I', onClick: () => focusChat() },
      { label: 'Add Selection to Chat', shortcut: 'Ctrl+L', disabled: !fileOpen, onClick: () => addSelectionToChat() },
      { label: 'Edit Inline', shortcut: 'Ctrl+K', disabled: !fileOpen, onClick: inCode(() => emit('inline-edit')) },
      { separator: true },
      { label: 'Agent Mode', checked: chatMode === 'agent', onClick: () => useApp.setState({ chatMode: 'agent' }) },
      { label: 'Ask Mode', checked: chatMode === 'ask', onClick: () => useApp.setState({ chatMode: 'ask' }) },
      { label: 'Plan Mode', checked: chatMode === 'plan', onClick: () => useApp.setState({ chatMode: 'plan' }) },
      { separator: true },
      { label: 'Models & Providers…', onClick: () => useApp.setState({ settingsOpen: true }) },
      { label: 'Open Knowledge Folder', onClick: () => void window.prism.knowledge.openDir() }
    ],
    Terminal: [
      { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', onClick: inCode(() => (useApp.setState({ showPanel: true }), emit('terminal-new'))) },
      { label: 'Toggle Terminal', shortcut: 'Ctrl+`', checked: view === 'code' && showPanel, onClick: inCode(() => toggle('showPanel')) }
    ],
    Help: [
      {
        label: 'Slash Commands & Shortcuts',
        onClick: () => {
          if (view === 'learn') useApp.setState({ showLearnChat: true })
          else useApp.setState({ showChat: true })
          void sendMessage('/help')
        }
      },
      { label: 'All Commands…', shortcut: 'Ctrl+Shift+P', onClick: () => useApp.setState({ palette: 'commands' }) },
      { separator: true },
      { label: 'Check for Updates…', onClick: () => useApp.setState({ settingsOpen: true, settingsSection: 'about' }) },
      { label: 'Get an Anthropic API key', onClick: () => void window.prism.openExternal('https://console.anthropic.com/settings/keys') },
      { label: 'Download Ollama', onClick: () => void window.prism.openExternal('https://ollama.com/download') },
      { label: 'Download LM Studio', onClick: () => void window.prism.openExternal('https://lmstudio.ai') }
    ]
  }

  return (
    <div className={`titlebar${window.prism.platform === 'darwin' ? ' mac' : ''}`}>
      <Logo />
      {(Object.keys(menus) as MenuName[]).map((name) => (
        <button
          key={name}
          className={`menu-btn${open?.name === name ? ' open' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            const rect = e.currentTarget.getBoundingClientRect()
            setOpen(open?.name === name ? null : { name, rect })
          }}
          onMouseEnter={(e) => {
            if (open && open.name !== name) setOpen({ name, rect: e.currentTarget.getBoundingClientRect() })
          }}
        >
          {name}
        </button>
      ))}
      <div className="center">
        <div className="mode-switch">
          <button className={view === 'code' ? 'on' : ''} onClick={() => useApp.setState({ view: 'code' })} title="Code editor">
            <Code2 size={13} /> Code
          </button>
          <button className={view === 'learn' ? 'on' : ''} onClick={() => useApp.setState({ view: 'learn' })} title="Learn to code">
            <GraduationCap size={13} /> Learn
          </button>
        </div>
        <button className="command-center" onClick={() => useApp.setState({ palette: 'files' })}>
          <Search size={13} />
          <span>{workspace ? baseName(workspace) : 'Prism'}</span>
        </button>
      </div>
      <div className="right">
        {view === 'code' && (
          <>
            <button className={`icon-btn${showSidebar ? ' active' : ''}`} title="Toggle Sidebar (Ctrl+B)" onClick={() => toggle('showSidebar')}>
              <PanelLeft size={15} />
            </button>
            <button className={`icon-btn${showPanel ? ' active' : ''}`} title="Toggle Terminal (Ctrl+J)" onClick={() => toggle('showPanel')}>
              <PanelBottom size={15} />
            </button>
          </>
        )}
        {(view === 'learn' || workspace) && (
        <button
          className={`icon-btn${(view === 'learn' ? showLearnChat : showChat) ? ' active' : ''}`}
          title="Toggle AI Chat (Ctrl+I)"
          onClick={() => (view === 'learn' ? useApp.setState({ showLearnChat: !showLearnChat }) : toggle('showChat'))}
        >
          <PanelRight size={15} />
        </button>
        )}
        <button className="icon-btn" title="Settings (Ctrl+,)" onClick={() => useApp.setState({ settingsOpen: true })}>
          <Settings size={15} />
        </button>
      </div>
      {open && <Menu items={menus[open.name]} anchor={open.rect} onClose={() => setOpen(null)} />}
    </div>
  )
}
