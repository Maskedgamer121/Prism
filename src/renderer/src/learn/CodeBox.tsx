import { useEffect, useRef } from 'react'
import { monaco } from '../lib/monaco'
import type { RunKind } from '@shared/learn'
import { useApp } from '../store'
import { allowAiComplete } from '../lib/aiComplete'
import { setLearnModelKind } from './completions'

interface Props {
  value: string
  onChange?: (v: string) => void
  language: string
  readOnly?: boolean
  minLines?: number
  maxLines?: number
  /** Fill the parent's height instead of growing with the content. */
  fill?: boolean
  errorLine?: number | null
  onRun?: () => void
  /** Graphics programs get shape and color suggestions. */
  kind?: RunKind
  /** Allow AI ghost-text autocomplete (sandbox only; exercises would get the answer typed for them). */
  aiComplete?: boolean
}

// Type errors are only shown while a TypeScript lesson is open; in real projects the
// editor can't see imported types, so semantic checks stay off there.
let typeCheckUsers = 0
let tsModelSeq = 0
function typeCheckLessons(delta: number): void {
  typeCheckUsers = Math.max(0, typeCheckUsers + delta)
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: typeCheckUsers === 0, noSyntaxValidation: false })
}

/** A compact Monaco editor for lessons and exercises. Grows with its content. */
export function CodeBox({ value, onChange, language, readOnly, minLines = 2, maxLines = 24, fill, errorLine, onRun, kind = 'console', aiComplete }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const ed = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  onChangeRef.current = onChange
  onRunRef.current = onRun
  const fontSize = useApp((s) => Math.max(12, (s.settings?.editor.fontSize ?? 14) - 1))

  useEffect(() => {
    if (language === 'typescript') typeCheckLessons(+1)
    // TypeScript models need a .ts name, or the worker treats them as JavaScript and skips type checks.
    const model = monaco.editor.createModel(value, language, language === 'typescript' ? monaco.Uri.parse(`inmemory://learn/${++tsModelSeq}.ts`) : undefined)
    const editor = monaco.editor.create(host.current!, {
      model,
      theme: 'prism-dark',
      readOnly,
      automaticLayout: true,
      fontSize,
      fontFamily: useApp.getState().settings?.editor.fontFamily,
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 8,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: readOnly ? 'none' : 'line',
      padding: { top: 8, bottom: 8 },
      scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      tabSize: language === 'python' ? 4 : 2,
      insertSpaces: true,
      wordWrap: 'off',
      stickyScroll: { enabled: false },
      contextmenu: !readOnly,
      fixedOverflowWidgets: true,
      quickSuggestions: readOnly ? false : { other: true, strings: true, comments: false },
      suggestOnTriggerCharacters: !readOnly,
      tabCompletion: 'on',
      wordBasedSuggestions: 'off',
      snippetSuggestions: 'top',
      inlineSuggest: { enabled: Boolean(aiComplete) },
      suggest: { showWords: false, preview: true }
    })
    ed.current = editor
    decorations.current = editor.createDecorationsCollection()
    const resize = () => {
      if (fill) return
      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
      const lines = Math.min(maxLines, Math.max(minLines, model.getLineCount()))
      host.current!.style.height = `${lines * lineHeight + 16}px`
      editor.layout()
    }
    resize()
    editor.onDidChangeModelContent(() => {
      onChangeRef.current?.(model.getValue())
      resize()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.())
    const forgetKind = setLearnModelKind(model, kind)
    const forgetAi = aiComplete ? allowAiComplete(model, kind) : () => {}
    return () => {
      forgetKind()
      forgetAi()
      editor.dispose()
      if (language === 'typescript') typeCheckLessons(-1)
      model.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, kind, aiComplete])

  // External value changes (reset, AI challenge) replace the content.
  useEffect(() => {
    const model = ed.current?.getModel()
    if (model && model.getValue() !== value) model.setValue(value)
  }, [value])

  useEffect(() => {
    ed.current?.updateOptions({ fontSize })
  }, [fontSize])

  useEffect(() => {
    if (!decorations.current) return
    decorations.current.set(
      errorLine
        ? [{ range: new monaco.Range(errorLine, 1, errorLine, 1), options: { isWholeLine: true, className: 'learn-error-line', linesDecorationsClassName: 'learn-error-gutter' } }]
        : []
    )
    if (errorLine) ed.current?.revealLineInCenterIfOutsideViewport(errorLine)
  }, [errorLine])

  return <div ref={host} className={`codebox${fill ? ' fill' : ''}`} />
}
