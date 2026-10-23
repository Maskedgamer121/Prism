import type { RunKind } from '@shared/learn'
import { monaco } from '../lib/monaco'
import { COLOR_NAMES, DOCS } from './content'

/**
 * Suggestions for Learn editors (the sandbox, examples and exercises): press Tab or
 * Enter to insert, then Tab to jump between the placeholders. Only applies to
 * in-memory Learn models, never to project files.
 */

const kinds = new Map<string, RunKind>()

/** Tells the provider whether a Learn editor holds a graphics or console program. */
export function setLearnModelKind(model: monaco.editor.ITextModel, kind: RunKind): () => void {
  const key = model.uri.toString()
  kinds.set(key, kind)
  return () => kinds.delete(key)
}

type Item = { label: string; insert: string; kind: monaco.languages.CompletionItemKind; detail?: string; doc?: string; sort?: string }

const K = monaco.languages.CompletionItemKind
const docText = new Map<string, string>()
for (const list of Object.values(DOCS)) for (const d of list) if (!docText.has(d.name)) docText.set(d.name, `**${d.signature.split('\n')[0]}**\n\n${d.summary.replace(/[«»]/g, '`')}`)

const snip = (params: string[]) => params.map((p, i) => `\${${i + 1}:${p}}`).join(', ')

// ---------- graphics ----------

const SHAPES: [string, string[]][] = [
  ['Rect', ['left', 'top', 'width', 'height']],
  ['Oval', ['centerX', 'centerY', 'width', 'height']],
  ['Circle', ['centerX', 'centerY', 'radius']],
  ['Line', ['x1', 'y1', 'x2', 'y2']],
  ['Polygon', ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']],
  ['RegularPolygon', ['centerX', 'centerY', 'radius', 'points']],
  ['Star', ['centerX', 'centerY', 'radius', 'points']],
  ['Arc', ['centerX', 'centerY', 'width', 'height', 'startAngle', 'sweepAngle']],
  ['Group', ['shape1', 'shape2']]
]
const HELPERS: [string, string[]][] = [
  ['rgb', ['red', 'green', 'blue']],
  ['distance', ['x1', 'y1', 'x2', 'y2']],
  ['angleTo', ['x1', 'y1', 'x2', 'y2']],
  ['getPointInDir', ['x', 'y', 'angle', 'distance']]
]
const STYLE: [string, string][] = [
  ['fill', "'${1:red}'"],
  ['border', "'${1:black}'"],
  ['borderWidth', '${1:2}'],
  ['opacity', '${1:100}'],
  ['rotateAngle', '${1:45}'],
  ['dashes', 'True'],
  ['visible', 'False'],
  ['lineWidth', '${1:4}'],
  ['arrowEnd', 'True'],
  ['size', '${1:20}'],
  ['bold', 'True'],
  ['italic', 'True'],
  ['font', "'${1:monospace}'"],
  ['align', "'${1:center}'"],
  ['roundness', '${1:50}']
]
const SHAPE_PROPS = ['centerX', 'centerY', 'left', 'right', 'top', 'bottom', 'width', 'height', 'fill', 'border', 'borderWidth', 'opacity', 'rotateAngle', 'visible', 'radius', 'value', 'points']
const SHAPE_METHODS: [string, string][] = [
  ['contains', 'contains(${1:x}, ${2:y})'],
  ['hitsShape', 'hitsShape(${1:otherShape})'],
  ['toFront', 'toFront()'],
  ['toBack', 'toBack()'],
  ['addPoint', 'addPoint(${1:x}, ${2:y})']
]
const APP_PROPS: [string, string][] = [
  ['background', 'background'],
  ['stepsPerSecond', 'stepsPerSecond'],
  ['paused', 'paused'],
  ['width', 'width'],
  ['height', 'height'],
  ['stop', 'stop()']
]
const EVENTS: [string, string][] = [
  ['onMousePress', 'mouseX, mouseY'],
  ['onMouseRelease', 'mouseX, mouseY'],
  ['onMouseMove', 'mouseX, mouseY'],
  ['onMouseDrag', 'mouseX, mouseY'],
  ['onKeyPress', 'key'],
  ['onKeyRelease', 'key'],
  ['onKeyHold', 'keys'],
  ['onStep', '']
]

function graphicsItems(py: boolean): Item[] {
  const items: Item[] = []
  for (const [name, params] of SHAPES) items.push({ label: name, insert: `${name}(${snip(params)})$0`, kind: K.Class, detail: 'shape', doc: docText.get(name) })
  items.push({ label: 'Label', insert: "Label('${1:text}', ${2:centerX}, ${3:centerY})$0", kind: K.Class, detail: 'shape', doc: docText.get('Label') })
  items.push({ label: 'gradient', insert: py ? "gradient('${1:red}', '${2:blue}', start='${3:top}')" : "gradient('${1:red}', '${2:blue}', {start: '${3:top}'})", kind: K.Function, doc: docText.get('gradient') })
  for (const [name, params] of HELPERS) items.push({ label: name, insert: `${name}(${snip(params)})`, kind: K.Function, doc: docText.get(name) })
  items.push({ label: 'app', insert: 'app', kind: K.Variable, detail: 'the canvas', doc: docText.get('app') })
  for (const [name, args] of EVENTS)
    items.push({
      label: name,
      insert: py ? `def ${name}(${args}):\n\t\${0:pass}` : `function ${name}(${args}) {\n\t$0\n}`,
      kind: K.Event,
      detail: 'event handler',
      doc: docText.get(name) ?? docText.get('onMousePress')
    })
  return items
}

// ---------- console languages ----------

const PY_FUNCS: [string, string][] = [
  ['print', 'print(${1})'],
  ['input', "input(${1})"],
  ['int', 'int(${1})'],
  ['float', 'float(${1})'],
  ['str', 'str(${1})'],
  ['len', 'len(${1})'],
  ['range', 'range(${1:10})'],
  ['list', 'list(${1})'],
  ['dict', 'dict(${1})'],
  ['set', 'set(${1})'],
  ['sorted', 'sorted(${1})'],
  ['sum', 'sum(${1})'],
  ['min', 'min(${1})'],
  ['max', 'max(${1})'],
  ['abs', 'abs(${1})'],
  ['round', 'round(${1})'],
  ['enumerate', 'enumerate(${1})'],
  ['zip', 'zip(${1}, ${2})'],
  ['isinstance', 'isinstance(${1:value}, ${2:int})']
]
const PY_SNIPPETS: [string, string, string][] = [
  ['for', 'for ${1:i} in range(${2:10}):\n\t${0:pass}', 'for loop'],
  ['forin', 'for ${1:item} in ${2:items}:\n\t${0:pass}', 'loop over items'],
  ['while', 'while ${1:condition}:\n\t${0:pass}', 'while loop'],
  ['if', 'if ${1:condition}:\n\t${0:pass}', 'if statement'],
  ['ifelse', 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${0:pass}', 'if / else'],
  ['def', 'def ${1:name}(${2}):\n\t${0:pass}', 'function'],
  ['class', 'class ${1:Name}:\n\tdef __init__(self${2}):\n\t\t${0:pass}', 'class'],
  ['try', 'try:\n\t${1:pass}\nexcept ${2:ValueError}:\n\t${0:pass}', 'try / except'],
  ['fstring', "f'${1:text} {${2:value}}'", 'f-string']
]
const PY_KEYWORDS = 'and as break continue elif else False import from in is lambda None not or pass return True with'.split(' ')

const LUA_FUNCS: [string, string][] = [
  ['print', 'print(${1})'],
  ['input', "input(${1:'question? '})"],
  ['io.read', 'io.read()'],
  ['tostring', 'tostring(${1})'],
  ['tonumber', 'tonumber(${1})'],
  ['ipairs', 'ipairs(${1:t})'],
  ['pairs', 'pairs(${1:t})'],
  ['setmetatable', 'setmetatable(${1:{}}, ${2:Class})'],
  ['type', 'type(${1})']
]
const LUA_MEMBERS: Record<string, string[]> = {
  string: ['format', 'upper', 'lower', 'sub', 'len', 'rep', 'reverse', 'find', 'match', 'gmatch', 'gsub', 'byte', 'char'],
  table: ['insert', 'remove', 'concat', 'sort', 'unpack'],
  math: ['floor', 'ceil', 'max', 'min', 'abs', 'sqrt', 'random', 'huge', 'pi'],
  io: ['read', 'write']
}
const LUA_SNIPPETS: [string, string, string][] = [
  ['local', 'local ${1:name} = ${0}', 'local variable'],
  ['function', 'local function ${1:name}(${2})\n\t$0\nend', 'function'],
  ['for', 'for ${1:i} = ${2:1}, ${3:10} do\n\t$0\nend', 'numeric for'],
  ['ipairs', 'for ${1:i}, ${2:v} in ipairs(${3:t}) do\n\t$0\nend', 'loop over a list'],
  ['pairs', 'for ${1:k}, ${2:v} in pairs(${3:t}) do\n\t$0\nend', 'loop over a table'],
  ['if', 'if ${1:condition} then\n\t$0\nend', 'if statement'],
  ['ifelse', 'if ${1:condition} then\n\t${2}\nelse\n\t$0\nend', 'if / else'],
  ['while', 'while ${1:condition} do\n\t$0\nend', 'while loop'],
  ['class', 'local ${1:Name} = {}\n${1:Name}.__index = ${1:Name}\n\nfunction ${1:Name}.new(${2})\n\tlocal self = setmetatable({}, ${1:Name})\n\t$0\n\treturn self\nend', 'class (Roblox module pattern)']
]
const LUA_KEYWORDS = 'and break do else elseif end false nil not or repeat return then true until'.split(' ')

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'JOIN', 'LEFT JOIN', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'DISTINCT', 'DESC', 'ASC', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'NULL', 'IS NULL', 'INTEGER', 'TEXT', 'REAL', 'PRIMARY KEY'
]
const SQL_FUNCS = ['COUNT(*)', 'SUM(${1})', 'AVG(${1})', 'MIN(${1})', 'MAX(${1})', 'ROUND(${1}, ${2:2})', 'UPPER(${1})', 'LOWER(${1})', 'LENGTH(${1})']
const SQL_SCHEMA: Record<string, string[]> = {
  students: ['id', 'name', 'grade', 'house', 'age'],
  scores: ['student_id', 'subject', 'score'],
  products: ['id', 'name', 'category', 'price', 'stock'],
  orders: ['id', 'product_id', 'player', 'quantity']
}

// ---------- provider ----------

function toSuggestions(items: Item[], range: monaco.IRange): monaco.languages.CompletionItem[] {
  return items.map((it) => ({
    label: it.label,
    kind: it.kind,
    insertText: it.insert,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: it.detail,
    documentation: it.doc ? { value: it.doc } : undefined,
    sortText: it.sort,
    range
  }))
}

function provide(language: string) {
  return (model: monaco.editor.ITextModel, position: monaco.Position): monaco.languages.CompletionList => {
    if (model.uri.scheme !== 'inmemory') return { suggestions: [] }
    const kind = kinds.get(model.uri.toString()) ?? 'console'
    const word = model.getWordUntilPosition(position)
    const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
    const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
    const textBefore = model.getValueInRange({ startLineNumber: Math.max(1, position.lineNumber - 6), startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column })
    const quotes = (before.match(/(?<!\\)['"]/g) ?? []).length
    const inString = quotes % 2 === 1
    const dot = before.match(/([A-Za-z_][\w]*)\.\w*$/)
    const depth = (textBefore.match(/\(/g) ?? []).length - (textBefore.match(/\)/g) ?? []).length
    const py = language === 'python'
    const graphics = kind === 'graphics' && (py || language === 'javascript' || language === 'typescript')

    if (inString) {
      if (!graphics) return { suggestions: [] }
      return { suggestions: toSuggestions(COLOR_NAMES.map((c) => ({ label: c, insert: c, kind: K.Color, detail: 'color' })), range) }
    }

    if (dot) {
      const obj = dot[1]
      if (graphics && obj === 'app') return { suggestions: toSuggestions(APP_PROPS.map(([l, i]) => ({ label: l, insert: i, kind: K.Property })), range) }
      if (language === 'lua' && LUA_MEMBERS[obj]) return { suggestions: toSuggestions(LUA_MEMBERS[obj].map((m) => ({ label: m, insert: /^(huge|pi)$/.test(m) ? m : `${m}(\${1})`, kind: K.Function })), range) }
      if (language === 'sql') {
        const cols = Object.values(SQL_SCHEMA).flat()
        return { suggestions: toSuggestions(Array.from(new Set(cols)).map((c) => ({ label: c, insert: c, kind: K.Field })), range) }
      }
      if (graphics && !/^(math|random|Math|console|JSON|Object)$/.test(obj))
        return {
          suggestions: toSuggestions(
            [...SHAPE_PROPS.map((p) => ({ label: p, insert: p, kind: K.Property })), ...SHAPE_METHODS.map(([l, i]) => ({ label: l, insert: i, kind: K.Method }))],
            range
          )
        }
      return { suggestions: [] }
    }

    const items: Item[] = []
    if (graphics) {
      items.push(...graphicsItems(py))
      // Inside a shape call, offer its options first: fill=, border=… (or fill: in JavaScript).
      if (depth > 0)
        for (const [name, value] of STYLE) {
          const v = py ? value : value.replace(/^True$/, 'true').replace(/^False$/, 'false')
          items.push({ label: py ? `${name}=` : `${name}:`, insert: py ? `${name}=${v}` : `${name}: ${v}`, kind: K.Property, detail: 'style option', sort: '0' + name, doc: docText.get('Style properties') })
        }
    }
    // Statement templates (for, def, if…) make no sense in the middle of a call.
    const statements = depth <= 0
    if (py) {
      for (const [l, i] of PY_FUNCS) items.push({ label: l, insert: i, kind: K.Function, doc: docText.get(l) })
      if (statements) for (const [l, i, d] of PY_SNIPPETS) items.push({ label: l, insert: i, kind: K.Snippet, detail: d })
      for (const k of PY_KEYWORDS) items.push({ label: k, insert: k, kind: K.Keyword })
    } else if (language === 'lua') {
      for (const [l, i] of LUA_FUNCS) items.push({ label: l, insert: i, kind: K.Function, doc: docText.get(l) })
      if (statements) for (const [l, i, d] of LUA_SNIPPETS) items.push({ label: l, insert: i, kind: K.Snippet, detail: d })
      for (const k of LUA_KEYWORDS) items.push({ label: k, insert: k, kind: K.Keyword })
    } else if (language === 'sql') {
      items.push({ label: 'select', insert: 'SELECT ${1:*} FROM ${2:students}${3: WHERE ${4:condition}};', kind: K.Snippet, detail: 'SELECT query' })
      for (const k of SQL_KEYWORDS) items.push({ label: k, insert: k, kind: K.Keyword, doc: docText.get(k) })
      for (const f of SQL_FUNCS) items.push({ label: f.replace(/\$\{\d+(:[^}]*)?\}/g, ''), insert: f, kind: K.Function, doc: docText.get('Aggregates') })
      for (const [table, cols] of Object.entries(SQL_SCHEMA)) {
        items.push({ label: table, insert: table, kind: K.Struct, detail: `table (${cols.join(', ')})` })
        for (const c of cols) items.push({ label: c, insert: c, kind: K.Field, detail: `${table}.${c}`, sort: '9' + c })
      }
    }
    // Inside a call, rank the style options above everything else.
    if (graphics && depth > 0) for (const it of items) it.sort ??= '5' + it.label
    return { suggestions: toSuggestions(items, range) }
  }
}

let registered = false
export function registerLearnCompletions(): void {
  if (registered) return
  registered = true
  for (const language of ['python', 'javascript', 'typescript', 'lua', 'sql']) {
    monaco.languages.registerCompletionItemProvider(language, { triggerCharacters: ['.', "'", '"', '(', ','], provideCompletionItems: provide(language) })
  }
}
