import { app, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Exercise, GraphicsEvent, LearnLanguage, LearnProgress, LearnTest, RunKind, RunRequest } from '@shared/learn'
import type { Agent } from '../agent/agent'
import { collect, detectRuntimes, sendEvent, sendStdin, startRun, stopAllRuns, stopRun } from './runner'

const progressFile = () => join(app.getPath('userData'), 'learn-progress.json')

function loadProgress(): LearnProgress {
  try {
    if (existsSync(progressFile())) return { completed: {}, drafts: {}, xp: 0, ...JSON.parse(readFileSync(progressFile(), 'utf8')) }
  } catch {
    /* corrupt file: start over */
  }
  return { completed: {}, drafts: {}, xp: 0 }
}

export const GRAPHICS_CHEATSHEET: Record<string, string> = {
  python: `This is Prism's built-in CMU-style graphics library (NOT turtle or pygame). Every name below is already available without imports.
Canvas is 400x400, (0,0) is the top-left. Shapes:
Rect(left, top, width, height), Oval(centerX, centerY, width, height), Circle(centerX, centerY, radius),
Line(x1, y1, x2, y2, lineWidth=2), Polygon(x1, y1, x2, y2, x3, y3, ...), RegularPolygon(centerX, centerY, radius, points),
Star(centerX, centerY, radius, points, roundness=None), Arc(centerX, centerY, width, height, startAngle, sweepAngle),
Label(value, centerX, centerY, size=12, bold=False), Group(shape1, shape2, ...).
Style keywords on every shape: fill='black', border=None, borderWidth=2, opacity=100 (0-100), rotateAngle=0, dashes=False, visible=True.
Colors are CSS names ('red', 'skyBlue'), rgb(r, g, b) or gradient('red', 'blue', start='top').
Properties: centerX, centerY, left, right, top, bottom, width, height, fill, rotateAngle, visible, radius (Circle), value (Label).
Methods: shape.contains(x, y), shape.hitsShape(other), toFront(), toBack(). app.background = 'color'. app.stepsPerSecond = 30.
Events (define functions): onMousePress(mouseX, mouseY), onMouseRelease, onMouseMove, onMouseDrag, onKeyPress(key), onKeyRelease(key), onStep().
Keys are like 'a', 'A', 'space', 'enter', 'up', 'down', 'left', 'right'. No input() in graphics programs.`,
  javascript: `This is Prism's built-in CMU-style graphics library (no DOM or canvas API). Canvas is 400x400, (0,0) is the top-left.
Shape functions (no "new" needed), style options go in a final object:
Rect(left, top, width, height, {fill: 'red'}), Oval(cx, cy, w, h, {...}), Circle(cx, cy, r, {...}), Line(x1, y1, x2, y2, {lineWidth: 2}),
Polygon(x1, y1, x2, y2, x3, y3, {...}), RegularPolygon(cx, cy, r, points, {...}), Star(cx, cy, r, points, {roundness}),
Label(value, cx, cy, {size: 12, bold: false}), Group(a, b, ...).
Options: fill, border, borderWidth, opacity (0-100), rotateAngle, dashes, visible. Colors: CSS names, rgb(r, g, b), gradient('red', 'blue', {start: 'top'}).
Properties: centerX, centerY, left, right, top, bottom, width, height, fill, rotateAngle, visible, radius, value.
Methods: contains(x, y), hitsShape(other), toFront(), toBack(). app.background = 'color'. app.stepsPerSecond = 30.
Events: function onMousePress(mouseX, mouseY) {}, onMouseMove, onMouseDrag, onKeyPress(key), onKeyRelease(key), onStep().`
}

const LANG_NAME: Record<LearnLanguage, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  typescript: 'TypeScript (avoid enums and namespaces; use union types)',
  lua: 'Lua 5.3 (like Roblox Luau without type annotations)',
  sql: 'SQLite SQL'
}
// Prompt text passed to input() is printed too, which would make the expected output awkward to match.
const IO: Record<LearnLanguage, string> = {
  python: 'reads input with input() — called with NO prompt text — and prints with print()',
  javascript: 'reads input with prompt() — called with NO question text, it returns a string — and prints with console.log()',
  lua: 'reads input with io.read() and prints with print()',
  typescript: 'reads input with prompt() — called with NO question text, it returns a string | null — and prints with console.log()',
  sql: 'runs SQL statements against a sample database (tables students(id, name, grade, house, age), scores(student_id, subject, score), products(id, name, category, price, stock), orders(id, product_id, player, quantity)); every SELECT prints a result table'
}

/** Text between <tag> and </tag>, with any Markdown code fence removed. */
function tag(text: string, name: string): string | undefined {
  const m = text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'))
  if (!m) return undefined
  const body = m[1].replace(/^\s*\n/, '').replace(/\s+$/, '')
  const fenced = body.match(/^\s*```[\w+-]*\n([\s\S]*?)\n?```\s*$/)
  return fenced ? fenced[1] : body
}

function tests(text: string, graphics: boolean): LearnTest[] {
  const out: LearnTest[] = []
  for (const m of text.matchAll(/<test(?:\s+label="([^"]*)")?>([\s\S]*?)<\/test>/gi)) {
    const label = m[1] || `Test ${out.length + 1}`
    const body = m[2].replace(/^\n/, '').replace(/\n$/, '')
    if (graphics) {
      let events: GraphicsEvent[] = []
      try {
        const parsed = JSON.parse(body.trim() || '[]')
        events = Array.isArray(parsed) ? parsed : []
      } catch {
        events = []
      }
      out.push({ label, events })
    } else out.push({ label, stdin: body })
  }
  return out.length ? out : [{ label: graphics ? 'Your drawing matches the goal' : 'Output matches' }]
}

interface GenerateRequest {
  language: LearnLanguage
  kind: RunKind
  topic: string
  level: string
  recentTitles: string[]
}

async function generateExercise(agent: Agent, req: GenerateRequest): Promise<Exercise> {
  const graphics = req.kind === 'graphics'
  const lang = LANG_NAME[req.language]
  const system = 'You write short, fun programming exercises for a beginner-friendly learning app. You reply using exactly the XML-style tags requested, with no other text.'
  let feedback = ''
  let lastProblem = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const prompt = `Write one ${lang} ${graphics ? 'graphics' : 'console'} exercise.
Topic: ${req.topic || 'practice what the learner has studied so far'}
Learner level: ${req.level}
Avoid repeating: ${req.recentTitles.join('; ') || 'nothing yet'}
${graphics ? `\n${GRAPHICS_CHEATSHEET[req.language]}\n` : `\nThe program ${IO[req.language]}.\n`}
Reply in exactly this format (raw code inside the tags, no JSON):

<title>Short title</title>
<prompt>
Instructions in Markdown. Be exact about ${graphics ? 'positions, sizes and colors' : 'the output text and format'} so only one answer is correct.
</prompt>
<starter>
Starter code with comments that guide the learner. It must NOT already solve the task.
</starter>
<solution>
The complete, working ${lang} solution (5-20 lines).
</solution>
${
  graphics
    ? `<test label="Initial drawing">[]</test>
(Only if the program uses event handlers, add more tests whose body is a JSON array of events, e.g.
<test label="Click at (100, 100)">[{"type": "mousePress", "x": 100, "y": 100}]</test>
Event types: mousePress/mouseRelease/mouseMove/mouseDrag with x, y; keyPress/keyRelease with key; step with count.)`
    : `<test label="Example 1">the exact text the user types, one line per input() call (leave empty if the program reads nothing)</test>
<test label="Example 2">different input</test>`
}
<hint>A gentle first hint</hint>
<hint>A more specific hint</hint>${feedback}`
    const text = await agent.ask(system, prompt, 4000)
    const title = tag(text, 'title')
    const solution = tag(text, 'solution')
    const body = tag(text, 'prompt')
    if (!solution || !body) {
      lastProblem = 'the reply was missing the <prompt> or <solution> tag'
      feedback = '\n\nYour last reply was missing the <prompt> or <solution> tag. Use every tag exactly as shown.'
      continue
    }
    const ex: Exercise = {
      id: `ai-${Date.now()}`,
      title: title || 'Challenge',
      kind: req.kind,
      prompt: body.replace(/^\s*Instructions in Markdown[^\n]*\n/i, ''),
      starter: tag(text, 'starter') ?? '',
      solution,
      tests: tests(text, graphics),
      hints: Array.from(text.matchAll(/<hint>([\s\S]*?)<\/hint>/gi)).map((m) => m[1].trim()),
      points: 2
    }
    // Only hand out challenges whose own solution runs cleanly.
    const check = await collect({ language: req.language, kind: req.kind, code: ex.solution }, ex.tests)
    const failed = check.results.find((r) => r.error)
    if (failed) {
      lastProblem = `its solution failed: ${failed.error}`
      feedback = `\n\nYour previous solution crashed when run:\n${failed.error}\nWrite a corrected exercise.`
      continue
    }
    if (graphics ? !check.results[0]?.scene?.shapes.length : !check.results.some((r) => r.output.trim())) {
      lastProblem = graphics ? 'its solution drew nothing' : 'its solution printed nothing'
      feedback = `\n\nYour previous solution ${graphics ? 'drew nothing on the canvas' : 'printed nothing'}. Write one that does.`
      continue
    }
    return ex
  }
  throw new Error(`The AI couldn't produce a working challenge (${lastProblem}). Try again, or pick a stronger model in Settings → Models.`)
}

export function registerLearnIpc(agent: Agent, send: (channel: string, ...args: unknown[]) => void): void {
  ipcMain.handle('learn:runtimes', () => detectRuntimes())
  ipcMain.handle('learn:run', (_e, id: string, req: RunRequest) => {
    startRun(id, req, (msg) => send('learn:event', id, msg))
  })
  ipcMain.on('learn:send', (_e, id: string, ev: GraphicsEvent) => sendEvent(id, ev))
  ipcMain.on('learn:stdin', (_e, id: string, text: string) => sendStdin(id, text))
  ipcMain.handle('learn:stop', (_e, id: string) => stopRun(id))
  ipcMain.handle('learn:collect', (_e, req: RunRequest, tests: LearnTest[]) => collect(req, tests))
  ipcMain.handle('learn:progress:get', () => loadProgress())
  ipcMain.handle('learn:progress:save', (_e, p: LearnProgress) => writeFileSync(progressFile(), JSON.stringify(p)))
  ipcMain.handle('learn:generate', (_e, req: GenerateRequest) => generateExercise(agent, req))
  ipcMain.handle('learn:hint', async (_e, req: { language: LearnLanguage; kind?: RunKind; prompt: string; code: string; problem: string }) => {
    const system =
      'You are a warm, patient coding tutor for beginners. Give ONE short hint (at most 3 sentences) that helps the learner take the next step. Never write the full solution or more than one line of code. Point at the specific line or idea that is wrong.'
    const context = req.kind === 'graphics' ? `\n\nThe program uses this library:\n${GRAPHICS_CHEATSHEET[req.language] ?? ''}` : ''
    return agent.ask(
      system,
      `Language: ${LANG_NAME[req.language]}${context}\n\nExercise:\n${req.prompt}\n\nLearner's code:\n\`\`\`\n${req.code}\n\`\`\`\n\nWhat went wrong when checking: ${req.problem || 'nothing ran yet'}`,
      1500
    )
  })
}

export { stopAllRuns }
