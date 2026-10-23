import type { SlashCommand } from '@shared/types'

export const BUILTIN_COMMANDS: SlashCommand[] = [
  { name: 'plan', description: 'Plan the implementation before writing code', mode: 'plan', template: 'Create an implementation plan for: $ARGUMENTS' },
  {
    name: 'debug',
    description: 'Find the root cause of a bug and fix it',
    template:
      'Debug this systematically: reproduce the problem, isolate where it happens, explain the root cause, then fix it and verify the fix (run the build/tests if they exist).\n\nProblem: $ARGUMENTS'
  },
  { name: 'fix', description: 'Fix errors in the current file or selection', template: 'Fix the problems in the code I am looking at (see the attached context). Explain each fix briefly and verify it compiles/passes tests if you can. $ARGUMENTS' },
  { name: 'explain', description: 'Explain code, a file or a concept', mode: 'ask', template: 'Explain clearly how this works, from the big picture down to the important details: $ARGUMENTS' },
  { name: 'refactor', description: 'Refactor for readability without changing behaviour', template: 'Refactor the relevant code for clarity and maintainability without changing its behaviour. Keep the public API stable and run the tests afterwards. $ARGUMENTS' },
  { name: 'test', description: 'Write and run tests', template: "Write tests for: $ARGUMENTS\n\nDetect the project's existing test framework and conventions first (and use them), cover edge cases and failure paths, then run the tests and fix any failures." },
  { name: 'review', description: 'Review the current changes for bugs and risks', mode: 'ask', template: 'Review my current uncommitted changes (use `git diff` and `git status`). Look for bugs, security issues, performance problems and missing edge cases. List findings by severity with file:line and a suggested fix. $ARGUMENTS' },
  { name: 'security', description: 'Security audit of the code', mode: 'ask', template: 'Do a security review of $ARGUMENTS (or the whole project if nothing is specified): injection, auth, secrets, unsafe input handling, dependency risks. Rank findings by severity with file:line.' },
  { name: 'optimize', description: 'Find and fix performance problems', template: 'Find performance problems in $ARGUMENTS, explain the cost of each, and fix the ones worth fixing. Measure before/after if possible.' },
  { name: 'docs', description: 'Write documentation or a README', template: 'Write clear documentation for $ARGUMENTS. Match the existing docs style; include usage examples.' },
  { name: 'search', description: 'Search the web and summarize', mode: 'ask', template: 'Search the web for: $ARGUMENTS\n\nRead the most relevant sources and give a concise, accurate summary with links.' },
  { name: 'web', description: 'Read a web page and answer questions about it', mode: 'ask', template: 'Fetch and read this page, then summarize it or answer my question: $ARGUMENTS' },
  { name: 'practices', description: 'Show best practices for a language or topic', mode: 'ask', template: 'Load the best-practices guide for "$ARGUMENTS" with get_best_practices and give me the most important points, with short examples.' },
  { name: 'commit', description: 'Write a commit message and commit', template: 'Look at `git status` and `git diff`, then write a concise commit message in the style of the existing history (`git log --oneline -10`) and commit the changes. Do not push. $ARGUMENTS' },
  { name: 'init', description: 'Create an AGENTS.md describing this project', template: 'Explore this codebase and create an AGENTS.md at the root that helps an AI agent work here: what the project is, how to install, build, run and test it, the architecture and key folders, and the coding conventions you observe. Keep it concise. $ARGUMENTS' },
  { name: 'new', description: 'Scaffold a new project or feature', template: 'Scaffold this: $ARGUMENTS\n\nPick a sensible, current stack (check the latest versions on the web if unsure), create the files, install dependencies, and make sure it builds and runs.' },
  { name: 'clear', description: 'Start a new chat', action: 'clear' },
  { name: 'model', description: 'Switch model, e.g. /model claude-opus-5-5', action: 'model' },
  { name: 'mode', description: 'Switch mode: agent, ask or plan', action: 'mode' },
  { name: 'settings', description: 'Open settings', action: 'settings' },
  { name: 'terminal', description: 'Toggle the terminal', action: 'terminal' },
  { name: 'help', description: 'List commands and shortcuts', action: 'help' }
]
