// Prism learning runtime for JavaScript (graphics + console) and Lua (console).
// Runs under Electron's Node: ELECTRON_RUN_AS_NODE=1 electron js_runner.js <mode> <file>
// Speaks the same JSON-lines protocol as prism_graphics.py.
'use strict'
const fs = require('fs')
const vm = require('vm')

const [, , mode, file] = process.argv
const raw = fs.readFileSync(file, 'utf8')
// TypeScript: erase the type annotations (line numbers stay the same) and run as JavaScript.
const source = process.env.PRISM_TS ? require('node:module').stripTypeScriptTypes(raw, { mode: 'strip' }) : raw
const FILENAME = process.env.PRISM_TS ? 'main.ts' : 'main.js'
const emit = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')

// Synchronous line reader for input()/prompt()/io.read in console programs.
let stdinBuf = ''
function readLineSync() {
  const chunk = Buffer.alloc(1024)
  while (!stdinBuf.includes('\n')) {
    let n = 0
    try {
      n = fs.readSync(0, chunk, 0, chunk.length, null)
    } catch (e) {
      if (e.code === 'EAGAIN') continue
      if (e.code === 'EOF') n = 0
      else throw e
    }
    if (n === 0) break
    stdinBuf += chunk.toString('utf8', 0, n)
  }
  const i = stdinBuf.indexOf('\n')
  if (i < 0) {
    const rest = stdinBuf
    stdinBuf = ''
    return rest.length ? rest : null
  }
  const line = stdinBuf.slice(0, i).replace(/\r$/, '')
  stdinBuf = stdinBuf.slice(i + 1)
  return line
}

function format(v) {
  if (typeof v === 'string') return v
  try {
    return require('util').inspect(v, { depth: 3, breakLength: 80 })
  } catch {
    return String(v)
  }
}

function lineOf(err) {
  const m = String(err && err.stack).match(/main\.[jt]s:(\d+)/)
  return m ? Number(m[1]) : undefined
}

function friendly(err, names) {
  let msg = `${err && err.name ? err.name : 'Error'}: ${err && err.message !== undefined ? err.message : String(err)}`
  if (err && err.name === 'ReferenceError') {
    const missing = (err.message.match(/^(\S+) is not defined/) || [])[1]
    const match = missing && names.find((n) => n.toLowerCase() === missing.toLowerCase() && n !== missing)
    if (match) msg += `\nCase matters — did you mean ${match}?`
  }
  return msg
}

// ------------------------------------------------------------------ graphics library

const NAMED = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey
darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite
gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue
lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid
mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff
peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver
skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow
yellowgreen transparent`.split(/\s+/))
const STARTS = ['center', 'top', 'bottom', 'left', 'right', 'left-top', 'right-top', 'left-bottom', 'right-bottom']
const ALIGNS = {
  'left-top': [0, 0], top: [0.5, 0], 'right-top': [1, 0], left: [0, 0.5], center: [0.5, 0.5],
  right: [1, 0.5], 'left-bottom': [0, 1], bottom: [0.5, 1], 'right-bottom': [1, 1]
}

function makeGraphics() {
  const shapes = []
  const app = { background: 'white', stepsPerSecond: 30, paused: false, stopped: false, width: 400, height: 400 }
  app.stop = () => (app.stopped = true)

  const num = (v, name) => {
    if (typeof v !== 'number' || Number.isNaN(v)) throw new TypeError(`${name} must be a number, but it was ${JSON.stringify(v)}`)
    return v
  }
  const paint = (v, name, allowGradient = true) => {
    if (v === null || v === undefined) return null
    if (typeof v === 'object' && v.type === 'gradient') {
      if (!allowGradient) throw new TypeError('a gradient cannot contain another gradient')
      return v
    }
    if (typeof v === 'string') {
      if (NAMED.has(v.toLowerCase())) return v.toLowerCase()
      if (/^rgb\(\d+, ?\d+, ?\d+\)$/.test(v)) return v
      throw new Error(`'${v}' is not a color. Use a color name like 'red', rgb(r, g, b) or gradient(...)`)
    }
    throw new TypeError(`${name} must be a color (a name like 'red')`)
  }
  const rgb = (r, g, b) => {
    for (const [n, v] of [['red', r], ['green', g], ['blue', b]]) if (typeof v !== 'number' || v < 0 || v > 255) throw new Error(`rgb() values must be numbers from 0 to 255, but ${n} was ${v}`)
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }
  const gradient = (...args) => {
    let start = 'center'
    if (args.length && typeof args[args.length - 1] === 'object' && args[args.length - 1] && !Array.isArray(args[args.length - 1])) {
      start = args.pop().start ?? 'center'
    }
    if (args.length < 2) throw new Error('gradient() needs at least two colors')
    if (!STARTS.includes(start)) throw new Error(`gradient start must be one of ${STARTS.join(', ')}`)
    return { type: 'gradient', colors: args.map((c) => paint(c, 'gradient color', false)), start }
  }

  const rotate = (x, y, cx, cy, deg) => {
    if (!deg) return [x, y]
    const a = (deg * Math.PI) / 180
    const dx = x - cx
    const dy = y - cy
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]
  }
  const inPoly = (x, y, pts) => {
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]
      const [xj, yj] = pts[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside
    }
    return inside
  }
  const cross = (a, b, c, d) => {
    const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0
  }

  class Shape {
    constructor(opts = {}) {
      const known = new Set(['fill', 'border', 'borderWidth', 'opacity', 'rotateAngle', 'dashes', 'visible', 'align', 'lineWidth', 'arrowStart', 'arrowEnd', 'size', 'font', 'bold', 'italic', 'roundness'])
      for (const k of Object.keys(opts)) if (!known.has(k)) throw new TypeError(`${this.constructor.name}() has no property named '${k}'`)
      this.fill = opts.fill === undefined ? 'black' : opts.fill
      this.border = opts.border ?? null
      this.borderWidth = opts.borderWidth ?? 2
      this.opacity = opts.opacity ?? 100
      this.rotateAngle = opts.rotateAngle ?? 0
      this.dashes = opts.dashes ?? false
      this.visible = opts.visible ?? true
      this._group = null
      shapes.push(this)
    }
    set fill(v) { this._fill = v; paint(v, 'fill') }
    get fill() { return this._fill }
    set border(v) { this._border = v; paint(v, 'border') }
    get border() { return this._border }
    set opacity(v) {
      num(v, 'opacity')
      if (v < 0 || v > 100) throw new Error(`opacity must be between 0 and 100, but it was ${v}`)
      this._opacity = v
    }
    get opacity() { return this._opacity }
    set rotateAngle(v) { this._rot = num(v, 'rotateAngle') }
    get rotateAngle() { return this._rot }
    style() {
      return { fill: paint(this.fill, 'fill'), border: paint(this.border, 'border'), borderWidth: this.borderWidth, opacity: this.opacity, rotateAngle: this.rotateAngle, dashes: !!this.dashes }
    }
    outline() {
      const [l, t, r, b] = this.bounds()
      return [[l, t], [r, t], [r, b], [l, b]]
    }
    rotatedOutline() { return this.outline().map(([x, y]) => rotate(x, y, this.centerX, this.centerY, this.rotateAngle)) }
    get left() { return this.bounds()[0] }
    set left(v) { this.move(num(v, 'left') - this.left, 0) }
    get top() { return this.bounds()[1] }
    set top(v) { this.move(0, num(v, 'top') - this.top) }
    get right() { return this.bounds()[2] }
    set right(v) { this.move(num(v, 'right') - this.right, 0) }
    get bottom() { return this.bounds()[3] }
    set bottom(v) { this.move(0, num(v, 'bottom') - this.bottom) }
    get centerX() { const b = this.bounds(); return (b[0] + b[2]) / 2 }
    set centerX(v) { this.move(num(v, 'centerX') - this.centerX, 0) }
    get centerY() { const b = this.bounds(); return (b[1] + b[3]) / 2 }
    set centerY(v) { this.move(0, num(v, 'centerY') - this.centerY) }
    get width() { const b = this.bounds(); return b[2] - b[0] }
    get height() { const b = this.bounds(); return b[3] - b[1] }
    contains(x, y) {
      const [px, py] = rotate(num(x, 'x'), num(y, 'y'), this.centerX, this.centerY, -this.rotateAngle)
      return inPoly(px, py, this.outline())
    }
    hits(x, y) { return this.contains(x, y) }
    hitsShape(other) {
      const a = this.rotatedOutline()
      const b = other.rotatedOutline()
      if (a.some(([x, y]) => inPoly(x, y, b)) || b.some(([x, y]) => inPoly(x, y, a))) return true
      for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) if (cross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
      return false
    }
    containsShape(other) {
      const a = this.rotatedOutline()
      return other.rotatedOutline().every(([x, y]) => inPoly(x, y, a))
    }
    list() { return this._group ? this._group.children : shapes }
    toFront() { const l = this.list(); l.splice(l.indexOf(this), 1); l.push(this) }
    toBack() { const l = this.list(); l.splice(l.indexOf(this), 1); l.unshift(this) }
    remove() { const l = this.list(); const i = l.indexOf(this); if (i >= 0) l.splice(i, 1) }
  }

  class RectShape extends Shape {
    constructor(left, top, width, height, opts = {}) {
      num(left, 'left'); num(top, 'top'); num(width, 'width'); num(height, 'height')
      if (width <= 0 || height <= 0) throw new Error('Rect width and height must be greater than 0')
      const [ax, ay] = ALIGNS[opts.align ?? 'left-top'] ?? (() => { throw new Error(`align must be one of ${Object.keys(ALIGNS).join(', ')}`) })()
      super(opts)
      this.x = left - width * ax
      this.y = top - height * ay
      this.w = width
      this.h = height
    }
    bounds() { return [this.x, this.y, this.x + this.w, this.y + this.h] }
    move(dx, dy) { this.x += dx; this.y += dy }
    get width() { return this.w }
    set width(v) { this.w = num(v, 'width') }
    get height() { return this.h }
    set height(v) { this.h = num(v, 'height') }
    json() { return { t: 'rect', left: this.x, top: this.y, width: this.w, height: this.h, ...this.style() } }
  }

  class OvalShape extends Shape {
    constructor(cx, cy, w, h, opts = {}) {
      num(cx, 'centerX'); num(cy, 'centerY'); num(w, 'width'); num(h, 'height')
      if (w <= 0 || h <= 0) throw new Error('size must be greater than 0')
      super(opts)
      this.cx = cx
      this.cy = cy
      this.w = w
      this.h = h
    }
    bounds() { return [this.cx - this.w / 2, this.cy - this.h / 2, this.cx + this.w / 2, this.cy + this.h / 2] }
    move(dx, dy) { this.cx += dx; this.cy += dy }
    outline() {
      const pts = []
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI) / 24
        pts.push([this.cx + (this.w / 2) * Math.cos(a), this.cy + (this.h / 2) * Math.sin(a)])
      }
      return pts
    }
    get width() { return this.w }
    set width(v) { this.w = num(v, 'width') }
    get height() { return this.h }
    set height(v) { this.h = num(v, 'height') }
    json() { return { t: 'oval', centerX: this.cx, centerY: this.cy, width: this.w, height: this.h, ...this.style() } }
  }

  class CircleShape extends OvalShape {
    constructor(cx, cy, r, opts = {}) {
      num(r, 'radius')
      if (r <= 0) throw new Error('Circle radius must be greater than 0')
      super(cx, cy, r * 2, r * 2, opts)
    }
    get radius() { return this.w / 2 }
    set radius(v) { this.w = this.h = num(v, 'radius') * 2 }
  }

  class ArcShape extends OvalShape {
    constructor(cx, cy, w, h, startAngle, sweepAngle, opts = {}) {
      super(cx, cy, w, h, opts)
      this.startAngle = num(startAngle, 'startAngle')
      this.sweepAngle = num(sweepAngle, 'sweepAngle')
    }
    json() { return { ...super.json(), t: 'arc', startAngle: this.startAngle, sweepAngle: this.sweepAngle } }
  }

  class PolygonShape extends Shape {
    constructor(...args) {
      const opts = args.length && typeof args[args.length - 1] === 'object' ? args.pop() : {}
      if (args.length < 6 || args.length % 2) throw new TypeError('Polygon needs at least 3 points as x1, y1, x2, y2, x3, y3, …')
      args.forEach((v, i) => num(v, `point value #${i + 1}`))
      super(opts)
      this.pointList = []
      for (let i = 0; i < args.length; i += 2) this.pointList.push([args[i], args[i + 1]])
    }
    points() { return this.pointList }
    bounds() {
      const p = this.points()
      const xs = p.map((q) => q[0])
      const ys = p.map((q) => q[1])
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    }
    move(dx, dy) { this.pointList = this.points().map(([x, y]) => [x + dx, y + dy]) }
    outline() { return this.points() }
    addPoint(x, y) { this.pointList.push([num(x, 'x'), num(y, 'y')]) }
    json() { return { t: 'polygon', points: this.points().flat(), ...this.style() } }
  }

  class RegularPolygonShape extends Shape {
    constructor(cx, cy, r, n, opts = {}) {
      num(cx, 'centerX'); num(cy, 'centerY'); num(r, 'radius')
      if (!Number.isInteger(n) || n < 3) throw new Error('points must be a whole number of at least 3')
      super(opts)
      this.cx = cx
      this.cy = cy
      this.radius = r
      this.n = n
    }
    get points() { return this.n }
    set points(v) { this.n = v }
    pts() {
      const out = []
      for (let i = 0; i < this.n; i++) out.push([this.cx + this.radius * Math.sin((2 * Math.PI * i) / this.n), this.cy - this.radius * Math.cos((2 * Math.PI * i) / this.n)])
      return out
    }
    bounds() {
      const p = this.pts()
      const xs = p.map((q) => q[0])
      const ys = p.map((q) => q[1])
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    }
    move(dx, dy) { this.cx += dx; this.cy += dy }
    outline() { return this.pts() }
    json() { return { t: 'polygon', points: this.pts().flat(), ...this.style() } }
  }

  class StarShape extends RegularPolygonShape {
    constructor(cx, cy, r, n, opts = {}) {
      super(cx, cy, r, n, opts)
      const ratio = n >= 3 ? Math.cos((2 * Math.PI) / n) / Math.cos(Math.PI / n) : 0.4
      this.roundness = opts.roundness ?? Math.max(20, Math.min(80, Math.round(ratio * 100)))
    }
    pts() {
      const out = []
      const inner = (this.radius * (this.roundness ?? 40)) / 100
      for (let i = 0; i < this.n * 2; i++) {
        const r = i % 2 === 0 ? this.radius : inner
        const a = (Math.PI * i) / this.n
        out.push([this.cx + r * Math.sin(a), this.cy - r * Math.cos(a)])
      }
      return out
    }
  }

  class LineShape extends Shape {
    constructor(x1, y1, x2, y2, opts = {}) {
      ;[x1, y1, x2, y2].forEach((v, i) => num(v, ['x1', 'y1', 'x2', 'y2'][i]))
      super(opts)
      Object.assign(this, { x1, y1, x2, y2 })
      this.lineWidth = opts.lineWidth ?? 2
      this.arrowStart = opts.arrowStart ?? false
      this.arrowEnd = opts.arrowEnd ?? false
    }
    bounds() { return [Math.min(this.x1, this.x2), Math.min(this.y1, this.y2), Math.max(this.x1, this.x2), Math.max(this.y1, this.y2)] }
    move(dx, dy) { this.x1 += dx; this.x2 += dx; this.y1 += dy; this.y2 += dy }
    outline() {
      const dx = this.x2 - this.x1
      const dy = this.y2 - this.y1
      const len = Math.hypot(dx, dy) || 1
      const nx = (-dy / len) * (this.lineWidth / 2)
      const ny = (dx / len) * (this.lineWidth / 2)
      return [[this.x1 + nx, this.y1 + ny], [this.x2 + nx, this.y2 + ny], [this.x2 - nx, this.y2 - ny], [this.x1 - nx, this.y1 - ny]]
    }
    json() { return { t: 'line', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2, lineWidth: this.lineWidth, arrowStart: !!this.arrowStart, arrowEnd: !!this.arrowEnd, ...this.style() } }
  }

  class LabelShape extends Shape {
    constructor(value, cx, cy, opts = {}) {
      num(cx, 'centerX'); num(cy, 'centerY')
      super({ borderWidth: 1, ...opts })
      this.value = value
      this.size = opts.size ?? 12
      this.font = opts.font ?? 'arial'
      this.bold = opts.bold ?? false
      this.italic = opts.italic ?? false
      const [ax, ay] = ALIGNS[opts.align ?? 'center']
      const [w, h] = this.textSize()
      this.cx = cx + w * (0.5 - ax)
      this.cy = cy + h * (0.5 - ay)
    }
    textSize() { return [String(this.value).length * this.size * (this.bold ? 0.6 : 0.55), this.size] }
    bounds() { const [w, h] = this.textSize(); return [this.cx - w / 2, this.cy - h / 2, this.cx + w / 2, this.cy + h / 2] }
    move(dx, dy) { this.cx += dx; this.cy += dy }
    json() { return { t: 'label', value: String(this.value), centerX: this.cx, centerY: this.cy, size: this.size, font: String(this.font), bold: !!this.bold, italic: !!this.italic, ...this.style() } }
  }

  class GroupShape {
    constructor(...items) {
      this.children = []
      this.visible = true
      this.rotateAngle = 0
      this._group = null
      shapes.push(this)
      items.forEach((s) => this.add(s))
    }
    add(s) {
      const l = s._group ? s._group.children : shapes
      const i = l.indexOf(s)
      if (i >= 0) l.splice(i, 1)
      s._group = this
      this.children.push(s)
    }
    clear() { this.children.length = 0 }
    bounds() {
      if (!this.children.length) return [0, 0, 0, 0]
      const bs = this.children.map((c) => c.bounds())
      return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))]
    }
    move(dx, dy) { this.children.forEach((c) => c.move(dx, dy)) }
    contains(x, y) { return this.children.some((c) => c.visible && c.contains(x, y)) }
    hitsShape(o) { return this.children.some((c) => c.hitsShape(o)) }
    rotatedOutline() { return Shape.prototype.outline.call(this) }
    jsonList() { return this.children.filter((c) => c.visible).flatMap((c) => (c instanceof GroupShape ? c.jsonList() : [c.json()])) }
  }
  for (const k of ['left', 'top', 'right', 'bottom', 'centerX', 'centerY', 'width', 'height', 'toFront', 'toBack', 'remove', 'list', 'hits']) {
    const d = Object.getOwnPropertyDescriptor(Shape.prototype, k)
    Object.defineProperty(GroupShape.prototype, k, d)
  }
  for (const k of ['fill', 'border', 'opacity']) {
    Object.defineProperty(GroupShape.prototype, k, { set(v) { this.children.forEach((c) => (c[k] = v)) }, get() { return this.children[0]?.[k] } })
  }

  // CMU style: shapes are created by calling the function, `new` is optional.
  const factory = (Cls) => {
    const f = function (...args) { return new Cls(...args) }
    Object.defineProperty(f, 'name', { value: Cls.name.replace('Shape', '') })
    return f
  }

  const scene = () => ({
    background: paint(app.background, 'app.background'),
    shapes: shapes.filter((s) => s.visible).flatMap((s) => (s instanceof GroupShape ? s.jsonList() : [s.json()]))
  })

  const api = {
    Rect: factory(RectShape), Oval: factory(OvalShape), Circle: factory(CircleShape), Arc: factory(ArcShape),
    Polygon: factory(PolygonShape), RegularPolygon: factory(RegularPolygonShape), Star: factory(StarShape),
    Line: factory(LineShape), Label: factory(LabelShape), Group: factory(GroupShape),
    rgb, gradient, app,
    distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    angleTo: (x1, y1, x2, y2) => ((Math.atan2(x2 - x1, y1 - y2) * 180) / Math.PI + 360) % 360,
    getPointInDir: (x, y, angle, dist) => [x + dist * Math.sin((angle * Math.PI) / 180), y - dist * Math.cos((angle * Math.PI) / 180)],
    randrange: (a, b) => (b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a))),
    choice: (arr) => arr[Math.floor(Math.random() * arr.length)]
  }
  return { api, scene, app }
}

// ------------------------------------------------------------------ modes

function runJs(graphics) {
  let printBuf = ''
  const flushPrint = () => {
    if (printBuf) emit({ type: 'print', text: printBuf })
    printBuf = ''
  }
  const out = (...args) => {
    const text = args.map(format).join(' ') + '\n'
    if (graphics) {
      printBuf += text
      flushPrint()
    } else process.stdout.write(text)
  }
  const g = graphics ? makeGraphics() : null
  const context = {
    console: { log: out, info: out, warn: out, error: out, table: out },
    prompt: (q) => {
      if (graphics) throw new Error('prompt() is not available in graphics programs. Use onKeyPress or onMousePress instead.')
      if (q) process.stdout.write(String(q))
      return readLineSync()
    },
    Math, JSON, Date, Array, Object, String, Number, Boolean, Map, Set, parseInt, parseFloat, isNaN, Error, TypeError, RangeError, Symbol, Promise,
    setTimeout: undefined, setInterval: undefined,
    ...(g ? g.api : {})
  }
  vm.createContext(context)
  const names = Object.keys(context)
  try {
    new vm.Script(source, { filename: FILENAME }).runInContext(context, { timeout: 5000 })
  } catch (err) {
    if (!graphics) {
      process.stderr.write(`${friendly(err, names)}${lineOf(err) ? ` (line ${lineOf(err)})` : ''}\n`)
      process.exitCode = 1
      return
    }
    emit({ type: 'scene', scene: g.scene() })
    emit({ type: 'error', message: err && /Script execution timed out/.test(err.message) ? 'Your code took too long to run. Is there an infinite loop?' : friendly(err, names), line: lineOf(err) })
    return
  }
  if (!graphics) return

  emit({ type: 'scene', scene: g.scene() })
  const handlerNames = ['onMousePress', 'onMouseRelease', 'onMouseMove', 'onMouseDrag', 'onKeyPress', 'onKeyRelease', 'onKeyHold', 'onStep']
  const handlers = handlerNames.filter((h) => typeof context[h] === 'function')
  emit({ type: 'ready', handlers, stepsPerSecond: g.app.stepsPerSecond })
  if (!handlers.length) return
  let sps = g.app.stepsPerSecond
  const rl = require('readline').createInterface({ input: process.stdin })
  rl.on('line', (raw) => {
    if (!raw.trim()) return
    const ev = JSON.parse(raw)
    try {
      if (!g.app.stopped) {
        if (/^mouse/.test(ev.type)) context['on' + ev.type[0].toUpperCase() + ev.type.slice(1)]?.(ev.x, ev.y)
        else if (ev.type === 'keyPress' || ev.type === 'keyRelease') context['on' + ev.type[0].toUpperCase() + ev.type.slice(1)]?.(ev.key)
        else if (ev.type === 'keyHold') context.onKeyHold?.(ev.keys)
        else if (ev.type === 'step' && context.onStep) for (let i = 0; i < (ev.count ?? 1) && !g.app.paused && !g.app.stopped; i++) context.onStep()
      }
    } catch (err) {
      emit({ type: 'scene', scene: g.scene() })
      emit({ type: 'error', message: friendly(err, names), line: lineOf(err) })
      rl.close()
      return
    }
    emit({ type: 'scene', scene: g.scene() })
    if (g.app.stepsPerSecond !== sps) {
      sps = g.app.stepsPerSecond
      emit({ type: 'ready', handlers, stepsPerSecond: sps })
    }
  })
}

function runLua() {
  const fengari = require(process.env.PRISM_FENGARI || 'fengari')
  const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari
  const L = lauxlib.luaL_newstate()
  lualib.luaL_openlibs(L)
  lua.lua_register(L, to_luastring('__readline'), (state) => {
    const line = readLineSync()
    if (line === null) lua.lua_pushnil(state)
    else lua.lua_pushstring(state, to_luastring(line))
    return 1
  })
  const prelude = `
    function input(prompt) if prompt then io.write(prompt) end return __readline() end
    io.read = function(fmt)
      local line = __readline()
      if line and (fmt == 'n' or fmt == '*n') then return tonumber(line) end
      return line
    end`
  lauxlib.luaL_dostring(L, to_luastring(prelude))
  const status = lauxlib.luaL_loadbuffer(L, to_luastring(source), null, to_luastring('=main.lua'))
  const ok = status === lua.LUA_OK && lua.lua_pcall(L, 0, 0, 0) === lua.LUA_OK
  if (!ok) {
    const msg = to_jsstring(lua.lua_tostring(L, -1) || to_luastring('error'))
    const m = msg.match(/^main\.lua:(\d+): (.*)$/s)
    process.stderr.write(m ? `${m[2]} (line ${m[1]})\n` : msg + '\n')
    process.exitCode = 1
  }
}


// ------------------------------------------------------------------ SQL (node:sqlite)

const SAMPLE_DB = `
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, grade INTEGER, house TEXT, age INTEGER);
INSERT INTO students VALUES (1,'Ada',10,'Red',15),(2,'Ben',11,'Blue',16),(3,'Cleo',10,'Green',15),(4,'Dev',12,'Red',17),
  (5,'Eli',11,'Green',16),(6,'Fay',12,'Blue',17),(7,'Gus',10,'Blue',14),(8,'Hana',11,'Red',16);
CREATE TABLE scores (student_id INTEGER, subject TEXT, score INTEGER);
INSERT INTO scores VALUES (1,'Math',95),(1,'Art',88),(2,'Math',72),(2,'Art',91),(3,'Math',84),(3,'Art',79),(4,'Math',65),(4,'Art',70),
  (5,'Math',99),(5,'Art',85),(6,'Math',77),(6,'Art',94),(7,'Math',58),(7,'Art',66),(8,'Math',88),(8,'Art',73);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER);
INSERT INTO products VALUES (1,'Sword','Weapons',150,4),(2,'Shield','Armor',120,7),(3,'Potion','Items',25,40),(4,'Bow','Weapons',90,0),
  (5,'Helmet','Armor',60,12),(6,'Elixir','Items',75,5),(7,'Dagger','Weapons',45,9);
CREATE TABLE orders (id INTEGER PRIMARY KEY, product_id INTEGER, player TEXT, quantity INTEGER);
INSERT INTO orders VALUES (1,3,'Ada',5),(2,1,'Ben',1),(3,3,'Cleo',2),(4,5,'Ada',1),(5,2,'Dev',1),(6,6,'Ben',3),(7,7,'Ada',2);
`

/** Splits a script into statements, ignoring semicolons inside quotes and comments. Returns each with its start line. */
function splitSql(src) {
  const out = []
  let cur = ''
  let line = 1
  let startLine = 1
  let quote = null
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (!quote && c === '-' && src[i + 1] === '-') {
      while (i < src.length && src[i] !== '\n') i++
      if (src[i] === '\n') {
        line++
        cur += '\n'
      }
      continue
    }
    if (quote) {
      if (c === quote) quote = null
    } else if (c === "'" || c === '"') quote = c
    if (!quote && c === ';') {
      if (cur.trim()) out.push({ sql: cur.trim(), line: startLine })
      cur = ''
      startLine = line
      continue
    }
    if (!cur.trim() && c !== '\n' && c.trim()) startLine = line
    cur += c
    if (c === '\n') line++
  }
  if (cur.trim()) out.push({ sql: cur.trim(), line: startLine })
  return out
}

function formatValue(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 100) / 100)
  return String(v)
}

function printTable(rows) {
  if (!rows.length) {
    process.stdout.write('(no rows)\n')
    return
  }
  const cols = Object.keys(rows[0])
  const cells = rows.map((r) => cols.map((c) => formatValue(r[c])))
  const widths = cols.map((c, i) => Math.max(c.length, ...cells.map((row) => row[i].length)))
  const fmt = (vals) => vals.map((v, i) => v.padEnd(widths[i])).join(' | ').replace(/\s+$/, '')
  process.stdout.write(fmt(cols) + '\n')
  process.stdout.write(widths.map((w) => '-'.repeat(w)).join('-+-') + '\n')
  for (const row of cells) process.stdout.write(fmt(row) + '\n')
}

function runSql() {
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(':memory:')
  db.exec(SAMPLE_DB)
  let printed = 0
  for (const st of splitSql(source)) {
    try {
      const stmt = db.prepare(st.sql)
      if (/^\s*(select|with|pragma|values)\b/i.test(st.sql)) {
        if (printed++) process.stdout.write('\n')
        printTable(stmt.all())
      } else {
        stmt.run()
      }
    } catch (err) {
      const msg = String(err && err.message ? err.message : err).replace(/^.*?:\s*/, (m) => (/sqlite/i.test(m) ? '' : m))
      process.stderr.write(`${msg} (line ${st.line})\n`)
      process.exitCode = 1
      return
    }
  }
}

if (mode === 'lua') runLua()
else if (mode === 'sql') runSql()
else runJs(mode === 'graphics')
