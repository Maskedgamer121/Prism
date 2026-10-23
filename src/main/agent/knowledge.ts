import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { basename, join } from 'path'

/**
 * The knowledge base is a folder of Markdown files, one per language or topic.
 * Bundled files ship with the app; files in <userData>/knowledge override or
 * extend them, so people can teach the agent their own conventions.
 */

const ALIASES: Record<string, string> = {
  ts: 'typescript', tsx: 'react', js: 'javascript', jsx: 'react', node: 'javascript', nodejs: 'javascript',
  py: 'python', luau: 'lua', roblox: 'lua', 'c++': 'cpp', unreal: 'cpp', ue5: 'cpp', 'c#': 'csharp', cs: 'csharp',
  unity: 'csharp', dotnet: 'csharp', css: 'html-css', html: 'html-css', web: 'html-css', bash: 'shell', powershell: 'shell',
  ps1: 'shell', sh: 'shell', rs: 'rust', golang: 'go', postgres: 'sql', mysql: 'sql', sqlite: 'sql', kt: 'java', kotlin: 'java',
  c: 'cpp', vue: 'javascript', svelte: 'javascript', nextjs: 'react', next: 'react', tests: 'testing', test: 'testing',
  secure: 'security', git: 'git', api: 'api-design', rest: 'api-design'
}

export function bundledDir(): string {
  const packaged = join(process.resourcesPath ?? '', 'knowledge')
  return app.isPackaged && existsSync(packaged) ? packaged : join(app.getAppPath(), 'knowledge')
}

export function userDir(): string {
  const dir = join(app.getPath('userData'), 'knowledge')
  mkdirSync(dir, { recursive: true })
  return dir
}

function load(): Map<string, string> {
  const topics = new Map<string, string>()
  for (const dir of [bundledDir(), userDir()]) {
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue
      topics.set(basename(file, '.md').toLowerCase(), readFileSync(join(dir, file), 'utf8'))
    }
  }
  return topics
}

export function listTopics(): string[] {
  return Array.from(load().keys()).sort()
}

export function getTopic(name: string): string | null {
  const key = name.toLowerCase().trim().replace(/\s+/g, '-')
  const topics = load()
  return topics.get(key) ?? topics.get(ALIASES[key] ?? '') ?? null
}

/** Core rules plus guidance for the detected languages, capped at `budget` characters. */
export function knowledgeFor(languages: string[], budget: number): { text: string; included: string[] } {
  const topics = load()
  const included: string[] = []
  let text = ''
  for (const lang of ['general', ...languages]) {
    const name = topics.has(lang) ? lang : (ALIASES[lang] ?? lang)
    const body = topics.get(name)
    if (!body || included.includes(name)) continue
    if (text.length + body.length > budget && included.length > 0) continue
    text += `\n\n${body.trim()}`
    included.push(name)
  }
  return { text: text.trim(), included }
}
