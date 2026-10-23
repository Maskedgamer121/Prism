import { create } from 'zustand'
import type { Exercise, LearnProgress, Lesson, Track } from '@shared/learn'
import { TRACKS } from './content'

export type LearnPage =
  | { page: 'home' }
  | { page: 'track'; trackId: string }
  | { page: 'lesson'; trackId: string; lessonId: string }
  | { page: 'exercise'; trackId: string; lessonId: string; exerciseId: string }
  | { page: 'docs'; trackId: string; api?: string }
  | { page: 'sandbox'; trackId: string }
  | { page: 'challenges'; trackId: string; exerciseId?: string }

interface LearnState {
  nav: LearnPage
  back: LearnPage[]
  progress: LearnProgress
  runtimes: { python: string | null; javascript: string; lua: string } | null
}

function loadNav(): LearnPage {
  try {
    const raw = localStorage.getItem('prism.learn.nav')
    if (raw) return JSON.parse(raw) as LearnPage
  } catch {
    /* ignore */
  }
  return { page: 'home' }
}

export const useLearn = create<LearnState>(() => ({
  nav: loadNav(),
  back: [],
  progress: { completed: {}, drafts: {}, xp: 0 },
  runtimes: null
}))

export async function initLearn(): Promise<void> {
  const [progress, runtimes] = await Promise.all([window.prism.learn.getProgress(), window.prism.learn.runtimes()])
  useLearn.setState({ progress, runtimes })
}

export function go(nav: LearnPage): void {
  const s = useLearn.getState()
  useLearn.setState({ nav, back: [...s.back.slice(-30), s.nav] })
  try {
    localStorage.setItem('prism.learn.nav', JSON.stringify(nav))
  } catch {
    /* ignore */
  }
  document.querySelector('.learn-main')?.scrollTo({ top: 0 })
}

export function goBack(): void {
  const s = useLearn.getState()
  const prev = s.back[s.back.length - 1]
  if (!prev) return go({ page: 'home' })
  useLearn.setState({ nav: prev, back: s.back.slice(0, -1) })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function persist(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void window.prism.learn.saveProgress(useLearn.getState().progress), 400)
}

export function updateProgress(fn: (p: LearnProgress) => LearnProgress): void {
  useLearn.setState((s) => ({ progress: fn(s.progress) }))
  persist()
}

export function markComplete(ex: Exercise, trackId: string): boolean {
  const p = useLearn.getState().progress
  if (p.completed[ex.id]) return false
  const points = ex.points ?? 1
  const today = new Date().toISOString().slice(0, 10)
  updateProgress((prev) => ({
    ...prev,
    completed: { ...prev.completed, [ex.id]: { at: Date.now(), points } },
    xp: prev.xp + points,
    lastTrack: trackId,
    days: Array.from(new Set([...(prev.days ?? []), today])).slice(-400)
  }))
  return true
}

export function saveDraft(id: string, code: string): void {
  updateProgress((p) => ({ ...p, drafts: { ...p.drafts, [id]: code } }))
}

export function streak(days: string[] = []): number {
  const set = new Set(days)
  let n = 0
  const d = new Date()
  // Today not done yet doesn't break the streak.
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (set.has(d.toISOString().slice(0, 10))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function findTrack(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id)
}

export function findLesson(track: Track, lessonId: string): { lesson: Lesson; unitIndex: number; lessonIndex: number } | undefined {
  for (let u = 0; u < track.units.length; u++) {
    const l = track.units[u].lessons.findIndex((x) => x.id === lessonId)
    if (l >= 0) return { lesson: track.units[u].lessons[l], unitIndex: u, lessonIndex: l }
  }
  return undefined
}

export function allLessons(track: Track): Lesson[] {
  return track.units.flatMap((u) => u.lessons)
}

/** Every gradable item in a lesson: inline checkpoints and practice exercises. */
export function lessonItems(lesson: Lesson): Exercise[] {
  const checkpoints = lesson.parts.flatMap((p) => p.sections.flatMap((s) => (s.type === 'checkpoint' ? [s.exercise] : [])))
  return [...checkpoints, ...lesson.exercises]
}

export function trackStats(track: Track, progress: LearnProgress): { done: number; total: number } {
  const items = allLessons(track).flatMap(lessonItems)
  return { done: items.filter((e) => progress.completed[e.id]).length, total: items.length }
}

export function lessonNumber(track: Track, lessonId: string): string {
  const f = findLesson(track, lessonId)
  return f ? `${f.unitIndex + 1}.${f.lessonIndex + 1}` : ''
}
