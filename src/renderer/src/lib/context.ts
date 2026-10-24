import { useEffect, useState } from 'react'
import { toast, updateSettings, useApp } from '../store'

/** Context window sizes offered for Ollama models. Bigger windows use more RAM/VRAM. */
export const CONTEXT_SIZES: { tokens: number; hint: string }[] = [
  { tokens: 8192, hint: 'Least memory, short chats' },
  { tokens: 16384, hint: 'Default' },
  { tokens: 32768, hint: 'Good for agent work' },
  { tokens: 65536, hint: 'Long chats — needs plenty of RAM/VRAM' },
  { tokens: 131072, hint: 'Very long — big GPUs only' }
]

export const formatTokens = (n: number): string => (n >= 1000 ? `${Math.round(n / 1024)}k` : String(n))

const maxCache = new Map<string, number | null>()

/** The longest context the active Ollama model supports (null when unknown). */
export function useModelContextMax(model: string | undefined, enabled: boolean): number | null {
  const [max, setMax] = useState<number | null>(model ? (maxCache.get(model) ?? null) : null)
  useEffect(() => {
    if (!enabled || !model) return
    if (maxCache.has(model)) return setMax(maxCache.get(model) ?? null)
    let live = true
    void window.prism.settings.ollamaContextLength(model).then((n) => {
      maxCache.set(model, n)
      if (live) setMax(n)
    })
    return () => {
      live = false
    }
  }, [model, enabled])
  return max
}

export async function setContextSize(tokens: number): Promise<void> {
  await updateSettings({ ollamaNumCtx: tokens })
  toast(`Context window: ${formatTokens(tokens)} tokens. The model reloads once with the new size.`, 'success')
}

/** The next size up that the model supports, or null when already at the top. */
export function nextContextSize(current: number, max: number | null): number | null {
  return CONTEXT_SIZES.find((s) => s.tokens > current && (max === null || s.tokens <= max))?.tokens ?? null
}

export async function raiseContext(): Promise<void> {
  const s = useApp.getState().settings
  if (!s) return
  const model = s.activeModel
  const max = maxCache.get(model) ?? (await window.prism.settings.ollamaContextLength(model).catch(() => null))
  const next = nextContextSize(s.ollamaNumCtx, max)
  if (next) await setContextSize(next)
  else toast(`${formatTokens(s.ollamaNumCtx)} is already the largest size offered for this model.`)
}
