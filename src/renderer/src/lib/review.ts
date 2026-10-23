import { diffLines } from '@shared/diff'
import { useApp, toast, errorText, joinPath } from '../store'
import { getModel, saveFile, openFile } from './editor'

/**
 * Cursor-style review of AI edits. The agent writes to disk right away (so builds
 * and tests see the change); we remember each file's content from before the AI
 * touched it and let the user accept or reject every change against that baseline.
 */

export interface Hunk {
  /** 1-based line in the baseline where the hunk starts, and how many lines it removes. */
  oldStart: number
  removed: string[]
  /** 1-based line in the current text where the hunk starts, and the lines it adds. */
  newStart: number
  added: string[]
}

export const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase()

export function absPath(p: string): string {
  const ws = useApp.getState().workspace
  if (!ws || /^([a-zA-Z]:[\\/]|\/)/.test(p)) return p
  return joinPath(ws, p)
}

export function hunksOf(baseline: string, current: string): Hunk[] {
  const lines = diffLines(baseline, current)
  const out: Hunk[] = []
  let oldLine = 1
  let newLine = 1
  let cur: Hunk | null = null
  for (const l of lines) {
    if (l.type === 'same') {
      if (cur) out.push(cur)
      cur = null
      oldLine++
      newLine++
      continue
    }
    if (!cur) cur = { oldStart: oldLine, removed: [], newStart: newLine, added: [] }
    if (l.type === 'del') {
      cur.removed.push(l.text)
      oldLine++
    } else {
      cur.added.push(l.text)
      newLine++
    }
  }
  if (cur) out.push(cur)
  return out
}

export function currentText(path: string): string | null {
  return getModel(path)?.getValue() ?? null
}

/** Records the baseline the first time the AI edits a file during this review. */
export function addReview(path: string, before: string | null): void {
  const key = norm(path)
  const reviews = useApp.getState().reviews
  if (reviews[key]) return
  useApp.setState({ reviews: { ...reviews, [key]: { path, baseline: before } } })
}

function drop(path: string): void {
  const reviews = { ...useApp.getState().reviews }
  delete reviews[norm(path)]
  useApp.setState({ reviews })
}

export function acceptFile(path: string): void {
  drop(path)
}

export async function rejectFile(path: string): Promise<void> {
  const r = useApp.getState().reviews[norm(path)]
  if (!r) return
  try {
    if (r.baseline === null) {
      await window.prism.fs.deleteFile(path)
    } else {
      const model = getModel(path)
      if (model) {
        model.pushEditOperations([], [{ range: model.getFullModelRange(), text: r.baseline }], () => null)
        await saveFile(path)
      } else await window.prism.fs.writeFile(path, r.baseline)
    }
    drop(path)
  } catch (err) {
    toast(`Couldn't undo the changes: ${errorText(err)}`, 'error')
  }
}

export function acceptAll(): void {
  useApp.setState({ reviews: {} })
}

export async function rejectAll(): Promise<void> {
  for (const r of Object.values(useApp.getState().reviews)) await rejectFile(r.path)
}

/** Keeps one change: it becomes part of the baseline. */
export function acceptHunk(path: string, h: Hunk): void {
  const r = useApp.getState().reviews[norm(path)]
  if (!r) return
  const base = (r.baseline ?? '').replace(/\r\n/g, '\n').split('\n')
  if (r.baseline === '' || r.baseline === null) base.length = 0
  base.splice(h.oldStart - 1, h.removed.length, ...h.added)
  const baseline = base.join('\n')
  const current = currentText(path)?.replace(/\r\n/g, '\n')
  if (current !== undefined && current !== null && current === baseline) return drop(path)
  useApp.setState({ reviews: { ...useApp.getState().reviews, [norm(path)]: { path: r.path, baseline } } })
}

/** Undoes one change in the file and saves it. */
export async function rejectHunk(path: string, h: Hunk): Promise<void> {
  const model = getModel(path)
  if (!model) return
  const lines = model.getLinesContent()
  if (lines.length === 1 && lines[0] === '' && h.added.length === 0) lines.length = 0
  lines.splice(h.newStart - 1, h.added.length, ...h.removed)
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text: lines.join(model.getEOL()) }], () => null)
  await saveFile(path)
  const r = useApp.getState().reviews[norm(path)]
  if (r && (r.baseline ?? '').replace(/\r\n/g, '\n') === model.getValue().replace(/\r\n/g, '\n')) drop(path)
}

export function reviewStats(path: string): { added: number; removed: number } {
  const r = useApp.getState().reviews[norm(path)]
  const cur = currentText(path)
  if (!r || cur === null) return { added: 0, removed: 0 }
  let added = 0
  let removed = 0
  for (const h of hunksOf(r.baseline ?? '', cur)) {
    added += h.added.length
    removed += h.removed.length
  }
  return { added, removed }
}

/** Opens the next file with pending changes after `current` (wraps around). */
export function openNextReview(current?: string): void {
  const list = Object.values(useApp.getState().reviews)
  if (!list.length) return
  const i = current ? list.findIndex((r) => norm(r.path) === norm(current)) : -1
  void openFile(list[(i + 1) % list.length].path)
}
