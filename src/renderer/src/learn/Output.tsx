import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CornerDownLeft, MousePointer2 } from 'lucide-react'
import type { GraphicsEvent, Scene } from '@shared/learn'
import { CANVAS, drawScene } from './scene'

const KEYS: Record<string, string> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'space', Enter: 'enter', Escape: 'escape',
  Backspace: 'backspace', Tab: 'tab', Delete: 'delete', Shift: 'shift', Control: 'ctrl', Alt: 'alt', Meta: 'meta'
}

export function SceneCanvas({ scene, size, className }: { scene: Scene | null; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const px = Math.round((size ?? CANVAS) * (window.devicePixelRatio || 1))
    if (c.width !== px) c.width = c.height = px
    drawScene(c.getContext('2d')!, scene, px)
  }, [scene, size])
  return <canvas ref={ref} className={className} style={size ? { width: size, height: size } : undefined} />
}

interface CanvasProps {
  scene: Scene | null
  handlers: string[]
  onEvent?: (e: GraphicsEvent) => void
  overlay?: React.ReactNode
}

/** The program's 400x400 canvas. Forwards mouse and keyboard to the running program. */
export function GraphicsCanvas({ scene, handlers, onEvent, overlay }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const wantsKeys = handlers.some((h) => h.startsWith('onKey'))

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const draw = () => {
      const px = Math.round(c.clientWidth * (window.devicePixelRatio || 1)) || CANVAS
      if (c.width !== px) c.width = c.height = px
      drawScene(c.getContext('2d')!, scene, px)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [scene])

  useEffect(() => {
    if (wantsKeys) ref.current?.focus()
  }, [wantsKeys])

  const point = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: Math.round(((e.clientX - r.left) * CANVAS) / r.width), y: Math.round(((e.clientY - r.top) * CANVAS) / r.height) }
  }

  return (
    <div className="gfx">
      <div className="gfx-frame">
        <canvas
          ref={ref}
          tabIndex={0}
          className="gfx-canvas"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onMouseDown={(e) => {
            ref.current?.focus()
            onEvent?.({ type: 'mousePress', ...point(e) })
          }}
          onMouseUp={(e) => onEvent?.({ type: 'mouseRelease', ...point(e) })}
          onMouseMove={(e) => {
            const p = point(e)
            setPos(p)
            if (e.buttons & 1) {
              if (handlers.includes('onMouseDrag')) onEvent?.({ type: 'mouseDrag', ...p })
            } else if (handlers.includes('onMouseMove')) onEvent?.({ type: 'mouseMove', ...p })
          }}
          onMouseLeave={() => setPos(null)}
          onKeyDown={(e) => {
            if (!wantsKeys) return
            e.preventDefault()
            e.stopPropagation()
            if (e.repeat) return
            onEvent?.({ type: 'keyPress', key: KEYS[e.key] ?? e.key })
          }}
          onKeyUp={(e) => {
            if (!wantsKeys) return
            e.preventDefault()
            onEvent?.({ type: 'keyRelease', key: KEYS[e.key] ?? e.key })
          }}
        />
        {overlay}
      </div>
      <div className="gfx-status">
        <span>{wantsKeys ? (focused ? 'Keyboard goes to your program' : 'Click the canvas to use the keyboard') : handlers.length ? 'Your program is listening for events' : ' '}</span>
        <span className="coords">
          <MousePointer2 size={11} /> x: {pos?.x ?? '–'} y: {pos?.y ?? '–'}
        </span>
      </div>
    </div>
  )
}

interface ConsoleProps {
  output: string
  error: { message: string; line?: number } | null
  acceptsInput: boolean
  onInput?: (text: string) => void
  placeholder?: string
}

export function ConsoleView({ output, error, acceptsInput, onInput, placeholder }: ConsoleProps) {
  const [text, setText] = useState('')
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight })
  }, [output, error])
  return (
    <div className="console">
      <div className="console-head">Console</div>
      <div className="console-body" ref={body}>
        {!output && !error && <div className="console-empty">{placeholder ?? 'Output from print() appears here. Errors show up here too.'}</div>}
        {output && <pre>{output}</pre>}
        {error && (
          <div className="console-error">
            <AlertTriangle size={14} />
            <div>
              {error.line ? <div className="where">Line {error.line}</div> : null}
              <pre>{error.message}</pre>
            </div>
          </div>
        )}
      </div>
      {acceptsInput && (
        <form
          className="console-input"
          onSubmit={(e) => {
            e.preventDefault()
            onInput?.(text)
            setText('')
          }}
        >
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer and press Enter…" />
          <CornerDownLeft size={13} />
        </form>
      )}
    </div>
  )
}
