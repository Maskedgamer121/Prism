export type DiffLine = { type: 'same' | 'add' | 'del'; text: string; oldNo?: number; newNo?: number }

const MAX_CELLS = 4_000_000

/** Line diff via LCS on the region between the common prefix and suffix. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.replace(/\r\n/g, '\n').split('\n')
  const b = after.replace(/\r\n/g, '\n').split('\n')
  if (before === '') a.length = 0
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }
  const out: DiffLine[] = []
  for (let i = 0; i < start; i++) out.push({ type: 'same', text: a[i], oldNo: i + 1, newNo: i + 1 })

  const ma = a.slice(start, endA)
  const mb = b.slice(start, endB)
  if (ma.length * mb.length > MAX_CELLS) {
    ma.forEach((t, i) => out.push({ type: 'del', text: t, oldNo: start + i + 1 }))
    mb.forEach((t, i) => out.push({ type: 'add', text: t, newNo: start + i + 1 }))
  } else {
    const n = ma.length
    const m = mb.length
    const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = ma[i] === mb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    let i = 0
    let j = 0
    while (i < n || j < m) {
      if (i < n && j < m && ma[i] === mb[j]) {
        out.push({ type: 'same', text: ma[i], oldNo: start + i + 1, newNo: start + j + 1 })
        i++
        j++
      } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
        out.push({ type: 'add', text: mb[j], newNo: start + j + 1 })
        j++
      } else {
        out.push({ type: 'del', text: ma[i], oldNo: start + i + 1 })
        i++
      }
    }
  }
  for (let k = 0; k < a.length - endA; k++) {
    out.push({ type: 'same', text: a[endA + k], oldNo: endA + k + 1, newNo: endB + k + 1 })
  }
  return out
}

export function diffStats(before: string, after: string): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const l of diffLines(before, after)) {
    if (l.type === 'add') added++
    else if (l.type === 'del') removed++
  }
  return { added, removed }
}

/** Keeps changed lines plus `context` lines around them; gaps become null. */
export function hunks(lines: DiffLine[], context = 3): (DiffLine | null)[] {
  const keep = new Array(lines.length).fill(false)
  lines.forEach((l, i) => {
    if (l.type !== 'same') for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true
  })
  const out: (DiffLine | null)[] = []
  let gap = false
  lines.forEach((l, i) => {
    if (keep[i]) {
      out.push(l)
      gap = false
    } else if (!gap) {
      out.push(null)
      gap = true
    }
  })
  return out
}
