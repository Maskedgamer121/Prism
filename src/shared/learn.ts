// Types for the Learn tab: curriculum, runnable code and the graphics scene protocol.

export type LearnLanguage = 'python' | 'javascript' | 'typescript' | 'lua' | 'sql'
export type RunKind = 'graphics' | 'console'

// ---------- graphics scene (produced by the language runtimes, drawn by the renderer) ----------

export interface Gradient {
  type: 'gradient'
  colors: string[]
  start: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'left-top' | 'right-top' | 'left-bottom' | 'right-bottom'
}
export type Paint = string | Gradient | null

interface ShapeBase {
  fill: Paint
  border: Paint
  borderWidth: number
  opacity: number
  rotateAngle: number
  dashes: boolean
}

export type SceneShape =
  | (ShapeBase & { t: 'rect'; left: number; top: number; width: number; height: number })
  | (ShapeBase & { t: 'oval'; centerX: number; centerY: number; width: number; height: number })
  | (ShapeBase & { t: 'arc'; centerX: number; centerY: number; width: number; height: number; startAngle: number; sweepAngle: number })
  | (ShapeBase & { t: 'polygon'; points: number[] })
  | (ShapeBase & { t: 'line'; x1: number; y1: number; x2: number; y2: number; lineWidth: number; arrowStart: boolean; arrowEnd: boolean })
  | (ShapeBase & { t: 'label'; value: string; centerX: number; centerY: number; size: number; font: string; bold: boolean; italic: boolean })

export interface Scene {
  background: Paint
  shapes: SceneShape[]
}

/** Input events sent to a running graphics program. */
export type GraphicsEvent =
  | { type: 'mousePress' | 'mouseRelease' | 'mouseMove' | 'mouseDrag'; x: number; y: number }
  | { type: 'keyPress' | 'keyRelease'; key: string }
  | { type: 'step'; count?: number }
  | { type: 'keyHold'; keys: string[] }

/** Messages streamed from a running program. */
export type RunMessage =
  | { type: 'print'; text: string }
  | { type: 'scene'; scene: Scene }
  | { type: 'ready'; handlers: string[]; stepsPerSecond: number }
  | { type: 'error'; message: string; line?: number }
  | { type: 'exit'; code: number | null }

export interface RunRequest {
  language: LearnLanguage
  kind: RunKind
  code: string
}

/** One test: graphics tests replay events, console tests feed stdin. */
export interface LearnTest {
  label: string
  events?: GraphicsEvent[]
  stdin?: string
}

export interface CollectResult {
  /** One entry per test. Graphics: final scene. Console: full stdout. */
  results: { scene?: Scene; output: string; error?: string }[]
}

// ---------- curriculum ----------

export interface Exercise {
  id: string
  title: string
  kind: RunKind
  /** Markdown instructions. */
  prompt: string
  starter: string
  solution: string
  tests: LearnTest[]
  /** Source must match these (e.g. "use a for loop"). */
  requires?: { pattern: string; message: string }[]
  hints?: string[]
  points?: number
  /** Console tests: how to compare output. Default 'exact' (whitespace-trimmed lines). */
  match?: 'exact' | 'contains'
}

export type Section =
  | { type: 'text'; md: string }
  | { type: 'doc'; api: string }
  | { type: 'example'; code: string; caption?: string }
  | { type: 'callout'; md: string; tone?: 'info' | 'tip' | 'warn' }
  | { type: 'checkpoint'; exercise: Exercise }

export interface Lesson {
  id: string
  title: string
  summary: string
  /** Named sections shown in the lesson's side navigation. */
  parts: { title: string; sections: Section[] }[]
  exercises: Exercise[]
}

export interface Unit {
  id: string
  title: string
  lessons: Lesson[]
}

export interface Track {
  id: string
  language: LearnLanguage
  kind: RunKind
  title: string
  tagline: string
  level: string
  /** API reference for this track (graphics tracks). */
  docs?: string
  units: Unit[]
}

export interface ApiParam {
  name: string
  desc: string
  default?: string
}

export interface ApiDoc {
  name: string
  category: string
  signature: string
  summary: string
  params?: ApiParam[]
  properties?: { name: string; desc: string }[]
  example: string
  tips?: string[]
}

export interface LearnProgress {
  completed: Record<string, { at: number; points: number }>
  drafts: Record<string, string>
  xp: number
  lastTrack?: string
  /** AI-generated challenges, per track. */
  generated?: Record<string, Exercise[]>
  /** Days (YYYY-MM-DD) on which the learner completed something, for the streak. */
  days?: string[]
}
