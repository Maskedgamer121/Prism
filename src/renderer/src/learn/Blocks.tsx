import { memo, useMemo, useState } from 'react'
import { BookOpen, Copy, Lightbulb, Info, AlertTriangle, Play, RotateCcw, Square } from 'lucide-react'
import type { ApiDoc, LearnLanguage, RunKind } from '@shared/learn'
import { Markdown } from '../components/Markdown'
import { CodeBox } from './CodeBox'
import { ConsoleView, GraphicsCanvas } from './Output'
import { useRun } from './useRun'

/** Lesson text uses «code» for inline code so content can live in template strings. */
export const LearnMd = memo(function LearnMd({ md }: { md: string }) {
  return <Markdown text={md.replace(/[«»]/g, '`')} />
})

export function RunButton({ running, onRun, onStop, label = 'Run' }: { running: boolean; onRun: () => void; onStop: () => void; label?: string }) {
  return running ? (
    <button className="run-btn stop" onClick={onStop} title="Stop">
      <Square size={11} fill="currentColor" /> Stop
    </button>
  ) : (
    <button className="run-btn" onClick={onRun} title="Run (Ctrl+Enter)">
      <Play size={12} fill="currentColor" /> {label}
    </button>
  )
}

/** Editable code with a Run button; output appears underneath once run. */
export function RunnableExample({ code, language, kind, caption }: { code: string; language: LearnLanguage; kind: RunKind; caption?: string }) {
  const [value, setValue] = useState(code)
  const [shown, setShown] = useState(false)
  const run = useRun(language, kind)
  const go = () => {
    setShown(true)
    void run.start(value)
  }
  return (
    <div className="example">
      {caption && <div className="example-caption">{caption}</div>}
      <CodeBox value={value} onChange={setValue} language={language} kind={kind} onRun={go} errorLine={run.state.error?.line} />
      <div className="example-bar">
        <RunButton running={run.state.running} onRun={go} onStop={run.stop} />
        {value !== code && (
          <button
            className="btn sm ghost"
            onClick={() => {
              setValue(code)
              run.stop()
            }}
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
        {shown && (
          <button
            className="btn sm ghost"
            onClick={() => {
              run.stop()
              setShown(false)
            }}
          >
            Hide output
          </button>
        )}
        <span className="example-hint">Edit the code and run it again — experimenting is the fastest way to learn.</span>
      </div>
      {shown && (
        <div className={`example-output ${kind}`}>
          {kind === 'graphics' && <GraphicsCanvas scene={run.state.scene} handlers={run.state.handlers} onEvent={run.send} />}
          <ConsoleView
            output={run.state.output}
            error={run.state.error}
            acceptsInput={kind === 'console' && run.state.running}
            onInput={run.input}
            placeholder={kind === 'graphics' ? 'print() output and errors appear here.' : undefined}
          />
        </div>
      )}
    </div>
  )
}

export function Callout({ md, tone = 'info' }: { md: string; tone?: 'info' | 'tip' | 'warn' }) {
  const Icon = tone === 'tip' ? Lightbulb : tone === 'warn' ? AlertTriangle : Info
  return (
    <div className={`callout ${tone}`}>
      <Icon size={16} />
      <LearnMd md={md} />
    </div>
  )
}

function Signature({ text }: { text: string }) {
  // Highlight parameter names inside the parentheses.
  const m = text.match(/^([\w.]+)(\(([\s\S]*)\))?(.*)$/)
  if (!m) return <code className="sig">{text}</code>
  const params = m[3]?.split(/,\s*/) ?? null
  return (
    <code className="sig">
      <span className="sig-name">{m[1]}</span>
      {params !== null && (
        <>
          (
          {params.map((p, i) => {
            const [name, def] = p.split('=')
            return (
              <span key={i}>
                <span className={def ? 'sig-opt' : 'sig-param'}>{name}</span>
                {def !== undefined && <span className="sig-def">={def}</span>}
                {i < params.length - 1 ? ', ' : ''}
              </span>
            )
          })}
          )
        </>
      )}
      {m[4]}
    </code>
  )
}

/** Documentation card: what it is, every parameter, properties, and a runnable example. */
export function DocCard({ doc, language, kind, compact }: { doc: ApiDoc; language: LearnLanguage; kind: RunKind; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const required = useMemo(() => doc.params?.filter((p) => p.default === undefined) ?? [], [doc])
  const optional = useMemo(() => doc.params?.filter((p) => p.default !== undefined) ?? [], [doc])
  return (
    <div className="doc-card" id={`doc-${doc.name}`}>
      <div className="doc-head">
        <BookOpen size={15} />
        <span className="doc-name">{doc.name}</span>
        <span className="doc-cat">{doc.category}</span>
        <button
          className="icon-btn sm"
          title="Copy the signature"
          onClick={() => {
            void navigator.clipboard.writeText(doc.signature)
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
          }}
        >
          <Copy size={12} />
        </button>
        {copied && <span className="doc-copied">copied</span>}
      </div>
      <Signature text={doc.signature} />
      <div className="doc-summary">
        <LearnMd md={doc.summary} />
      </div>
      {(required.length > 0 || optional.length > 0) && (
        <table className="doc-params">
          <tbody>
            {required.map((p) => (
              <tr key={p.name}>
                <td>
                  <code className="sig-param">{p.name}</code>
                  <span className="req">required</span>
                </td>
                <td>
                  <LearnMd md={p.desc} />
                </td>
              </tr>
            ))}
            {optional.map((p) => (
              <tr key={p.name}>
                <td>
                  <code className="sig-opt">{p.name}</code>
                  <span className="def">= {p.default}</span>
                </td>
                <td>
                  <LearnMd md={p.desc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {doc.properties && doc.properties.length > 0 && (
        <div className="doc-props">
          <div className="doc-sub">Properties you can read and change</div>
          <div className="prop-grid">
            {doc.properties.map((p) => (
              <div key={p.name} className="prop">
                <code>{p.name}</code>
                <span>{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!compact && (
        <>
          <div className="doc-sub">Try it</div>
          <RunnableExample code={doc.example} language={language} kind={kind} />
        </>
      )}
      {doc.tips && doc.tips.length > 0 && (
        <ul className="doc-tips">
          {doc.tips.map((t, i) => (
            <li key={i}>
              <LearnMd md={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
