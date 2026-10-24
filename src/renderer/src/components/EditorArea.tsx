import { useEffect, useRef, useState } from 'react'
import { X, Check, Loader2, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react'
import { useApp, newId, toast, errorText, relToWorkspace, type Tab } from '../store'
import { monaco, languageFor } from '../lib/monaco'
import { openFile } from '../lib/editor'
import { acceptFile, acceptHunk, hunksOf, norm, openNextReview, rejectFile, rejectHunk, reviewStats } from '../lib/review'
import { autoSaveOnBlur, closeTab, flushReveal, getModel, saveActive, setActiveEditor, getActiveEditor } from '../lib/editor'
import { addSelectionToChat, askAbout, newChat } from '../lib/chat'
import { bus, emit, focusChat, newFile, openFolder, startNewChat, toggle } from '../lib/actions'
import { FileIcon, Logo } from './ui'

const viewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>()

function editorOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
  const e = useApp.getState().settings?.editor
  return {
    theme: 'prism-dark',
    automaticLayout: true,
    fontSize: e?.fontSize ?? 14,
    fontFamily: e?.fontFamily,
    fontLigatures: true,
    minimap: { enabled: e?.minimap ?? true, renderCharacters: false, scale: 1 },
    wordWrap: e?.wordWrap ? 'on' : 'off',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlight: 'all',
    scrollBeyondLastLine: false,
    padding: { top: 8, bottom: 8 },
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: 'active', indentation: true },
    inlineSuggest: { enabled: true },
    stickyScroll: { enabled: true },
    fixedOverflowWidgets: true,
    lineNumbersMinChars: 4,
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
  }
}

function bindKeys(ed: monaco.editor.IStandaloneCodeEditor): void {
  const { KeyMod: M, KeyCode: K } = monaco
  const set = (s: Partial<ReturnType<typeof useApp.getState>>) => useApp.setState(s)
  ed.addCommand(M.CtrlCmd | K.KeyK, () => emit('inline-edit'))
  ed.addCommand(M.CtrlCmd | K.KeyL, () => addSelectionToChat())
  ed.addCommand(M.CtrlCmd | K.KeyI, () => focusChat())
  ed.addCommand(M.CtrlCmd | K.KeyS, () => void saveActive())
  ed.addCommand(M.CtrlCmd | K.KeyP, () => set({ palette: 'files' }))
  ed.addCommand(M.CtrlCmd | M.Shift | K.KeyP, () => set({ palette: 'commands' }))
  ed.addCommand(K.F1, () => set({ palette: 'commands' }))
  ed.addCommand(M.CtrlCmd | K.KeyB, () => toggle('showSidebar'))
  ed.addCommand(M.CtrlCmd | K.KeyJ, () => toggle('showPanel'))
  ed.addCommand(M.CtrlCmd | K.Backquote, () => toggle('showPanel'))
  ed.addCommand(M.CtrlCmd | K.KeyW, () => {
    const id = useApp.getState().activeTabId
    if (id) closeTab(id)
  })
  ed.addCommand(M.CtrlCmd | K.KeyN, () => void newFile())
  ed.addCommand(M.CtrlCmd | K.KeyO, () => void openFolder())
  ed.addCommand(M.CtrlCmd | M.Shift | K.KeyF, () => set({ sidebarView: 'search', showSidebar: true }))
  ed.addCommand(M.CtrlCmd | M.Shift | K.KeyL, () => startNewChat())
  ed.addCommand(M.CtrlCmd | K.Comma, () => set({ settingsOpen: true }))
  ed.addAction({ id: 'prism.inlineEdit', label: 'AI: Edit Inline', contextMenuGroupId: '0_ai', contextMenuOrder: 1, run: () => void emit('inline-edit') })
  ed.addAction({ id: 'prism.addToChat', label: 'AI: Add to Chat', contextMenuGroupId: '0_ai', contextMenuOrder: 2, run: () => addSelectionToChat() })
  ed.addAction({
    id: 'prism.explain',
    label: 'AI: Explain This',
    contextMenuGroupId: '0_ai',
    contextMenuOrder: 3,
    run: () => {
      addSelectionToChat()
      askAbout('/explain the selected code')
    }
  })
  ed.addAction({
    id: 'prism.fix',
    label: 'AI: Fix This',
    contextMenuGroupId: '0_ai',
    contextMenuOrder: 4,
    run: () => {
      addSelectionToChat()
      askAbout('/fix ')
    }
  })
}

/** Draws pending AI changes inline: green added lines, red removed lines, Accept/Reject per change. */
function useReviewDecorations(ed: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>, path: string) {
  const review = useApp((s) => s.reviews[norm(path)])
  useEffect(() => {
    const editor = ed.current
    const model = editor?.getModel()
    if (!editor || !model || !review) return
    const decorations = editor.createDecorationsCollection()
    let zones: string[] = []
    const clearZones = () =>
      editor.changeViewZones((acc) => {
        zones.forEach((z) => acc.removeZone(z))
        zones = []
      })
    const render = () => {
      clearZones()
      const hunks = hunksOf(review.baseline ?? '', model.getValue())
      decorations.set(
        hunks
          .filter((h) => h.added.length)
          .map((h) => ({
            range: new monaco.Range(h.newStart, 1, h.newStart + h.added.length - 1, 1),
            options: { isWholeLine: true, className: 'review-added', linesDecorationsClassName: 'review-added-gutter' }
          }))
      )
      const font = editor.getOption(monaco.editor.EditorOption.fontInfo)
      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
      editor.changeViewZones((acc) => {
        for (const h of hunks) {
          const dom = document.createElement('div')
          dom.className = 'review-zone'
          const bar = document.createElement('div')
          bar.className = 'review-hunk-bar'
          bar.style.height = `${lineHeight}px`
          const label = document.createElement('span')
          label.textContent = `${h.added.length ? `+${h.added.length}` : ''}${h.added.length && h.removed.length ? ' ' : ''}${h.removed.length ? `−${h.removed.length}` : ''}`
          const accept = document.createElement('button')
          accept.className = 'rv-accept'
          accept.textContent = 'Accept'
          accept.title = 'Keep this change'
          accept.onmousedown = (e) => {
            e.preventDefault()
            e.stopPropagation()
            acceptHunk(path, h)
          }
          const reject = document.createElement('button')
          reject.className = 'rv-reject'
          reject.textContent = 'Reject'
          reject.title = 'Undo this change'
          reject.onmousedown = (e) => {
            e.preventDefault()
            e.stopPropagation()
            void rejectHunk(path, h)
          }
          bar.append(label, accept, reject)
          dom.append(bar)
          const shown = h.removed.slice(0, 60)
          if (shown.length) {
            const pre = document.createElement('div')
            pre.className = 'review-removed'
            pre.style.fontFamily = font.fontFamily
            pre.style.fontSize = `${font.fontSize}px`
            pre.style.lineHeight = `${lineHeight}px`
            pre.textContent = shown.join('\n') + (h.removed.length > shown.length ? `\n… ${h.removed.length - shown.length} more lines` : '')
            dom.append(pre)
          }
          zones.push(
            acc.addZone({
              afterLineNumber: h.newStart - 1,
              heightInLines: 1 + shown.length + (h.removed.length > shown.length ? 1 : 0),
              domNode: dom,
              suppressMouseDown: true
            })
          )
        }
      })
    }
    render()
    let timer: ReturnType<typeof setTimeout> | null = null
    const sub = model.onDidChangeContent(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(render, 150)
    })
    return () => {
      if (timer) clearTimeout(timer)
      sub.dispose()
      decorations.clear()
      clearZones()
    }
  }, [ed, path, review])
}

/** Floating bar over a file with pending AI changes. */
function ReviewBar({ path }: { path: string }) {
  const reviews = useApp((s) => s.reviews)
  useApp((s) => s.tabs)
  const list = Object.values(reviews)
  const i = list.findIndex((r) => norm(r.path) === norm(path))
  if (i < 0) return null
  const stats = reviewStats(path)
  return (
    <div className="review-bar">
      <Sparkles size={13} />
      <span className="rb-label">AI changes</span>
      <span className="add">+{stats.added}</span>
      <span className="del">−{stats.removed}</span>
      {list.length > 1 && (
        <span className="rb-files">
          <button className="icon-btn sm" title="Previous file" onClick={() => void openFile(list[(i - 1 + list.length) % list.length].path)}>
            <ChevronLeft size={13} />
          </button>
          {i + 1} / {list.length} files
          <button className="icon-btn sm" title="Next file" onClick={() => openNextReview(path)}>
            <ChevronRight size={13} />
          </button>
        </span>
      )}
      <button className="btn sm ghost" onClick={() => void rejectFile(path)}>
        Reject file
      </button>
      <button className="btn sm primary" onClick={() => acceptFile(path)}>
        <Check size={12} /> Accept file
      </button>
    </div>
  )
}

function CodeEditor({ path }: { path: string }) {
  const host = useRef<HTMLDivElement>(null)
  const ed = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const current = useRef<string | null>(null)
  const editorSettings = useApp((s) => s.settings?.editor)

  useEffect(() => {
    const editor = monaco.editor.create(host.current!, { ...editorOptions(), model: null })
    ed.current = editor
    setActiveEditor(editor)
    bindKeys(editor)
    const updateCursor = () => {
      const pos = editor.getPosition()
      const model = editor.getModel()
      if (!pos || !model) return
      const o = model.getOptions()
      useApp.setState({
        cursor: { line: pos.lineNumber, col: pos.column, language: model.getLanguageId(), eol: model.getEOL() === '\r\n' ? 'CRLF' : 'LF', indent: o.insertSpaces ? `Spaces: ${o.tabSize}` : `Tab size: ${o.tabSize}` }
      })
    }
    editor.onDidBlurEditorText(autoSaveOnBlur)
    editor.onDidChangeCursorPosition(updateCursor)
    editor.onDidChangeModel(updateCursor)
    return () => {
      if (current.current) viewStates.set(current.current, editor.saveViewState())
      setActiveEditor(null)
      editor.dispose()
      useApp.setState({ cursor: null })
    }
  }, [])

  useEffect(() => {
    const editor = ed.current
    if (!editor) return
    if (current.current && current.current !== path) viewStates.set(current.current, editor.saveViewState())
    const model = getModel(path)
    editor.setModel(model)
    current.current = path
    const vs = viewStates.get(path)
    if (vs) editor.restoreViewState(vs)
    // Don't pull focus away from the chat when the agent opens a file it edited.
    if (!document.activeElement?.closest('.chat')) editor.focus()
    flushReveal()
  }, [path])

  useReviewDecorations(ed, path)

  useEffect(() => {
    if (ed.current && editorSettings) ed.current.updateOptions(editorOptions())
  }, [editorSettings])

  return <div ref={host} className="editor-host" />
}

function DiffView({ tab }: { tab: Tab }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = tab.diff!
    const original = monaco.editor.createModel(d.original, d.language)
    const modified = monaco.editor.createModel(d.modified, d.language)
    const editor = monaco.editor.createDiffEditor(host.current!, {
      theme: 'prism-dark',
      automaticLayout: true,
      readOnly: true,
      originalEditable: false,
      renderSideBySide: (host.current?.clientWidth ?? 1000) > 900,
      fontSize: useApp.getState().settings?.editor.fontSize ?? 14,
      fontFamily: useApp.getState().settings?.editor.fontFamily,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      hideUnchangedRegions: { enabled: true }
    })
    editor.setModel({ original, modified })
    return () => {
      editor.dispose()
      original.dispose()
      modified.dispose()
    }
  }, [tab])
  return <div ref={host} className="editor-host" />
}

function TextView({ tab }: { tab: Tab }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const model = monaco.editor.createModel(tab.text!.content, tab.text!.language)
    const editor = monaco.editor.create(host.current!, { ...editorOptions(), model, readOnly: true, wordWrap: 'on', minimap: { enabled: false } })
    return () => {
      editor.dispose()
      model.dispose()
    }
  }, [tab])
  return <div ref={host} className="editor-host" />
}

// ---------- Ctrl+K inline edit ----------

interface Review {
  range: monaco.Range
  original: string
  decorations: monaco.editor.IEditorDecorationsCollection
  zoneId: string | null
  editor: monaco.editor.ICodeEditor
}

function InlineEdit() {
  const [state, setState] = useState<null | { top: number; phase: 'input' | 'generating' | 'review'; chars: number }>(null)
  const [instruction, setInstruction] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const target = useRef<{ editor: monaco.editor.ICodeEditor; range: monaco.Range; path: string } | null>(null)
  const review = useRef<Review | null>(null)
  const requestId = useRef<string>('')

  const clearReview = () => {
    const r = review.current
    if (!r) return
    r.decorations.clear()
    if (r.zoneId) r.editor.changeViewZones((acc) => acc.removeZone(r.zoneId!))
    review.current = null
  }

  const close = () => {
    if (state?.phase === 'generating') void window.prism.ai.cancel(requestId.current)
    clearReview()
    setState(null)
    target.current?.editor.focus()
  }

  const accept = () => {
    clearReview()
    setState(null)
    setInstruction('')
    target.current?.editor.focus()
  }

  const reject = () => {
    const r = review.current
    if (r) {
      const model = r.editor.getModel()
      model?.pushEditOperations([], [{ range: r.range, text: r.original }], () => null)
    }
    clearReview()
    setState(null)
    target.current?.editor.focus()
  }

  useEffect(() => {
    const open = () => {
      const editor = getActiveEditor()
      const model = editor?.getModel()
      if (!editor || !model) return toast('Open a file and select code, then press Ctrl+K.')
      if (review.current) accept()
      let sel = editor.getSelection()!
      if (!sel.isEmpty()) {
        // Edit whole lines so indentation stays consistent.
        sel = new monaco.Selection(sel.startLineNumber, 1, sel.endColumn === 1 && sel.endLineNumber > sel.startLineNumber ? sel.endLineNumber - 1 : sel.endLineNumber, model.getLineMaxColumn(sel.endColumn === 1 && sel.endLineNumber > sel.startLineNumber ? sel.endLineNumber - 1 : sel.endLineNumber))
        editor.setSelection(sel)
      }
      target.current = { editor, range: monaco.Range.lift(sel), path: model.uri.fsPath }
      const pos = editor.getScrolledVisiblePosition(sel.getStartPosition())
      const top = Math.max(8, (pos?.top ?? 40) - 78)
      setState({ top, phase: 'input', chars: 0 })
      setTimeout(() => inputRef.current?.focus(), 10)
    }
    bus.addEventListener('inline-edit', open)
    return () => bus.removeEventListener('inline-edit', open)
  }, [])

  useEffect(() => {
    return window.prism.ai.onInlineChunk((id, delta) => {
      if (id === requestId.current) setState((s) => (s ? { ...s, chars: s.chars + delta.length } : s))
    })
  }, [])

  const submit = async () => {
    const t = target.current
    const model = t?.editor.getModel()
    if (!t || !model || !instruction.trim()) return
    const range = t.range
    const before = model.getValueInRange(new monaco.Range(Math.max(1, range.startLineNumber - 80), 1, range.startLineNumber, range.startColumn))
    const after = model.getValueInRange(new monaco.Range(range.endLineNumber, range.endColumn, Math.min(model.getLineCount(), range.endLineNumber + 40), model.getLineMaxColumn(Math.min(model.getLineCount(), range.endLineNumber + 40))))
    const original = model.getValueInRange(range)
    requestId.current = newId()
    setState((s) => (s ? { ...s, phase: 'generating', chars: 0 } : s))
    try {
      const result = await window.prism.ai.inlineEdit({
        requestId: requestId.current,
        filePath: t.path,
        language: model.getLanguageId(),
        selection: original,
        prefix: before,
        suffix: after,
        instruction: instruction.trim()
      })
      if (!target.current) return
      model.pushEditOperations([], [{ range, text: result }], () => null)
      const lines = result.split(/\r?\n/)
      const endLine = range.startLineNumber + lines.length - 1
      const endCol = lines.length === 1 ? range.startColumn + lines[0].length : lines[lines.length - 1].length + 1
      const newRange = new monaco.Range(range.startLineNumber, range.startColumn, endLine, endCol)
      const decorations = t.editor.createDecorationsCollection([
        { range: newRange, options: { isWholeLine: true, className: 'inline-added', linesDecorationsClassName: 'inline-added-gutter' } }
      ])
      let zoneId: string | null = null
      if (original.trim()) {
        const origLines = original.split(/\r?\n/)
        const dom = document.createElement('div')
        dom.className = 'inline-removed-zone'
        dom.style.fontSize = `${t.editor.getOption(monaco.editor.EditorOption.fontSize)}px`
        dom.style.lineHeight = `${t.editor.getOption(monaco.editor.EditorOption.lineHeight)}px`
        dom.textContent = origLines.slice(0, 40).join('\n') + (origLines.length > 40 ? `\n… ${origLines.length - 40} more lines` : '')
        t.editor.changeViewZones((acc) => {
          zoneId = acc.addZone({ afterLineNumber: range.startLineNumber - 1, heightInLines: Math.min(origLines.length, 41), domNode: dom })
        })
      }
      review.current = { range: newRange, original, decorations, zoneId, editor: t.editor }
      setState((s) => (s ? { ...s, phase: 'review' } : s))
    } catch (err) {
      if (!/abort/i.test(errorText(err))) toast(errorText(err), 'error')
      setState((s) => (s ? { ...s, phase: 'input' } : s))
    }
  }

  useEffect(() => {
    if (state?.phase !== 'review') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        reject()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        accept()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (!state) return null
  return (
    <div className="inline-edit" style={{ top: state.top }}>
      {state.phase === 'review' ? (
        <div className="row">
          <Sparkles size={13} color="var(--purple)" />
          <span className="grow" style={{ color: 'var(--text-dim)' }}>
            {instruction}
          </span>
          <button className="btn sm primary" onClick={accept}>
            <Check size={13} /> Accept <kbd>Ctrl+⏎</kbd>
          </button>
          <button className="btn sm" onClick={reject}>
            Reject <kbd>Esc</kbd>
          </button>
        </div>
      ) : (
        <>
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={target.current?.range.isEmpty() ? 'Generate code at the cursor…' : 'Edit the selected code…'}
            value={instruction}
            disabled={state.phase === 'generating'}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                close()
              }
            }}
          />
          <div className="row">
            {state.phase === 'generating' ? (
              <>
                <Loader2 size={12} className="spin" />
                <span className="grow shimmer">Generating… {state.chars ? `${state.chars} chars` : ''}</span>
                <button className="btn sm ghost" onClick={close}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="grow">
                  <kbd>Enter</kbd> to generate · <kbd>Esc</kbd> to close
                </span>
                <span>{useApp.getState().settings?.activeModel}</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ---------- tabs & area ----------

function TabBar() {
  const tabs = useApp((s) => s.tabs)
  const active = useApp((s) => s.activeTabId)
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`tab${t.id === active ? ' active' : ''}${t.dirty ? ' dirty' : ''}`}
          onClick={() => useApp.setState({ activeTabId: t.id })}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault()
              closeTab(t.id)
            }
          }}
          title={t.path ? relToWorkspace(t.path) : t.title}
        >
          <FileIcon name={t.kind === 'diff' ? (t.diff?.path ?? t.title) : t.title} size={14} />
          <span style={t.kind === 'diff' ? { fontStyle: 'italic' } : undefined}>{t.title}</span>
          <span
            className="close"
            onClick={(e) => {
              e.stopPropagation()
              closeTab(t.id)
            }}
          >
            <X size={13} className="x" />
            <span className="dot" />
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyEditor() {
  const rows: [string, string][] = [
    ['Go to file', 'Ctrl P'],
    ['Command palette', 'Ctrl Shift P'],
    ['Chat with AI', 'Ctrl I'],
    ['Edit inline with AI', 'Ctrl K'],
    ['Add selection to chat', 'Ctrl L'],
    ['Toggle terminal', 'Ctrl J']
  ]
  return (
    <div className="editor-empty">
      <div className="mark">
        <Logo size={84} />
      </div>
      <div className="shortcut-list">
        {rows.map(([label, keys]) => (
          <div key={label} style={{ display: 'contents' }}>
            <span style={{ textAlign: 'right' }}>{label}</span>
            <span className="k">
              {keys.split(' ').map((k) => (
                <kbd key={k} style={{ marginRight: 3 }}>
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EditorArea() {
  const tabs = useApp((s) => s.tabs)
  const activeId = useApp((s) => s.activeTabId)
  const tab = tabs.find((t) => t.id === activeId)


  if (!tab) return <EmptyEditor />
  const rel = tab.path ? relToWorkspace(tab.path) : tab.title
  return (
    <>
      <TabBar />
      {tab.kind === 'file' && (
        <div className="breadcrumbs">
          {rel.split('/').map((seg, i, arr) => (
            <span key={i} style={{ display: 'contents' }}>
              <span className="crumb">{seg}</span>
              {i < arr.length - 1 && <ChevronRight size={12} />}
            </span>
          ))}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {tab.kind === 'file' && tab.path && <CodeEditor path={tab.path} />}
        {tab.kind === 'file' && tab.path && <ReviewBar path={tab.path} />}
        {tab.kind === 'diff' && <DiffView tab={tab} />}
        {tab.kind === 'text' && <TextView tab={tab} />}
        {tab.kind === 'file' && <InlineEdit />}
      </div>
    </>
  )
}

export { languageFor }
