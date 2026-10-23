import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, CircleDashed, Lightbulb, Loader2, MessageSquare, RotateCcw, Sparkles, XCircle, Zap } from 'lucide-react'
import type { Exercise, LearnLanguage, Scene } from '@shared/learn'
import { useApp, errorText, toast } from '../store'
import { checkExercise, solutionResult, type CheckOutcome } from './check'
import { CodeBox } from './CodeBox'
import { LearnMd, RunButton } from './Blocks'
import { ConsoleView, GraphicsCanvas, SceneCanvas } from './Output'
import { markComplete, saveDraft, useLearn } from './state'
import { useRun } from './useRun'

const CONSOLE_HINT: Record<LearnLanguage, string> = {
  python: 'Output from print() appears here. Errors show up here too.',
  javascript: 'Output from console.log() appears here. Errors show up here too.',
  typescript: 'Output from console.log() appears here. Errors show up here too.',
  lua: 'Output from print() appears here. Errors show up here too.',
  sql: 'Query results appear here. Errors show up here too.'
}

interface Props {
  exercise: Exercise
  language: LearnLanguage
  trackId: string
  number?: string
  onNext?: () => void
  nextLabel?: string
  /** Inline checkpoints are shorter and sit inside a lesson. */
  inline?: boolean
}

export function ExerciseView({ exercise: ex, language, trackId, number, onNext, nextLabel, inline }: Props) {
  const done = useLearn((s) => Boolean(s.progress.completed[ex.id]))
  const draft = useLearn((s) => s.progress.drafts[ex.id])
  const [code, setCode] = useState(draft ?? ex.starter)
  const touched = useRef(false)
  // Progress loads asynchronously; show the saved draft once it arrives unless the learner already typed.
  useEffect(() => {
    if (!touched.current && draft !== undefined) setCode(draft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft === undefined, ex.id])
  const [tab, setTab] = useState<'mine' | 'goal'>('mine')
  const [goal, setGoal] = useState<{ scene?: Scene; output?: string; error?: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null)
  const [justPassed, setJustPassed] = useState(false)
  const [hintsShown, setHintsShown] = useState(0)
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const run = useRun(language, ex.kind)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const graphics = ex.kind === 'graphics'

  // Reset when switching to another exercise.
  useEffect(() => {
    setCode(useLearn.getState().progress.drafts[ex.id] ?? ex.starter)
    setOutcome(null)
    setJustPassed(false)
    setHintsShown(0)
    setAiHint(null)
    setTab('mine')
    run.stop()
    let alive = true
    setGoal(null)
    solutionResult(ex, language)
      .then((r) => alive && setGoal(r.results[0] ?? null))
      .catch((err) => alive && setGoal({ error: errorText(err) }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  const onChange = (v: string) => {
    touched.current = true
    setCode(v)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDraft(ex.id, v), 500)
  }

  const runCode = () => {
    setTab('mine')
    void run.start(code)
  }

  const check = async () => {
    setChecking(true)
    setOutcome(null)
    try {
      const result = await checkExercise(ex, language, code)
      setOutcome(result)
      if (result.passed) {
        const first = markComplete(ex, trackId)
        setJustPassed(first)
        if (!first) toast('Correct again — nice!', 'success')
      }
      // Show the drawing after a check; console programs might wait for input, so leave those alone.
      if (graphics && !run.state.running) void run.start(code)
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setChecking(false)
    }
  }

  const problem = useMemo(() => {
    if (!outcome) return run.state.error?.message ?? ''
    return [...outcome.requirements, ...outcome.tests.filter((t) => !t.pass).map((t) => `${t.label}: ${t.detail ?? 'failed'}`)].join('\n')
  }, [outcome, run.state.error])

  const askAi = async () => {
    setAiBusy(true)
    setAiHint(null)
    try {
      setAiHint(await window.prism.learn.hint({ language, kind: ex.kind, prompt: `${ex.title}\n${ex.prompt}`, code, problem }))
    } catch (err) {
      setAiHint(`Couldn't reach the AI: ${errorText(err)}. Pick a model in Settings → Models.`)
    } finally {
      setAiBusy(false)
    }
  }

  const discuss = () => {
    const s = useApp.getState()
    useApp.setState({
      showLearnChat: true,
      chatMode: 'ask',
      composerFocus: s.composerFocus + 1,
      composerDraft: `I'm learning ${language} and working on the exercise "${ex.title}". Please guide me without giving me the full answer.\n\nInstructions:\n${ex.prompt.replace(/[«»]/g, '`')}\n\nMy code:\n\`\`\`${language}\n${code}\n\`\`\`\n${problem ? `\nWhat's wrong when I check it:\n${problem}\n` : ''}\nMy question: `
    })
  }

  const hints = ex.hints ?? []
  const displayScene = tab === 'goal' ? (goal?.scene ?? null) : run.state.scene

  return (
    <div className={`exercise${inline ? ' inline' : ''}`}>
      <div className="ex-top">
        <div className="ex-title">
          {number && <span className="ex-num">{number}</span>}
          <span>{ex.title}</span>
          <span className="ex-points" title="Points for completing this">
            <Zap size={12} /> {ex.points ?? 1}
          </span>
          {done && (
            <span className="ex-done">
              <Check size={12} /> Done
            </span>
          )}
        </div>
        <div className="grow" />
        {graphics && (
          <div className="segmented">
            <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
              My canvas
            </button>
            <button className={tab === 'goal' ? 'on' : ''} onClick={() => setTab('goal')}>
              Goal
            </button>
          </div>
        )}
        <RunButton running={run.state.running} onRun={runCode} onStop={run.stop} />
        <button className="check-btn" onClick={() => void check()} disabled={checking}>
          {checking ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />} Check
        </button>
      </div>

      <div className="ex-body">
        <div className="ex-left">
          <div className="ex-prompt">
            <LearnMd md={ex.prompt} />
          </div>
          <div className="ex-editor">
            <CodeBox value={code} onChange={onChange} language={language} kind={ex.kind} onRun={runCode} errorLine={run.state.error?.line} minLines={inline ? 4 : 12} maxLines={inline ? 14 : 30} />
          </div>
          <div className="ex-tools">
            <button
              className="btn sm ghost"
              onClick={() => {
                if (code === ex.starter || window.confirm('Reset to the starting code? Your changes will be lost.')) onChange(ex.starter)
              }}
            >
              <RotateCcw size={12} /> Reset
            </button>
            {hints.length > 0 && (
              <button className="btn sm ghost" disabled={hintsShown >= hints.length} onClick={() => setHintsShown((n) => n + 1)}>
                <Lightbulb size={12} /> Hint {hintsShown < hints.length ? `${hintsShown + 1}/${hints.length}` : '(all shown)'}
              </button>
            )}
            <button className="btn sm ghost" onClick={() => void askAi()} disabled={aiBusy}>
              {aiBusy ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} AI hint
            </button>
            {!inline && (
              <button className="btn sm ghost" onClick={discuss}>
                <MessageSquare size={12} /> Ask the tutor
              </button>
            )}
          </div>
          {(hintsShown > 0 || aiHint) && (
            <div className="hints">
              {hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} className="hint">
                  <Lightbulb size={13} />
                  <LearnMd md={h} />
                </div>
              ))}
              {aiHint && (
                <div className="hint ai">
                  <Sparkles size={13} />
                  <LearnMd md={aiHint} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ex-right">
          {graphics ? (
            <GraphicsCanvas
              scene={displayScene}
              handlers={tab === 'goal' ? [] : run.state.handlers}
              onEvent={tab === 'goal' ? undefined : run.send}
              overlay={tab === 'goal' ? <div className="goal-badge">Goal{ex.tests.some((t) => t.events?.length) ? ' (before any events)' : ''}</div> : !run.state.scene && !run.state.running ? <div className="canvas-hint">Press Run to see your drawing</div> : null}
            />
          ) : (
            goal?.output !== undefined && (
              <div className="expected">
                <div className="console-head">Example{ex.tests[0]?.stdin ? ` — input: ${ex.tests[0].stdin.split('\n').filter(Boolean).join(', ')}` : ''}</div>
                <pre>{goal.output || '(prints nothing)'}</pre>
              </div>
            )
          )}
          <ConsoleView output={run.state.output} error={run.state.error} acceptsInput={!graphics && run.state.running} onInput={run.input} placeholder={CONSOLE_HINT[language]} />
        </div>
      </div>

      {(outcome || justPassed) && (
        <div className="checklist">
          {justPassed && (
            <div className="success">
              <CheckCircle2 size={18} />
              <div>
                <b>Exercise complete!</b> +{ex.points ?? 1} <Zap size={12} />
              </div>
              <div className="grow" />
              {onNext && (
                <button className="btn primary sm" onClick={onNext}>
                  {nextLabel ?? 'Next'} <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
          {outcome?.requirements.map((r, i) => (
            <div key={`req-${i}`} className="check-row fail">
              <XCircle size={15} />
              <span>{r}</span>
            </div>
          ))}
          {outcome?.tests.map((t, i) => (
            <div key={i} className={`check-row ${t.pass ? 'pass' : 'fail'}`}>
              {t.pass ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              <div className="check-text">
                <span>{t.label}</span>
                {t.detail && <span className="check-detail">{t.detail}</span>}
                {!t.pass && t.expected !== undefined && (
                  <div className="io-compare">
                    <div>
                      <div className="io-label">Expected</div>
                      <pre>{t.expected || '(nothing)'}</pre>
                    </div>
                    <div>
                      <div className="io-label">Your output</div>
                      <pre>{t.got || '(nothing)'}</pre>
                    </div>
                  </div>
                )}
              </div>
              {graphics && !t.pass && (t.scene || t.goal) && (
                <div className="mini-compare">
                  <div>
                    <SceneCanvas scene={t.scene ?? null} size={84} />
                    <span>yours</span>
                  </div>
                  <div>
                    <SceneCanvas scene={t.goal ?? null} size={84} />
                    <span>goal</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {outcome && !outcome.passed && !outcome.tests.length && !outcome.requirements.length && (
            <div className="check-row fail">
              <CircleDashed size={15} /> Not quite yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
