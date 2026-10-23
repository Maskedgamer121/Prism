import { BrowserWindow } from 'electron'
import { parse, type HTMLElement } from 'node-html-parser'
import TurndownService from 'turndown'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 PrismIDE/0.1'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

async function searchDuckDuckGo(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: query }).toString(),
    signal
  })
  if (!res.ok) throw new Error(`DuckDuckGo returned ${res.status}`)
  const root = parse(await res.text())
  const out: SearchResult[] = []
  for (const r of root.querySelectorAll('.result')) {
    const a = r.querySelector('.result__a')
    if (!a) continue
    let href = a.getAttribute('href') ?? ''
    const m = href.match(/[?&]uddg=([^&]+)/)
    if (m) href = decodeURIComponent(m[1])
    if (href.startsWith('//')) href = 'https:' + href
    if (!/^https?:/.test(href) || /duckduckgo\.com\/y\.js/.test(href)) continue
    out.push({ title: clean(a.text), url: href, snippet: clean(r.querySelector('.result__snippet')?.text ?? '') })
  }
  return out
}

async function searchBing(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    signal
  })
  if (!res.ok) throw new Error(`Bing returned ${res.status}`)
  const root = parse(await res.text())
  const out: SearchResult[] = []
  for (const li of root.querySelectorAll('li.b_algo')) {
    const a = li.querySelector('h2 a')
    const href = a?.getAttribute('href') ?? ''
    if (!a || !/^https?:/.test(href)) continue
    out.push({ title: clean(a.text), url: href, snippet: clean(li.querySelector('.b_caption p, p')?.text ?? '') })
  }
  return out
}

export async function webSearch(query: string, max: number, signal: AbortSignal): Promise<SearchResult[]> {
  const errors: string[] = []
  for (const engine of [searchDuckDuckGo, searchBing]) {
    try {
      const results = await engine(query, AbortSignal.any([signal, AbortSignal.timeout(15000)]))
      if (results.length) return results.slice(0, max)
    } catch (err) {
      if (signal.aborted) throw err
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }
  throw new Error(`Web search returned no results${errors.length ? ` (${errors.join('; ')})` : ''}.`)
}

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
turndown.remove(['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'form'])

function htmlToMarkdown(html: string, url: string): { title: string; markdown: string } {
  const root = parse(html, { blockTextElements: { script: true, style: true, pre: true, code: false } })
  const title = clean(root.querySelector('title')?.text ?? url)
  for (const sel of ['nav', 'footer', 'header', 'aside', '[role=navigation]', '.sidebar', '#sidebar', '.cookie', '.advert', '.ads']) {
    root.querySelectorAll(sel).forEach((el: HTMLElement) => el.remove())
  }
  const main = root.querySelector('main') ?? root.querySelector('article') ?? root.querySelector('[role=main]') ?? root.querySelector('body') ?? root
  const markdown = turndown
    .turndown(main.toString())
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { title, markdown }
}

/** Loads the page in a hidden Chromium window so JavaScript-rendered sites work. */
async function renderPage(url: string, signal: AbortSignal): Promise<{ title: string; markdown: string }> {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { sandbox: true, javascript: true, partition: 'prism-browse', offscreen: false }
  })
  const kill = () => {
    if (!win.isDestroyed()) win.destroy()
  }
  signal.addEventListener('abort', kill, { once: true })
  try {
    await Promise.race([
      win.loadURL(url, { userAgent: UA }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Page load timed out')), 25000))
    ])
    await new Promise((r) => setTimeout(r, 1200))
    const html = (await win.webContents.executeJavaScript('document.documentElement.outerHTML')) as string
    return htmlToMarkdown(html, url)
  } finally {
    signal.removeEventListener('abort', kill)
    kill()
  }
}

export interface FetchedPage {
  url: string
  title: string
  content: string
  totalLength: number
}

export async function webFetch(url: string, opts: { render?: boolean; offset?: number; maxChars?: number }, signal: AbortSignal): Promise<FetchedPage> {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  const maxChars = opts.maxChars ?? 30000
  let page: { title: string; markdown: string }
  if (opts.render) {
    page = await renderPage(url, signal)
  } else {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)])
    })
    if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`)
    const type = res.headers.get('content-type') ?? ''
    const body = await res.text()
    if (/html/i.test(type)) {
      page = htmlToMarkdown(body, url)
      // Client-rendered apps come back nearly empty; render them for real.
      if (page.markdown.length < 400) page = await renderPage(url, signal)
    } else {
      page = { title: url, markdown: body }
    }
  }
  const offset = Math.max(0, opts.offset ?? 0)
  const slice = page.markdown.slice(offset, offset + maxChars)
  const more = offset + maxChars < page.markdown.length
  return {
    url,
    title: page.title,
    content: slice + (more ? `\n\n[… truncated. ${page.markdown.length - offset - maxChars} more characters — call web_fetch again with offset=${offset + maxChars}]` : ''),
    totalLength: page.markdown.length
  }
}
