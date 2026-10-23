import { memo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy, CornerDownLeft } from 'lucide-react'
import { getActiveEditor } from '../lib/editor'
import { toast } from '../store'

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: ReactNode } }).props.children)
  return ''
}

function CodeBlock({ lang, children }: { lang: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = textOf(children).replace(/\n$/, '')
  return (
    <div className="codeblock">
      <div className="cb-head">
        <span className="lang">{lang || 'text'}</span>
        <button
          className="icon-btn sm"
          title="Insert at cursor"
          onClick={() => {
            const ed = getActiveEditor()
            const sel = ed?.getSelection()
            if (!ed || !sel) return toast('Open a file to insert code into it.')
            ed.executeEdits('prism-insert', [{ range: sel, text: code, forceMoveMarkers: true }])
            ed.focus()
          }}
        >
          <CornerDownLeft size={13} />
        </button>
        <button
          className="icon-btn sm"
          title="Copy"
          onClick={() => {
            void navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  )
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={{
          pre: ({ children }) => {
            const child = Array.isArray(children) ? children[0] : children
            const className = (child as { props?: { className?: string } })?.props?.className ?? ''
            const lang = className.match(/language-([\w+-]+)/)?.[1] ?? ''
            return <CodeBlock lang={lang}>{child}</CodeBlock>
          },
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault()
                if (href) void window.prism.openExternal(href)
              }}
            >
              {children}
            </a>
          )
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
})
