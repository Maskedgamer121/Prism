import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'

/**
 * In-app replacement for window.prompt(), which Electron doesn't support.
 * `askText` resolves with the entered text, or null when cancelled.
 */

interface Request {
  title: string
  message?: string
  value: string
  placeholder?: string
  confirm: string
  /** Return an error message to keep the dialog open. */
  validate?: (v: string) => string | null
  resolve: (v: string | null) => void
}

const useDialog = create<{ req: Request | null }>(() => ({ req: null }))

export function askText(opts: Omit<Request, 'resolve' | 'confirm'> & { confirm?: string }): Promise<string | null> {
  return new Promise((resolve) => {
    useDialog.getState().req?.resolve(null)
    useDialog.setState({ req: { confirm: 'OK', ...opts, resolve } })
  })
}

export function DialogHost() {
  const req = useDialog((s) => s.req)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!req) return
    setValue(req.value)
    setError(null)
    setTimeout(() => {
      const el = input.current
      if (!el) return
      el.focus()
      // Select the name part so typing replaces it but keeps the extension.
      const dot = req.value.lastIndexOf('.')
      el.setSelectionRange(0, dot > 0 ? dot : req.value.length)
    }, 0)
  }, [req])

  if (!req) return null
  const close = (result: string | null) => {
    useDialog.setState({ req: null })
    req.resolve(result)
  }
  const submit = () => {
    const v = value.trim()
    if (!v) return setError('Please enter a name.')
    const problem = req.validate?.(v)
    if (problem) return setError(problem)
    close(v)
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && close(null)}>
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        onKeyDown={(e) => e.key === 'Escape' && close(null)}
      >
        <div className="dialog-title">{req.title}</div>
        {req.message && <div className="dialog-message">{req.message}</div>}
        <input
          ref={input}
          className="input"
          value={value}
          placeholder={req.placeholder}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
        />
        {error && <div className="dialog-error">{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={() => close(null)}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            {req.confirm}
          </button>
        </div>
      </form>
    </div>
  )
}
