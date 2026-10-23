import { useCallback, useEffect, useRef, useState } from 'react'
import type { GraphicsEvent, RunKind, LearnLanguage, Scene } from '@shared/learn'

export interface RunState {
  running: boolean
  scene: Scene | null
  output: string
  error: { message: string; line?: number } | null
  handlers: string[]
  /** True once the program has finished its top-level code. */
  ready: boolean
}

const EMPTY: RunState = { running: false, scene: null, output: '', error: null, handlers: [], ready: false }
let counter = 0

/**
 * Runs a learner's program and keeps its live state: the drawing, printed output and errors.
 * Graphics programs keep running while they have event handlers; onStep is driven from here.
 */
export function useRun(language: LearnLanguage, kind: RunKind) {
  const [state, setState] = useState<RunState>(EMPTY)
  const id = useRef<string | null>(null)
  const inflight = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const held = useRef(new Set<string>())
  const handlersRef = useRef<string[]>([])

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }

  const stop = useCallback(() => {
    clearTimer()
    if (id.current) void window.prism.learn.stop(id.current)
    id.current = null
    inflight.current = false
    setState((s) => ({ ...s, running: false }))
  }, [])

  const send = useCallback((ev: GraphicsEvent) => {
    if (!id.current) return
    if (ev.type === 'step' || ev.type === 'keyHold' || ev.type === 'mouseMove') {
      // Drop high-frequency events while the program is still busy with the last one.
      if (inflight.current) return
    }
    if (ev.type === 'keyPress') held.current.add(ev.key)
    if (ev.type === 'keyRelease') held.current.delete(ev.key)
    inflight.current = true
    window.prism.learn.send(id.current, ev)
  }, [])

  const startSteps = (sps: number, handlers: string[]) => {
    clearTimer()
    if (!handlers.includes('onStep') && !handlers.includes('onKeyHold')) return
    const interval = 1000 / Math.max(1, Math.min(sps || 30, 120))
    timer.current = setInterval(() => {
      if (!id.current || inflight.current) return
      if (handlersRef.current.includes('onKeyHold') && held.current.size) {
        inflight.current = true
        window.prism.learn.send(id.current, { type: 'keyHold', keys: Array.from(held.current) })
        return
      }
      if (handlersRef.current.includes('onStep')) {
        inflight.current = true
        window.prism.learn.send(id.current, { type: 'step' })
      }
    }, interval)
  }

  useEffect(() => {
    return window.prism.learn.onEvent((runId, msg) => {
      if (runId !== id.current) return
      switch (msg.type) {
        case 'print':
          setState((s) => ({ ...s, output: (s.output + msg.text).slice(-60000) }))
          break
        case 'scene':
          inflight.current = false
          setState((s) => ({ ...s, scene: msg.scene }))
          break
        case 'ready':
          handlersRef.current = msg.handlers
          setState((s) => ({ ...s, ready: true, handlers: msg.handlers, running: msg.handlers.length > 0 }))
          if (msg.handlers.length) startSteps(msg.stepsPerSecond, msg.handlers)
          break
        case 'error':
          clearTimer()
          setState((s) => ({ ...s, error: { message: msg.message, line: msg.line }, running: false }))
          break
        case 'exit':
          clearTimer()
          id.current = null
          setState((s) => ({ ...s, running: false }))
          break
      }
    })
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = useCallback(
    async (code: string) => {
      stop()
      const runId = `run-${Date.now()}-${counter++}`
      id.current = runId
      held.current.clear()
      handlersRef.current = []
      setState({ ...EMPTY, running: true })
      try {
        await window.prism.learn.run(runId, { language, kind, code })
      } catch (err) {
        const message = err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err)
        setState({ ...EMPTY, error: { message } })
        id.current = null
      }
    },
    [language, kind, stop]
  )

  const input = useCallback((text: string) => {
    if (!id.current) return
    setState((s) => ({ ...s, output: s.output + text + '\n' }))
    window.prism.learn.stdin(id.current, text)
  }, [])

  return { state, start, stop, send, input }
}
