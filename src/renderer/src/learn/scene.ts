import type { Paint, Scene, SceneShape } from '@shared/learn'

export const CANVAS = 400

const FONTS: Record<string, string> = {
  arial: 'Arial, Helvetica, sans-serif',
  monospace: "'Cascadia Code', Consolas, monospace",
  serif: "Georgia, 'Times New Roman', serif",
  'sans-serif': 'Arial, Helvetica, sans-serif',
  cursive: "'Comic Sans MS', cursive",
  fantasy: 'Impact, fantasy',
  montserrat: "'Segoe UI', Arial, sans-serif",
  orbitron: "'Segoe UI', Arial, sans-serif"
}

type Box = { l: number; t: number; r: number; b: number }

function fontOf(s: Extract<SceneShape, { t: 'label' }>): string {
  return `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.size}px ${FONTS[s.font.toLowerCase()] ?? `${s.font}, Arial, sans-serif`}`
}

function boundsOf(ctx: CanvasRenderingContext2D, s: SceneShape): Box {
  switch (s.t) {
    case 'rect':
      return { l: s.left, t: s.top, r: s.left + s.width, b: s.top + s.height }
    case 'oval':
    case 'arc':
      return { l: s.centerX - s.width / 2, t: s.centerY - s.height / 2, r: s.centerX + s.width / 2, b: s.centerY + s.height / 2 }
    case 'polygon': {
      const xs = s.points.filter((_, i) => i % 2 === 0)
      const ys = s.points.filter((_, i) => i % 2 === 1)
      return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) }
    }
    case 'line':
      return { l: Math.min(s.x1, s.x2), t: Math.min(s.y1, s.y2), r: Math.max(s.x1, s.x2), b: Math.max(s.y1, s.y2) }
    case 'label': {
      ctx.font = fontOf(s)
      const w = ctx.measureText(s.value).width
      return { l: s.centerX - w / 2, t: s.centerY - s.size / 2, r: s.centerX + w / 2, b: s.centerY + s.size / 2 }
    }
  }
}

function paintStyle(ctx: CanvasRenderingContext2D, paint: Paint, box: Box): string | CanvasGradient | null {
  if (!paint) return null
  if (typeof paint === 'string') return paint
  const { l, t, r, b } = box
  const cx = (l + r) / 2
  const cy = (t + b) / 2
  let g: CanvasGradient
  if (paint.start === 'center') {
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, Math.hypot(r - l, b - t) / 2))
  } else {
    const from: Record<string, [number, number, number, number]> = {
      top: [cx, t, cx, b],
      bottom: [cx, b, cx, t],
      left: [l, cy, r, cy],
      right: [r, cy, l, cy],
      'left-top': [l, t, r, b],
      'right-top': [r, t, l, b],
      'left-bottom': [l, b, r, t],
      'right-bottom': [r, b, l, t]
    }
    const [x0, y0, x1, y1] = from[paint.start] ?? from.top
    g = ctx.createLinearGradient(x0, y0, x1, y1)
  }
  paint.colors.forEach((c, i) => g.addColorStop(paint.colors.length === 1 ? 0 : i / (paint.colors.length - 1), c))
  return g
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, fromX: number, fromY: number, size: number): void {
  const a = Math.atan2(y - fromY, x - fromX)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - size * Math.cos(a - 0.45), y - size * Math.sin(a - 0.45))
  ctx.lineTo(x - size * Math.cos(a + 0.45), y - size * Math.sin(a + 0.45))
  ctx.closePath()
  ctx.fill()
}

function drawShape(ctx: CanvasRenderingContext2D, s: SceneShape): void {
  const box = boundsOf(ctx, s)
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, s.opacity / 100))
  if (s.rotateAngle) {
    const cx = (box.l + box.r) / 2
    const cy = (box.t + box.b) / 2
    ctx.translate(cx, cy)
    ctx.rotate((s.rotateAngle * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }
  const fill = paintStyle(ctx, s.fill, box)
  const border = paintStyle(ctx, s.border, box)
  ctx.lineJoin = 'round'

  if (s.t === 'line') {
    if (fill) {
      ctx.strokeStyle = fill
      ctx.fillStyle = fill
      ctx.lineWidth = s.lineWidth
      if (s.dashes) ctx.setLineDash([s.lineWidth * 3, s.lineWidth * 2])
      ctx.beginPath()
      ctx.moveTo(s.x1, s.y1)
      ctx.lineTo(s.x2, s.y2)
      ctx.stroke()
      ctx.setLineDash([])
      const size = s.lineWidth * 2.5 + 6
      if (s.arrowEnd) arrow(ctx, s.x2, s.y2, s.x1, s.y1, size)
      if (s.arrowStart) arrow(ctx, s.x1, s.y1, s.x2, s.y2, size)
    }
    ctx.restore()
    return
  }

  if (s.t === 'label') {
    ctx.font = fontOf(s)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillText(s.value, s.centerX, s.centerY)
    }
    if (border && s.borderWidth > 0) {
      ctx.strokeStyle = border
      ctx.lineWidth = s.borderWidth
      ctx.strokeText(s.value, s.centerX, s.centerY)
    }
    ctx.restore()
    return
  }

  ctx.beginPath()
  if (s.t === 'rect') ctx.rect(s.left, s.top, s.width, s.height)
  else if (s.t === 'oval') ctx.ellipse(s.centerX, s.centerY, s.width / 2, s.height / 2, 0, 0, Math.PI * 2)
  else if (s.t === 'arc') {
    const start = ((s.startAngle - 90) * Math.PI) / 180
    const end = ((s.startAngle + s.sweepAngle - 90) * Math.PI) / 180
    ctx.moveTo(s.centerX, s.centerY)
    ctx.ellipse(s.centerX, s.centerY, s.width / 2, s.height / 2, 0, start, end, s.sweepAngle < 0)
    ctx.closePath()
  } else if (s.t === 'polygon') {
    for (let i = 0; i < s.points.length; i += 2) {
      if (i === 0) ctx.moveTo(s.points[i], s.points[i + 1])
      else ctx.lineTo(s.points[i], s.points[i + 1])
    }
    ctx.closePath()
  }
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (border && s.borderWidth > 0) {
    ctx.strokeStyle = border
    ctx.lineWidth = s.borderWidth
    if (s.dashes) ctx.setLineDash([Math.max(4, s.borderWidth * 2), Math.max(4, s.borderWidth * 2)])
    ctx.stroke()
  }
  ctx.restore()
}

/** Draws a scene in 400x400 canvas units onto a context of any pixel size. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene | null, pixels: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, pixels, pixels)
  ctx.scale(pixels / CANVAS, pixels / CANVAS)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CANVAS, CANVAS)
  if (!scene) return
  const bg = paintStyle(ctx, scene.background, { l: 0, t: 0, r: CANVAS, b: CANVAS })
  if (bg) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, CANVAS, CANVAS)
  }
  for (const s of scene.shapes) {
    try {
      drawShape(ctx, s)
    } catch {
      /* a malformed shape shouldn't take the whole drawing down */
    }
  }
}

function render(scene: Scene | null, px: number): ImageData {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  drawScene(ctx, scene, px)
  return ctx.getImageData(0, 0, px, px)
}

/** Fraction of pixels that differ visibly between two drawings (0 = identical). */
export function sceneDifference(a: Scene | null, b: Scene | null): { ratio: number; diff: ImageData } {
  const px = 200
  const ia = render(a, px)
  const ib = render(b, px)
  const diff = new ImageData(px, px)
  let bad = 0
  for (let i = 0; i < ia.data.length; i += 4) {
    const d = Math.abs(ia.data[i] - ib.data[i]) + Math.abs(ia.data[i + 1] - ib.data[i + 1]) + Math.abs(ia.data[i + 2] - ib.data[i + 2])
    if (d > 90) {
      bad++
      diff.data[i] = 240
      diff.data[i + 1] = 60
      diff.data[i + 2] = 60
      diff.data[i + 3] = 220
    }
  }
  return { ratio: bad / (px * px), diff }
}

export const MATCH_THRESHOLD = 0.004
