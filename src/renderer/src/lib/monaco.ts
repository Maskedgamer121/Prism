import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'json') return new JsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker()
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    return new EditorWorker()
  }
}

monaco.editor.defineTheme('prism-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C586C0' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'type', foreground: '4EC9B0' }
  ],
  colors: {
    'editor.background': '#181818',
    'editor.foreground': '#D4D4D4',
    'editorLineNumber.foreground': '#4E4E4E',
    'editorLineNumber.activeForeground': '#C6C6C6',
    'editor.lineHighlightBackground': '#1F1F1F',
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editorCursor.foreground': '#E8E8E8',
    'editorIndentGuide.background1': '#2A2A2A',
    'editorIndentGuide.activeBackground1': '#454545',
    'editorWhitespace.foreground': '#3B3B3B',
    'editorGutter.background': '#181818',
    'editorWidget.background': '#1F1F1F',
    'editorWidget.border': '#2E2E2E',
    'editorSuggestWidget.background': '#1F1F1F',
    'editorSuggestWidget.border': '#2E2E2E',
    'editorSuggestWidget.selectedBackground': '#2A2D2E',
    'editorHoverWidget.background': '#1F1F1F',
    'editorHoverWidget.border': '#2E2E2E',
    'minimap.background': '#181818',
    'scrollbarSlider.background': '#79797933',
    'scrollbarSlider.hoverBackground': '#64646459',
    'diffEditor.insertedTextBackground': '#2EA04326',
    'diffEditor.removedTextBackground': '#F8514926',
    'diffEditor.insertedLineBackground': '#2EA0431A',
    'diffEditor.removedLineBackground': '#F851491A',
    'editorGhostText.foreground': '#7A7A7A'
  }
})

// The TypeScript worker validates files in isolation; without the project's
// types it would flag every import, so keep only syntax diagnostics.
const tsDefaults = (monaco.languages as unknown as { typescript?: { typescriptDefaults: { setDiagnosticsOptions(o: object): void; setCompilerOptions(o: object): void }; javascriptDefaults: { setDiagnosticsOptions(o: object): void } } }).typescript
if (tsDefaults) {
  tsDefaults.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })
  tsDefaults.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })
  // No DOM library: lesson code like `const name = …` would clash with `window.name`.
  // Learn programs only get console and prompt, so declare just those.
  tsDefaults.typescriptDefaults.setCompilerOptions({ jsx: 4, target: 99, allowNonTsExtensions: true, allowJs: true, strict: true, lib: ['esnext'] })
  ;(tsDefaults.typescriptDefaults as unknown as { addExtraLib(src: string, path: string): void }).addExtraLib(
    'declare const console: { log(...a: unknown[]): void; info(...a: unknown[]): void; warn(...a: unknown[]): void; error(...a: unknown[]): void; table(...a: unknown[]): void }\ndeclare function prompt(question?: string): string | null\n',
    'ts:prism-learn.d.ts'
  )
}

const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', jsonc: 'json', md: 'markdown', mdx: 'markdown', py: 'python', pyw: 'python', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin',
  cs: 'csharp', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', h: 'cpp', c: 'c', lua: 'lua', luau: 'lua', html: 'html', htm: 'html',
  css: 'css', scss: 'scss', less: 'less', sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell', psm1: 'powershell',
  yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml', toml: 'ini', ini: 'ini', cfg: 'ini', env: 'ini', php: 'php', rb: 'ruby', swift: 'swift',
  dart: 'dart', vue: 'html', svelte: 'html', dockerfile: 'dockerfile', graphql: 'graphql', gql: 'graphql', r: 'r', bat: 'bat', cmd: 'bat',
  txt: 'plaintext', log: 'plaintext'
}

export function languageFor(path: string): string {
  const name = path.split(/[\\/]/).pop()?.toLowerCase() ?? ''
  if (name === 'dockerfile') return 'dockerfile'
  if (name === 'makefile') return 'makefile'
  const ext = name.includes('.') ? name.split('.').pop()! : ''
  return EXT_LANG[ext] ?? 'plaintext'
}

export function modelUri(path: string): monaco.Uri {
  return monaco.Uri.file(path)
}

export { monaco }
