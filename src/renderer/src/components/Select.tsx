import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption<T extends string | number> {
  value: T
  label: string
  description?: string
  icon?: ReactNode
  group?: string
  disabled?: boolean
}

interface Props<T extends string | number> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  /** Visual size of the trigger. */
  size?: 'sm' | 'md'
  /** Stretch the trigger to its container. */
  block?: boolean
  align?: 'left' | 'right'
  title?: string
}

/** A styled dropdown that replaces the native <select>. Keyboard: arrows, Enter, Esc, type to jump. */
export function Select<T extends string | number>({ value, options, onChange, placeholder = 'Choose…', size = 'md', block, align = 'right', title }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; minWidth: number; maxHeight: number }>({ left: 0, top: 0, minWidth: 0, maxHeight: 320 })
  const typed = useRef({ text: '', at: 0 })
  const selected = options.find((o) => o.value === value)

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return
    const r = trigger.current.getBoundingClientRect()
    const w = Math.max(menu.current.offsetWidth, r.width)
    const h = menu.current.offsetHeight
    let left = align === 'right' ? r.right - w : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const placeBelow = below >= Math.min(h, 240) || below >= above
    const maxHeight = Math.max(120, placeBelow ? below : above)
    const top = placeBelow ? r.bottom + 4 : Math.max(8, r.top - Math.min(h, maxHeight) - 4)
    setPos({ left, top, minWidth: r.width, maxHeight })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close, true)
    window.addEventListener('blur', () => setOpen(false), { once: true })
    return () => window.removeEventListener('mousedown', close, true)
  }, [open])

  useEffect(() => {
    if (open) menu.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const choose = (i: number) => {
    const o = options[i]
    if (!o || o.disabled) return
    onChange(o.value)
    setOpen(false)
    trigger.current?.focus()
  }

  const step = (dir: number) => {
    let i = active
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length
      if (!options[i].disabled) break
    }
    setActive(i)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'ArrowDown') step(1)
    else if (e.key === 'ArrowUp') step(-1)
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text))
      if (i >= 0) setActive(i)
      return
    } else return
    e.preventDefault()
  }

  let lastGroup: string | undefined
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`select-trigger ${size}${block ? ' block' : ''}${open ? ' open' : ''}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.icon}
        <span className="select-value">{selected?.label ?? placeholder}</span>
        <ChevronDown size={13} className="select-chevron" />
      </button>
      {open &&
        createPortal(
          <div ref={menu} className="select-menu" role="listbox" style={{ left: pos.left, top: pos.top, minWidth: pos.minWidth, maxHeight: pos.maxHeight }} onKeyDown={onKeyDown}>
            {options.map((o, i) => {
              const header = o.group && o.group !== lastGroup ? o.group : null
              lastGroup = o.group
              return (
                <div key={`${o.group ?? ''}:${o.value}`}>
                  {header && <div className="select-group">{header}</div>}
                  <div
                    data-index={i}
                    role="option"
                    aria-selected={o.value === value}
                    className={`select-option${i === active ? ' active' : ''}${o.disabled ? ' disabled' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      choose(i)
                    }}
                  >
                    {o.icon}
                    <span className="select-text">
                      <span>{o.label}</span>
                      {o.description && <span className="select-desc">{o.description}</span>}
                    </span>
                    {o.value === value && <Check size={14} className="select-check" />}
                  </div>
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}
