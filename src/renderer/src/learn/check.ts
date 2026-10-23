import { monaco } from '../lib/monaco'
import type { CollectResult, Exercise, LearnLanguage, Scene } from '@shared/learn'
import { MATCH_THRESHOLD, sceneDifference } from './scene'

export interface TestOutcome {
  label: string
  pass: boolean
  detail?: string
  scene?: Scene
  goal?: Scene
  expected?: string
  got?: string
}

export interface CheckOutcome {
  passed: boolean
  tests: TestOutcome[]
  requirements: string[]
}

const solutionCache = new Map<string, Promise<CollectResult>>()

/** Runs the reference solution once per exercise and remembers the result (the "goal"). */
export function solutionResult(ex: Exercise, language: LearnLanguage): Promise<CollectResult> {
  const key = `${language}:${ex.id}:${ex.solution.length}`
  let p = solutionCache.get(key)
  if (!p) {
    p = window.prism.learn.collect({ language, kind: ex.kind, code: ex.solution }, ex.tests)
    p.catch(() => solutionCache.delete(key))
    solutionCache.set(key, p)
  }
  return p
}

function normalize(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
}

function stripComments(code: string, language: LearnLanguage): string {
  if (language === 'python') return code.replace(/#.*$/gm, '')
  if (language === 'lua' || language === 'sql') return code.replace(/--.*$/gm, '')
  return code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

function firstDifference(expected: string, got: string): string {
  const e = expected.split('\n')
  const g = got.split('\n')
  for (let i = 0; i < Math.max(e.length, g.length); i++) {
    if (e[i] !== g[i]) {
      if (g[i] === undefined) return `Your program stopped after ${g.length} line${g.length === 1 ? '' : 's'}; expected line ${i + 1} is "${e[i]}".`
      if (e[i] === undefined) return `Your program printed an extra line ${i + 1}: "${g[i]}".`
      return `Line ${i + 1}: expected "${e[i]}" but got "${g[i]}".`
    }
  }
  return ''
}

export async function checkExercise(ex: Exercise, language: LearnLanguage, code: string): Promise<CheckOutcome> {
  const clean = stripComments(code, language)
  const requirements = (ex.requires ?? []).filter((r) => !new RegExp(r.pattern, 'm').test(clean)).map((r) => r.message)
  if (language === 'typescript') {
    // The runtime only strips types, so use the editor's type checker for type errors.
    const model = monaco.editor.getModels().find((m) => m.getLanguageId() === 'typescript' && m.getValue() === code)
    const errors = model ? monaco.editor.getModelMarkers({ resource: model.uri }).filter((m) => m.severity === monaco.MarkerSeverity.Error) : []
    for (const e of errors.slice(0, 3)) requirements.push(`Type error on line ${e.startLineNumber}: ${e.message}`)
  }
  const [student, goal] = await Promise.all([window.prism.learn.collect({ language, kind: ex.kind, code }, ex.tests), solutionResult(ex, language)])
  const tests: TestOutcome[] = []
  const list = ex.tests.length ? ex.tests : [{ label: 'Run' }]
  list.forEach((t, i) => {
    const s = student.results[i]
    const g = goal.results[i]
    if (!s) return tests.push({ label: t.label, pass: false, detail: 'Did not run.' })
    if (s.error) return tests.push({ label: t.label, pass: false, detail: s.error, scene: s.scene, goal: g?.scene })
    if (ex.kind === 'graphics') {
      const { ratio } = sceneDifference(s.scene ?? null, g?.scene ?? null)
      tests.push({
        label: t.label,
        pass: ratio < MATCH_THRESHOLD,
        detail: ratio < MATCH_THRESHOLD ? undefined : "Your drawing doesn't match the goal yet. Compare them with the Goal tab.",
        scene: s.scene,
        goal: g?.scene
      })
    } else {
      const expected = normalize(g?.output ?? '')
      const got = normalize(s.output)
      const pass = ex.match === 'contains' ? got.includes(expected) : got === expected
      const label = t.stdin !== undefined ? `Input: ${t.label}` : t.label
      tests.push({ label, pass, detail: pass ? undefined : firstDifference(expected, got) || 'The output is different.', expected, got })
    }
  })
  return { passed: requirements.length === 0 && tests.every((t) => t.pass), tests, requirements }
}
