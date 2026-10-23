/**
 * Splits a streamed string into visible text and `<think>…</think>` reasoning,
 * which many local reasoning models (Qwen3, DeepSeek-R1, …) emit inline.
 * Handles tags that are split across chunks.
 */
export class ThinkSplitter {
  private buf = ''
  private inThink = false

  constructor(
    private onText: (s: string) => void,
    private onThink: (s: string) => void
  ) {}

  push(chunk: string): void {
    this.buf += chunk
    for (;;) {
      const tag = this.inThink ? '</think>' : '<think>'
      const idx = this.buf.indexOf(tag)
      if (idx >= 0) {
        this.emit(this.buf.slice(0, idx))
        this.buf = this.buf.slice(idx + tag.length)
        this.inThink = !this.inThink
        continue
      }
      // Keep a possible partial tag at the end of the buffer for the next chunk.
      let keep = 0
      for (let k = Math.min(tag.length - 1, this.buf.length); k > 0; k--) {
        if (tag.startsWith(this.buf.slice(-k))) {
          keep = k
          break
        }
      }
      this.emit(this.buf.slice(0, this.buf.length - keep))
      this.buf = this.buf.slice(this.buf.length - keep)
      return
    }
  }

  flush(): void {
    this.emit(this.buf)
    this.buf = ''
  }

  private emit(s: string): void {
    if (!s) return
    if (this.inThink) this.onThink(s)
    else this.onText(s)
  }
}

/** Removes inline reasoning from a finished string. */
export function stripThink(s: string): string {
  return s.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim()
}
