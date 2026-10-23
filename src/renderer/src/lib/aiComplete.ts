import { monaco } from './monaco'
import { useApp } from '../store'

/**
 * AI ghost-text autocomplete (press Tab to accept). Works in project files, and in
 * Learn editors that opt in (the Sandbox) — never in graded exercises, where it
 * would just type the answer.
 */
const allowedLearnModels = new Map<string, 'graphics' | 'console'>()

export function allowAiComplete(model: monaco.editor.ITextModel, kind: 'graphics' | 'console' = 'console'): () => void {
  const key = model.uri.toString()
  allowedLearnModels.set(key, kind)
  return () => allowedLearnModels.delete(key)
}

let registered = false
export function registerAiComplete(): void {
  if (registered) return
  registered = true
  const provider = {
    async provideInlineCompletions(model: monaco.editor.ITextModel, position: monaco.Position, _ctx: unknown, token: monaco.CancellationToken) {
      const ac = useApp.getState().settings?.autocomplete
      if (!ac?.enabled || !ac.model) return { items: [] }
      if (model.uri.scheme !== 'file' && !allowedLearnModels.has(model.uri.toString())) return { items: [] }
      const offset = model.getOffsetAt(position)
      const text = model.getValue()
      const prefix = text.slice(Math.max(0, offset - 4000), offset)
      const suffix = text.slice(offset, offset + 1500)
      const filePath = model.uri.scheme === 'file' ? model.uri.fsPath : `sandbox-${allowedLearnModels.get(model.uri.toString())}.${model.getLanguageId()}`
      const insert = await window.prism.ai.complete({ requestId: 'autocomplete', filePath, language: model.getLanguageId(), prefix, suffix })
      if (token.isCancellationRequested || !insert.trim()) return { items: [] }
      return { items: [{ insertText: insert, range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column) }] }
    },
    disposeInlineCompletions() {},
    freeInlineCompletions() {}
  }
  monaco.languages.registerInlineCompletionsProvider('*', provider as unknown as monaco.languages.InlineCompletionsProvider)
}
