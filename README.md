# Prism

An AI-first code editor in the spirit of Cursor. Bring your own model: **Claude** (API key or your Claude Code subscription), **Ollama**, **LM Studio**, or any **OpenAI-compatible** server.

## Run it

```bash
npm install
npm run dev        # hot-reload development
npm run build && npm start   # run the production build
npm run dist       # build the Windows installer into dist/
```

If `npm install` skipped Electron's download, run `node node_modules/electron/install.js`.

## Connecting models

Open **Settings → Models** (`Ctrl+,`) or click a provider card on the welcome screen.

| Provider | Setup |
|---|---|
| Claude Code (subscription) | Install the `claude` CLI and run it once to sign in. Prism finds it on `PATH` or in `~/.local/bin`. Claude Code runs its own tools; Prism shows them in the chat. |
| Claude (Anthropic API) | Paste an API key from console.anthropic.com. Keys are encrypted with the OS keychain (Electron `safeStorage`). Default model `claude-opus-5-5`. |
| Ollama | Start Ollama; models are listed automatically. For agent mode pick a tool-capable model (`qwen2.5-coder`, `qwen3`, `llama3.1`, `mistral-nemo`). Context size is set under Settings → Agent. |
| LM Studio | Start the local server (Developer tab, port 1234) and load a model with tool support. |
| OpenAI-compatible | Set the base URL and key (OpenAI, OpenRouter, Groq, DeepSeek, vLLM, llama.cpp…). Add as many as you like. |

## What the AI can do

The agent has the same kind of tools as Claude Code:

- `read_file`, `list_dir`, `glob`, `grep` — explore the project
- `edit_file`, `write_file` — change code (reviewed in the editor, see below)
- `run_command` — run builds, tests, git, package managers (PowerShell on Windows), with live output
- `web_search`, `web_fetch` — search the web and read pages; `render: true` loads JavaScript-heavy sites in a hidden browser
- `get_best_practices` — load guides from the knowledge base
- `update_plan` — show a live checklist while it works
- `open_file` — jump you to a file and line

**Permissions** (chat box or Settings → Agent): *Ask first* (approve every edit and command), *Auto-edit* (edits apply, commands ask), *Full auto*.

**Modes**: *Agent* (does the work), *Ask* (read-only Q&A), *Plan* (investigates, then writes a plan).

### Reviewing AI edits

Like Cursor, AI edits are applied to disk right away (so builds and tests see them) and then shown in the editor for review: added lines in green, removed lines in red, with **Accept** / **Reject** on each change. A bar over the file accepts or rejects the whole file and jumps between changed files, and the chat shows **Accept all / Reject all**. This works for Prism's own agent and for Claude Code.

Files auto-save one second after you stop typing (Settings → Editor → Auto save).

## Slash commands

Type `/` in the chat: `/plan`, `/debug`, `/fix`, `/explain`, `/refactor`, `/test`, `/review`, `/security`, `/optimize`, `/docs`, `/search`, `/web`, `/practices`, `/commit`, `/init`, `/new`, `/clear`, `/model`, `/mode`, `/settings`, `/terminal`, `/help`.

Make your own: add Markdown files to `.prism/commands/` (or `.claude/commands/`) in a project. The file name becomes the command; `$ARGUMENTS` is replaced by what you type after it.

Type `@` to attach files. Selected code is attached automatically.

## Learn tab

Switch between **Code** and **Learn** at the top of the window. Learn is a CMU CS Academy–style course system:

| Course | What you learn |
|---|---|
| Python Graphics | Drawings, animations and games with `Rect`, `Circle`, `Star`, `Label`, events and `onStep` |
| Python Basics | print, input, if, loops, functions, lists, dictionaries |
| Python Games | Drawing functions, lists of shapes, collisions, score, a full Pong |
| Python Intermediate | Slicing, comprehensions, sorting, try/except, classes, recursion |
| Problem Solving in Python | Palindromes, FizzBuzz, binary search, bubble sort, memoization |
| JavaScript Basics | `console.log`, `prompt()`, decisions, loops, functions, arrays, objects |
| JavaScript Graphics | The graphics library in JavaScript syntax |
| JavaScript Intermediate | map/filter/reduce, destructuring, classes, closures, JSON |
| TypeScript Basics | Types, typed functions, object types, unions, narrowing, generics (type errors are checked) |
| Lua for Roblox | Lua basics with Roblox Studio tips |
| Lua Intermediate | String patterns, closures, varargs, metatables and the Roblox module class pattern |
| SQL Basics | SELECT, WHERE, ORDER BY, aggregates, GROUP BY, JOIN, INSERT/UPDATE on a sample game/school database |

- Every lesson starts with **docs cards**: signature, every parameter with its default, properties, and a runnable example you can edit.
- **Checkpoints** inside lessons and **practice exercises** after them are graded automatically: graphics by comparing your drawing with the goal (after replaying clicks/keys/steps), console programs by comparing output for several inputs.
- **Hints**, an **AI hint** button and **Ask the tutor** (opens chat in Ask mode, told not to give away the answer).
- **AI challenges** generates new exercises at your level; each is only shown after its own solution runs successfully.
- **Docs + Colors** reference, a **Sandbox**, points, streaks and saved drafts.

Code runs locally: Python uses your installed Python 3 (`learn-runtime/prism_graphics.py` is the graphics library); JavaScript, TypeScript (Node's type stripping), SQL (Node's built-in SQLite) and Lua (fengari) run on Electron's built-in Node, so they need nothing installed. Programs that hang are stopped automatically.

Add a course by creating a `Track` in `src/renderer/src/learn/content/` and listing it in `content/index.ts`.

## Updates

Installed copies check [GitHub Releases](https://github.com/Maskedgamer121/Prism/releases) for new versions (Settings → About & updates, or Help → Check for Updates), download them in the background and install on restart.

To publish:

1. Bump `version` in `package.json` (`publish` in `electron-builder.yml` already points at `Maskedgamer121/Prism`).
2. Create a GitHub token with `repo` access and run:

```bash
GH_TOKEN=your_token npm run release
```

That builds the installer and uploads it, with the `latest.yml` that installed copies look for, to a GitHub release. Build without publishing with `npm run dist`.

## Knowledge base

`knowledge/*.md` holds best-practice guides (TypeScript, JavaScript, React, Python, Lua/Roblox Luau, C++/Unreal, C#/Unity, Rust, Go, Java/Kotlin, HTML/CSS, SQL, shell, testing, security, git, API design). Guides for a project's main languages are added to the system prompt automatically; the agent loads others on demand. Add or override guides in the custom folder (Settings → Knowledge → Open folder). Project rules in `AGENTS.md`, `CLAUDE.md`, `.cursorrules` or `.prism/rules.md` are always followed.

## Shortcuts

| Keys | Action |
|---|---|
| `Ctrl+K` | Edit selection inline with AI (Accept `Ctrl+Enter`, Reject `Esc`) |
| `Ctrl+L` | Add selection to chat |
| `Ctrl+I` | Toggle / focus AI chat |
| `Ctrl+Shift+L` | New chat |
| `Ctrl+P` / `Ctrl+Shift+P` | Go to file / command palette |
| `Ctrl+Shift+F` | Search in files |
| `Ctrl+Shift+G` | Source control |
| `Ctrl+J` or ``Ctrl+` `` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+S` | Save |

Tab autocomplete (ghost text) can be enabled under Settings → Tab autocomplete; a small local coder model in Ollama works best.

## Project layout

```
src/main/            Electron main process
  agent/             agent loop, tools, prompt, knowledge, web tools
  agent/providers/   anthropic.ts, claude-code.ts, ollama.ts, openai.ts
  settings.ts        settings + encrypted API keys
  terminal.ts, git.ts, workspace.ts
src/preload/         the window.prism IPC bridge
src/renderer/        React UI (Monaco editor, xterm terminal, chat)
src/shared/          types and diff utilities shared by both sides
knowledge/           bundled best-practice guides
```

## License

[MIT](LICENSE)
