import type { Exercise, GraphicsEvent, LearnTest, Section } from '@shared/learn'

/** A console exercise: graded by comparing output with the solution's for each test input. */
export function cx(id: string, title: string, prompt: string, starter: string, solution: string, tests: LearnTest[] = [{ label: 'Output matches' }], extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'console', prompt, starter, solution, tests, points: 1, ...extra }
}

/** A graphics exercise: graded by comparing the drawing with the solution's. */
export function gx(id: string, title: string, prompt: string, starter: string, solution: string, extra: Partial<Exercise> = {}): Exercise {
  return { id, title, kind: 'graphics', prompt, starter, solution, tests: [{ label: 'Your drawing matches the goal' }], points: 1, ...extra }
}

export const input = (label: string, stdin: string): LearnTest => ({ label, stdin })
export const click = (x: number, y: number): GraphicsEvent => ({ type: 'mousePress', x, y })
export const key = (k: string): GraphicsEvent => ({ type: 'keyPress', key: k })
export const steps = (count: number): GraphicsEvent => ({ type: 'step', count })

export const text = (md: string): Section => ({ type: 'text', md })
export const doc = (api: string): Section => ({ type: 'doc', api })
export const example = (code: string, caption?: string): Section => ({ type: 'example', code, caption })
export const tip = (md: string): Section => ({ type: 'callout', tone: 'tip', md })
export const warn = (md: string): Section => ({ type: 'callout', tone: 'warn', md })
export const checkpoint = (exercise: Exercise): Section => ({ type: 'checkpoint', exercise })
export const requires = (pattern: string, message: string) => ({ pattern, message })
