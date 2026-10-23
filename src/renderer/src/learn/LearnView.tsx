import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Flame,
  FlaskConical,
  GraduationCap,
  LayoutList,
  Loader2,
  Puzzle,
  Search,
  Sparkles,
  SquareTerminal,
  Wand2,
  Zap
} from 'lucide-react'
import type { Exercise, LearnLanguage, Lesson, Section, Track } from '@shared/learn'
import { errorText, toast, updateSettings, useApp } from '../store'
import { Select } from '../components/Select'
import { CodeBox } from './CodeBox'
import { Callout, DocCard, LearnMd, RunButton, RunnableExample } from './Blocks'
import { ExerciseView } from './ExerciseView'
import { ConsoleView, GraphicsCanvas, SceneCanvas } from './Output'
import { COLOR_NAMES, DOCS, TRACKS } from './content'
import { solutionResult } from './check'
import {
  allLessons,
  findLesson,
  findTrack,
  go,
  goBack,
  initLearn,
  lessonItems,
  lessonNumber,
  saveDraft,
  streak,
  trackStats,
  updateProgress,
  useLearn,
  type LearnPage
} from './state'
import { useRun } from './useRun'

const LANG_BADGE: Record<LearnLanguage, { label: string; color: string }> = {
  python: { label: 'Py', color: '#3b78c4' },
  javascript: { label: 'JS', color: '#c9a91a' },
  typescript: { label: 'TS', color: '#3178c6' },
  lua: { label: 'Lua', color: '#3b3bd1' },
  sql: { label: 'SQL', color: '#c46a1a' }
}

const LANG_GROUPS: [LearnLanguage, string][] = [
  ['python', 'Python'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['lua', 'Lua & Roblox'],
  ['sql', 'Databases']
]

function LangIcon({ language, size = 30 }: { language: LearnLanguage; size?: number }) {
  const b = LANG_BADGE[language]
  return (
    <span className="lang-icon" style={{ width: size, height: size, background: b.color, fontSize: size * 0.36 }}>
      {b.label}
    </span>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  return (
    <div className="pbar">
      <div style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </div>
  )
}

function Thumb({ ex, language }: { ex: Exercise; language: LearnLanguage }) {
  const [scene, setScene] = useState<import('@shared/learn').Scene | null>(null)
  useEffect(() => {
    if (ex.kind !== 'graphics') return
    let alive = true
    solutionResult(ex, language)
      .then((r) => alive && setScene(r.results[0]?.scene ?? null))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [ex, language])
  if (ex.kind !== 'graphics')
    return (
      <span className="thumb console-thumb">
        <SquareTerminal size={22} />
      </span>
    )
  return <SceneCanvas scene={scene} size={52} className="thumb" />
}

// ---------------------------------------------------------------- sidebar

function Sidebar({ track }: { track?: Track }) {
  const nav = useLearn((s) => s.nav)
  const progress = useLearn((s) => s.progress)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const lessonId = 'lessonId' in nav ? nav.lessonId : undefined
  const currentLesson = track && lessonId ? findLesson(track, lessonId)?.lesson : undefined

  return (
    <aside className="learn-side">
      <button className="learn-brand" onClick={() => go({ page: 'home' })}>
        <GraduationCap size={17} /> Learn
      </button>
      <div className="learn-stats">
        <span title="Points">
          <Zap size={13} /> {progress.xp}
        </span>
        <span title="Day streak">
          <Flame size={13} /> {streak(progress.days)}
        </span>
        <span title="Exercises completed">
          <Check size={13} /> {Object.keys(progress.completed).length}
        </span>
      </div>
      {track && (
        <>
          <div className="side-label">Course</div>
          <div style={{ padding: '0 10px 8px' }}>
            <Select
              block
              align="left"
              value={track.id}
              onChange={(id) => go({ page: 'track', trackId: id })}
              options={TRACKS.map((t) => ({ value: t.id, label: t.title, description: t.tagline, group: { python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', lua: 'Lua', sql: 'SQL' }[t.language] }))}
            />
          </div>
          <nav className="side-nav">
            <button className={nav.page === 'track' ? 'on' : ''} onClick={() => go({ page: 'track', trackId: track.id })}>
              <LayoutList size={14} /> Course outline
            </button>
            <button className={nav.page === 'docs' ? 'on' : ''} onClick={() => go({ page: 'docs', trackId: track.id })}>
              <BookOpen size={14} /> Docs{track.kind === 'graphics' ? ' + Colors' : ''}
            </button>
            <button className={nav.page === 'sandbox' ? 'on' : ''} onClick={() => go({ page: 'sandbox', trackId: track.id })}>
              <FlaskConical size={14} /> Sandbox
            </button>
            <button className={nav.page === 'challenges' ? 'on' : ''} onClick={() => go({ page: 'challenges', trackId: track.id })}>
              <Wand2 size={14} /> AI challenges
            </button>
          </nav>
          <div className="side-label">Lessons</div>
          <div className="side-outline">
            {track.units.map((u, ui) => (
              <div key={u.id}>
                <div className="side-unit">
                  {ui + 1}. {u.title}
                </div>
                {u.lessons.map((l, li) => {
                  const items = lessonItems(l)
                  const done = items.length > 0 && items.every((e) => progress.completed[e.id])
                  const active = l.id === lessonId
                  const expanded = open[l.id] ?? active
                  return (
                    <div key={l.id}>
                      <button
                        className={`side-lesson${active ? ' on' : ''}`}
                        onClick={() => {
                          if (active && nav.page === 'lesson') setOpen((o) => ({ ...o, [l.id]: !expanded }))
                          else go({ page: 'lesson', trackId: track.id, lessonId: l.id })
                        }}
                      >
                        <span className="num">
                          {ui + 1}.{li + 1}
                        </span>
                        <span className="t">{l.title}</span>
                        {done && <Check size={13} className="ok" />}
                      </button>
                      {active && currentLesson && expanded && (
                        <div className="side-parts">
                          {currentLesson.parts.map((p, pi) => (
                            <button key={pi} onClick={() => document.getElementById(`part-${pi}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                              {p.title}
                            </button>
                          ))}
                          {currentLesson.exercises.length > 0 && (
                            <button onClick={() => document.getElementById('practice')?.scrollIntoView({ behavior: 'smooth' })}>Practice exercises</button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------- pages

function Home() {
  const progress = useLearn((s) => s.progress)
  const runtimes = useLearn((s) => s.runtimes)
  const last = progress.lastTrack ? findTrack(progress.lastTrack) : undefined
  return (
    <div className="learn-page">
      <div className="learn-hero">
        <div>
          <h1>Learn to code, one step at a time</h1>
          <p>
            Pick a course. Every lesson starts with how things work — with live examples you can edit and run — then gives you checkpoints and exercises that build on each other. Stuck? Ask the AI tutor for a hint.
          </p>
          {last && (
            <button className="btn primary" onClick={() => go({ page: 'track', trackId: last.id })}>
              Continue {last.title} <ArrowRight size={14} />
            </button>
          )}
        </div>
        <div className="hero-stats">
          <div>
            <Zap size={18} />
            <b>{progress.xp}</b>
            <span>points</span>
          </div>
          <div>
            <Flame size={18} />
            <b>{streak(progress.days)}</b>
            <span>day streak</span>
          </div>
          <div>
            <Check size={18} />
            <b>{Object.keys(progress.completed).length}</b>
            <span>solved</span>
          </div>
        </div>
      </div>
      <h2 className="learn-h2">Courses</h2>
      {LANG_GROUPS.map(([lang, label]) => {
        const list = TRACKS.filter((t) => t.language === lang)
        if (!list.length) return null
        return (
          <div key={lang} className="track-group">
            <div className="track-group-title">{label}</div>
            <div className="track-grid">
              {list.map((t) => {
          const st = trackStats(t, progress)
          const missing = t.language === 'python' && runtimes && !runtimes.python
          return (
            <button key={t.id} className="track-card" onClick={() => go({ page: 'track', trackId: t.id })}>
              <div className="tc-top">
                <LangIcon language={t.language} />
                <div>
                  <div className="tc-title">{t.title}</div>
                  <div className="tc-level">
                    {t.level} · {t.kind === 'graphics' ? 'Graphics & games' : 'Console programs'}
                  </div>
                </div>
              </div>
              <div className="tc-tag">{t.tagline}</div>
              <ProgressBar done={st.done} total={st.total} />
              <div className="tc-foot">
                <span>
                  {st.done}/{st.total} done
                </span>
                <span>{allLessons(t).length} lessons</span>
                {missing && <span className="warn">Needs Python</span>}
              </div>
            </button>
          )
              })}
            </div>
          </div>
        )
      })}
      {runtimes && (
        <div className="runtime-line">
          Runs on your computer: {runtimes.python ?? 'Python not found — install it from python.org to use the Python courses'} · {runtimes.javascript} · {runtimes.lua}
        </div>
      )}
    </div>
  )
}

/** Circular progress around a lesson number; a solid check once everything is done. */
function Ring({ done, total, label, size = 38 }: { done: number; total: number; label: string; size?: number }) {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  if (total && done >= total)
    return (
      <span className="ring done" style={{ width: size, height: size }}>
        <Check size={size * 0.45} />
      </span>
    )
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="ring-label">{label}</span>
    </span>
  )
}

function TrackOutline({ track }: { track: Track }) {
  const progress = useLearn((s) => s.progress)
  const st = trackStats(track, progress)
  const lessons = allLessons(track)
  const next = lessons.find((l) => lessonItems(l).some((e) => !progress.completed[e.id])) ?? lessons[0]
  const exerciseCount = lessons.reduce((n, l) => n + l.exercises.length, 0)
  return (
    <div className="learn-page">
      <div className="course-hero">
        <LangIcon language={track.language} size={52} />
        <div className="ch-text">
          <h1>{track.title}</h1>
          <p>{track.tagline}</p>
          <div className="ch-chips">
            <span>{track.units.length} units</span>
            <span>{lessons.length} lessons</span>
            <span>{exerciseCount} exercises</span>
            <span>{track.kind === 'graphics' ? 'Graphics & games' : 'Console programs'}</span>
          </div>
        </div>
        <div className="ch-side">
          <Ring done={st.done} total={st.total} label={`${st.total ? Math.round((st.done / st.total) * 100) : 0}%`} size={64} />
          {next && (
            <button className="btn primary" onClick={() => go({ page: 'lesson', trackId: track.id, lessonId: next.id })}>
              {st.done ? 'Continue' : 'Start'} <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {track.units.map((u, ui) => {
        const items = u.lessons.flatMap(lessonItems)
        const unitDone = items.filter((e) => progress.completed[e.id]).length
        return (
          <section key={u.id} className="unit2">
            <div className="unit2-head">
              <span className="unit2-kicker">Unit {ui + 1}</span>
              <h2>{u.title}</h2>
              <span className="grow" />
              <span className="unit2-count">
                {unitDone}/{items.length}
              </span>
            </div>
            <div className="timeline">
              {u.lessons.map((l, li) => {
                const all = lessonItems(l)
                const done = all.filter((e) => progress.completed[e.id]).length
                const isNext = next?.id === l.id
                return (
                  <div key={l.id} className={`tl-item${isNext ? ' next' : ''}`}>
                    <Ring done={done} total={all.length} label={`${ui + 1}.${li + 1}`} />
                    <div className="lesson-card2" role="button" tabIndex={0} onClick={() => go({ page: 'lesson', trackId: track.id, lessonId: l.id })} onKeyDown={(e) => e.key === 'Enter' && go({ page: 'lesson', trackId: track.id, lessonId: l.id })}>
                      <div className="lc2-main">
                        <div className="lc2-title">
                          {l.title}
                          {isNext && <span className="up-next">Up next</span>}
                        </div>
                        <div className="lc2-sum">{l.summary}</div>
                        <div className="lc2-meta">
                          <span>
                            <FileText size={12} /> Lesson
                          </span>
                          {l.exercises.length > 0 && (
                            <span>
                              <Puzzle size={12} /> {l.exercises.length} exercise{l.exercises.length > 1 ? 's' : ''}
                            </span>
                          )}
                          <span>
                            <Zap size={12} /> {done}/{all.length}
                          </span>
                        </div>
                      </div>
                      {l.exercises.length > 0 && (
                        <div className="lc2-thumbs">
                          {l.exercises.map((ex) => (
                            <button
                              key={ex.id}
                              className="thumb-btn sm"
                              title={ex.title}
                              onClick={(e) => {
                                e.stopPropagation()
                                go({ page: 'exercise', trackId: track.id, lessonId: l.id, exerciseId: ex.id })
                              }}
                            >
                              <Thumb ex={ex} language={track.language} />
                              {progress.completed[ex.id] && (
                                <span className="thumb-check">
                                  <Check size={9} />
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <ChevronRight size={16} className="lc2-go" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function SectionView({ section, track }: { section: Section; track: Track }) {
  switch (section.type) {
    case 'text':
      return <LearnMd md={section.md} />
    case 'callout':
      return <Callout md={section.md} tone={section.tone} />
    case 'example':
      return <RunnableExample code={section.code} language={track.language} kind={track.kind} caption={section.caption} />
    case 'doc': {
      const doc = DOCS[track.docs ?? '']?.find((d) => d.name === section.api)
      return doc ? <DocCard doc={doc} language={track.language} kind={track.kind} /> : null
    }
    case 'checkpoint':
      return (
        <div className="checkpoint">
          <div className="checkpoint-label">
            <Puzzle size={14} /> Checkpoint
          </div>
          <ExerciseView exercise={section.exercise} language={track.language} trackId={track.id} inline />
        </div>
      )
  }
}

function LessonPage({ track, lesson }: { track: Track; lesson: Lesson }) {
  const progress = useLearn((s) => s.progress)
  const lessons = allLessons(track)
  const idx = lessons.findIndex((l) => l.id === lesson.id)
  const next = lessons[idx + 1]
  const prev = lessons[idx - 1]
  const found = findLesson(track, lesson.id)!
  return (
    <div className="learn-page lesson">
      <div className="crumbs">
        <button onClick={() => go({ page: 'track', trackId: track.id })}>{track.title}</button>
        <ChevronRight size={12} />
        <span>
          Unit {found.unitIndex + 1}: {track.units[found.unitIndex].title}
        </span>
      </div>
      <h1 className="lesson-h1">
        <span>{lessonNumber(track, lesson.id)}</span> {lesson.title}
      </h1>
      <p className="lesson-summary">{lesson.summary}</p>
      {lesson.parts.map((part, pi) => (
        <section key={pi} id={`part-${pi}`} className="lesson-part">
          <h2>{part.title}</h2>
          {part.sections.map((s, si) => (
            <SectionView key={si} section={s} track={track} />
          ))}
        </section>
      ))}
      {lesson.exercises.length > 0 && (
        <section id="practice" className="lesson-part">
          <h2>Practice exercises</h2>
          <p className="muted">Recreate each goal to earn points. They get a little harder as you go.</p>
          <div className="practice-grid">
            {lesson.exercises.map((ex) => (
              <button key={ex.id} className="practice-card" onClick={() => go({ page: 'exercise', trackId: track.id, lessonId: lesson.id, exerciseId: ex.id })}>
                <Thumb ex={ex} language={track.language} />
                <div>
                  <div className="pc-title">{ex.title}</div>
                  <div className="pc-sub">
                    <Zap size={11} /> {ex.points ?? 1} pt{(ex.points ?? 1) > 1 ? 's' : ''}
                  </div>
                </div>
                {progress.completed[ex.id] ? <Check size={16} className="ok" /> : <ArrowRight size={14} className="go" />}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="lesson-nav">
        {prev ? (
          <button className="btn" onClick={() => go({ page: 'lesson', trackId: track.id, lessonId: prev.id })}>
            <ArrowLeft size={13} /> {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="btn primary" onClick={() => go({ page: 'lesson', trackId: track.id, lessonId: next.id })}>
            Next: {next.title} <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function ExercisePage({ track, lesson, exerciseId }: { track: Track; lesson: Lesson; exerciseId: string }) {
  const list = lesson.exercises
  const i = list.findIndex((e) => e.id === exerciseId)
  const ex = list[i]
  if (!ex) return null
  const lessons = allLessons(track)
  const nextLesson = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1]
  const next = list[i + 1]
  return (
    <div className="learn-page wide">
      <div className="crumbs">
        <button onClick={() => go({ page: 'track', trackId: track.id })}>{track.title}</button>
        <ChevronRight size={12} />
        <button onClick={() => go({ page: 'lesson', trackId: track.id, lessonId: lesson.id })}>
          {lessonNumber(track, lesson.id)} {lesson.title}
        </button>
        <ChevronRight size={12} />
        <span>Practice</span>
        <div className="grow" />
        <div className="ex-pager">
          {list.map((e, j) => (
            <button key={e.id} className={j === i ? 'on' : ''} onClick={() => go({ page: 'exercise', trackId: track.id, lessonId: lesson.id, exerciseId: e.id })} title={e.title}>
              {j + 1}
            </button>
          ))}
        </div>
      </div>
      <ExerciseView
        exercise={ex}
        language={track.language}
        trackId={track.id}
        number={`${lessonNumber(track, lesson.id)}.${i + 1}`}
        onNext={
          next
            ? () => go({ page: 'exercise', trackId: track.id, lessonId: lesson.id, exerciseId: next.id })
            : nextLesson
              ? () => go({ page: 'lesson', trackId: track.id, lessonId: nextLesson.id })
              : undefined
        }
        nextLabel={next ? 'Next exercise' : nextLesson ? `Next lesson: ${nextLesson.title}` : undefined}
      />
    </div>
  )
}

function DocsPage({ track, api }: { track: Track; api?: string }) {
  const docs = DOCS[track.docs ?? ''] ?? []
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'docs' | 'colors'>('docs')
  const [copied, setCopied] = useState<string | null>(null)
  const filtered = docs.filter((d) => !q || `${d.name} ${d.summary} ${d.category}`.toLowerCase().includes(q.toLowerCase()))
  const cats = Array.from(new Set(filtered.map((d) => d.category)))
  useEffect(() => {
    if (api) setTimeout(() => document.getElementById(`doc-${api}`)?.scrollIntoView({ block: 'start' }), 50)
  }, [api])
  return (
    <div className="learn-page">
      <div className="docs-head">
        <h1>{track.kind === 'graphics' ? 'Docs + Colors' : 'Quick reference'}</h1>
        {track.kind === 'graphics' && (
          <div className="segmented">
            <button className={tab === 'docs' ? 'on' : ''} onClick={() => setTab('docs')}>
              Docs
            </button>
            <button className={tab === 'colors' ? 'on' : ''} onClick={() => setTab('colors')}>
              Colors
            </button>
          </div>
        )}
      </div>
      {tab === 'docs' ? (
        <>
          <div className="field docs-search">
            <Search size={14} />
            <input placeholder="Search the docs, e.g. Rect, gradient, onKeyPress…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="docs-index">
            {filtered.map((d) => (
              <button key={d.name} onClick={() => document.getElementById(`doc-${d.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                {d.name}
              </button>
            ))}
          </div>
          {cats.map((c) => (
            <div key={c}>
              <h2 className="learn-h2">{c}</h2>
              {filtered
                .filter((d) => d.category === c)
                .map((d) => (
                  <DocCard key={d.name} doc={d} language={track.language} kind={track.kind} />
                ))}
            </div>
          ))}
          {!filtered.length && <p className="muted">Nothing matches “{q}”.</p>}
        </>
      ) : (
        <>
          <p className="muted">
            Every name below works as a color, like <code>fill='skyBlue'</code>. Capital letters don't matter. Click a swatch to copy its name.
          </p>
          <div className="color-grid">
            {COLOR_NAMES.map((c) => (
              <button
                key={c}
                className="swatch"
                onClick={() => {
                  void navigator.clipboard.writeText(c)
                  setCopied(c)
                  setTimeout(() => setCopied(null), 900)
                }}
              >
                <span className="chip-color" style={{ background: c }} />
                <span>{copied === c ? 'copied!' : c}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const SANDBOX_START: Record<string, string> = {
  'python-graphics': "# Sandbox: draw anything you like!\napp.background = gradient('skyBlue', 'white', start='top')\nCircle(200, 200, 80, fill='gold')\n",
  'python-console': "# Sandbox: try out Python here.\nname = input('What is your name? ')\nprint(f'Nice to meet you, {name}!')\n",
  'javascript-graphics': "// Sandbox: draw anything you like!\napp.background = gradient('skyBlue', 'white', {start: 'top'})\nCircle(200, 200, 80, {fill: 'gold'})\n",
  'javascript-console': "// Sandbox: try out JavaScript here.\nconst name = prompt('What is your name? ')\nconsole.log('Nice to meet you, ' + name + '!')\n",
  'typescript-console': "// Sandbox: try out TypeScript here.\ntype Player = { name: string; level: number }\nconst p: Player = { name: 'Ada', level: 3 }\nconsole.log(`${p.name} is level ${p.level}`)\n",
  'sql-console': '-- Sandbox: query the sample database.\n-- Tables: students, scores, products, orders\nSELECT * FROM students;\n',
  'lua-console': "-- Sandbox: try out Lua here.\nlocal name = input('What is your name? ')\nprint('Nice to meet you, ' .. name .. '!')\n"
}

function SandboxPage({ track }: { track: Track }) {
  const key = `sandbox:${track.id}`
  const saved = useLearn((s) => s.progress.drafts[key])
  const [code, setCode] = useState(saved ?? SANDBOX_START[`${track.language}-${track.kind}`] ?? '')
  const loaded = useRef(false)
  useEffect(() => {
    if (!loaded.current && saved !== undefined) {
      loaded.current = true
      setCode(saved)
    }
  }, [saved])
  const run = useRun(track.language, track.kind)
  const ai = useApp((s) => s.settings?.autocomplete)
  useEffect(() => {
    const t = setTimeout(() => saveDraft(key, code), 600)
    return () => clearTimeout(t)
  }, [code, key])
  return (
    <div className="learn-page wide">
      <div className="ex-top">
        <div className="ex-title">
          <FlaskConical size={15} /> Sandbox <span className="muted">· {track.title}</span>
        </div>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 12 }}>
          Suggestions: type and press <kbd>Tab</kbd>
        </span>
        <button
          className={`btn sm${ai?.enabled && ai.model ? '' : ' ghost'}`}
          title={ai?.model ? `AI ghost-text autocomplete with ${ai.model}` : 'Choose a model for AI autocomplete'}
          onClick={() => {
            if (!ai?.model) useApp.setState({ settingsOpen: true, settingsSection: 'autocomplete' })
            else void updateSettings({ autocomplete: { ...ai, enabled: !ai.enabled } })
          }}
        >
          <Sparkles size={12} /> AI autocomplete: {ai?.enabled && ai.model ? 'on' : 'off'}
        </button>
        <RunButton running={run.state.running} onRun={() => void run.start(code)} onStop={run.stop} />
      </div>
      <div className="ex-body">
        <div className="ex-left">
          <div className="ex-editor">
            <CodeBox value={code} onChange={setCode} language={track.language} kind={track.kind} aiComplete onRun={() => void run.start(code)} errorLine={run.state.error?.line} minLines={22} maxLines={40} />
          </div>
        </div>
        <div className="ex-right">
          {track.kind === 'graphics' && <GraphicsCanvas scene={run.state.scene} handlers={run.state.handlers} onEvent={run.send} />}
          <ConsoleView output={run.state.output} error={run.state.error} acceptsInput={track.kind === 'console' && run.state.running} onInput={run.input} />
        </div>
      </div>
    </div>
  )
}

function ChallengesPage({ track, exerciseId }: { track: Track; exerciseId?: string }) {
  const progress = useLearn((s) => s.progress)
  const list = progress.generated?.[track.id] ?? []
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('beginner')
  const [busy, setBusy] = useState(false)
  const model = useApp((s) => s.settings?.activeModel)
  const current = list.find((e) => e.id === exerciseId)
  const doneLessons = allLessons(track).filter((l) => lessonItems(l).some((e) => progress.completed[e.id]))

  const generate = async () => {
    setBusy(true)
    try {
      const ex = await window.prism.learn.generate({
        language: track.language,
        kind: track.kind,
        topic: topic.trim() || (doneLessons.length ? `something using: ${doneLessons.slice(-3).map((l) => l.title).join(', ')}` : 'the very basics'),
        level,
        recentTitles: list.slice(-8).map((e) => e.title)
      })
      updateProgress((p) => ({ ...p, generated: { ...p.generated, [track.id]: [...(p.generated?.[track.id] ?? []), ex] } }))
      go({ page: 'challenges', trackId: track.id, exerciseId: ex.id })
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (current)
    return (
      <div className="learn-page wide">
        <div className="crumbs">
          <button onClick={() => go({ page: 'challenges', trackId: track.id })}>AI challenges</button>
          <ChevronRight size={12} />
          <span>{current.title}</span>
        </div>
        <ExerciseView exercise={current} language={track.language} trackId={track.id} onNext={() => go({ page: 'challenges', trackId: track.id })} nextLabel="More challenges" />
      </div>
    )

  return (
    <div className="learn-page">
      <h1>
        <Wand2 size={22} /> AI challenges
      </h1>
      <p className="muted">
        Fresh practice made for you by the AI ({model || 'no model selected'}), at your level. Every challenge is checked by running its own solution before you get it, and is graded exactly like the course exercises.
      </p>
      <div className="gen-box">
        <div className="field" style={{ flex: 1 }}>
          <Sparkles size={14} />
          <input
            placeholder={track.kind === 'graphics' ? 'Topic (optional): e.g. draw a robot, keyboard game, loops…' : 'Topic (optional): e.g. loops, lists, a mini quiz game…'}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && void generate()}
          />
        </div>
        <Select
          value={level}
          onChange={setLevel}
          options={[
            { value: 'beginner', label: 'Easy', description: 'Just started' },
            { value: 'intermediate', label: 'Medium', description: 'A few units in' },
            { value: 'advanced beginner who wants a stretch', label: 'Hard', description: 'Stretch yourself' }
          ]}
        />
        <button className="btn primary" disabled={busy} onClick={() => void generate()}>
          {busy ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />} {busy ? 'Writing & testing…' : 'Generate'}
        </button>
      </div>
      {list.length > 0 && (
        <div className="practice-grid" style={{ marginTop: 18 }}>
          {[...list].reverse().map((ex) => (
            <button key={ex.id} className="practice-card" onClick={() => go({ page: 'challenges', trackId: track.id, exerciseId: ex.id })}>
              <Thumb ex={ex} language={track.language} />
              <div>
                <div className="pc-title">{ex.title}</div>
                <div className="pc-sub">AI challenge</div>
              </div>
              {progress.completed[ex.id] ? <Check size={16} className="ok" /> : <ArrowRight size={14} className="go" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- root

export function LearnView() {
  const nav = useLearn((s) => s.nav)
  useEffect(() => {
    void initLearn()
  }, [])
  const track = 'trackId' in nav ? findTrack(nav.trackId) : undefined
  const lesson = track && 'lessonId' in nav ? findLesson(track, nav.lessonId)?.lesson : undefined

  const page = useMemo(() => {
    const p: LearnPage = nav
    if (!track || p.page === 'home') return <Home />
    switch (p.page) {
      case 'track':
        return <TrackOutline track={track} />
      case 'lesson':
        return lesson ? <LessonPage key={lesson.id} track={track} lesson={lesson} /> : <TrackOutline track={track} />
      case 'exercise':
        return lesson ? <ExercisePage track={track} lesson={lesson} exerciseId={p.exerciseId} /> : <TrackOutline track={track} />
      case 'docs':
        return <DocsPage track={track} api={p.api} />
      case 'sandbox':
        return <SandboxPage key={track.id} track={track} />
      case 'challenges':
        return <ChallengesPage track={track} exerciseId={p.exerciseId} />
    }
  }, [nav, track, lesson])

  return (
    <div className="learn">
      <Sidebar track={track} />
      <main className="learn-main">
        {nav.page !== 'home' && (
          <button className="back-btn" onClick={goBack} title="Back">
            <ArrowLeft size={14} />
          </button>
        )}
        {page}
      </main>
    </div>
  )
}

