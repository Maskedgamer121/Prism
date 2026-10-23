import { useEffect } from 'react'
import { useApp } from './store'
import { handleShortcut, refreshFileList } from './lib/actions'
import { initChatEvents, refreshCustomCommands } from './lib/chat'
import { openFile, reloadFromDisk } from './lib/editor'
import { TitleBar } from './components/TitleBar'
import { ActivityBar, Palette, StatusBar, Toasts } from './components/Chrome'
import { Sidebar } from './components/SidebarViews'
import { EditorArea } from './components/EditorArea'
import { TerminalPanel } from './components/TerminalPanel'
import { ChatPanel } from './components/ChatPanel'
import { Welcome } from './components/Welcome'
import { SettingsModal } from './components/SettingsModal'
import { Splitter } from './components/ui'
import { LearnView } from './learn/LearnView'
import { DialogHost } from './components/Dialog'

export function App() {
  const workspace = useApp((s) => s.workspace)
  const settings = useApp((s) => s.settings)
  const view = useApp((s) => s.view)
  const hasTabs = useApp((s) => s.tabs.length > 0)
  const showLearnChat = useApp((s) => s.showLearnChat)
  const { showSidebar, showPanel, showChat, sidebarWidth, chatWidth, panelHeight } = useApp()

  useEffect(() => {
    void (async () => {
      const [s, ws, detected] = await Promise.all([window.prism.settings.get(), window.prism.workspace.get(), window.prism.settings.detect()])
      useApp.setState({ settings: s, workspace: ws, detected })
      // Local servers' model lists change whenever models are pulled; refresh them on start.
      for (const id of [detected.ollama && 'ollama', detected.lmstudio && 'lmstudio'].filter(Boolean) as string[]) {
        void window.prism.settings.listModels(id).then((next) => useApp.setState({ settings: next })).catch(() => {})
      }
      if (ws) {
        await Promise.all([refreshFileList(), refreshCustomCommands()])
        useApp.setState({ chatList: await window.prism.chats.list() })
      }
    })()
    void window.prism.updates.get().then((update) => useApp.setState({ update }))
    const offUpdate = window.prism.updates.onStatus((update) => useApp.setState({ update }))
    const offChat = initChatEvents()
    const offFs = window.prism.fs.onChanged((paths) => void reloadFromDisk(paths))
    const offOpen = window.prism.onOpenFile((path, line) => void openFile(path, line))
    const onKey = (e: KeyboardEvent) => {
      handleShortcut(e)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      offChat()
      offUpdate()
      offFs()
      offOpen()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!settings) return <div className="app" />

  return (
    <div className="app">
      <TitleBar />
      <div className="main">
        {view === 'learn' ? (
          <>
            <LearnView />
            {showLearnChat && (
              <>
                <Splitter dir="v" onDrag={(d) => useApp.setState((s) => ({ chatWidth: Math.max(300, Math.min(900, s.chatWidth - d)) }))} />
                <ChatPanel width={chatWidth} />
              </>
            )}
          </>
        ) : (
          <>
            <ActivityBar />
            {showSidebar && (
              <>
                <div className="sidebar" style={{ width: sidebarWidth }}>
                  <Sidebar />
                </div>
                <Splitter dir="v" onDrag={(d) => useApp.setState((s) => ({ sidebarWidth: Math.max(170, Math.min(600, s.sidebarWidth + d)) }))} />
              </>
            )}
            <div className="center-col">
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {/* With no folder open, the welcome page (and its chat) fills the editor area. */}
                {workspace || hasTabs ? <EditorArea /> : <Welcome />}
              </div>
              {showPanel && (
                <>
                  <Splitter dir="h" onDrag={(d) => useApp.setState((s) => ({ panelHeight: Math.max(100, Math.min(window.innerHeight - 200, s.panelHeight - d)) }))} />
                  <div className="panel" style={{ height: panelHeight }}>
                    <TerminalPanel />
                  </div>
                </>
              )}
            </div>
            {workspace && showChat && (
              <>
                <Splitter dir="v" onDrag={(d) => useApp.setState((s) => ({ chatWidth: Math.max(300, Math.min(900, s.chatWidth - d)) }))} />
                <ChatPanel width={chatWidth} />
              </>
            )}
          </>
        )}
      </div>
      <StatusBar />
      <Palette />
      <SettingsModal />
      <DialogHost />
      <Toasts />
    </div>
  )
}
