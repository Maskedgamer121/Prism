# Shell scripting (Bash & PowerShell)

## Bash
- Start with `#!/usr/bin/env bash` and `set -euo pipefail`. Use `shellcheck`.
- Quote every expansion: `"$var"`, `"${array[@]}"`. Use `[[ … ]]` for tests and `$(…)` for command substitution.
- `local` variables in functions; `readonly` for constants; uppercase only for exported env vars.
- Check commands exist with `command -v tool >/dev/null || { echo "need tool" >&2; exit 1; }`. Errors to stderr, meaningful exit codes.
- Temp files with `mktemp` and `trap 'rm -f "$tmp"' EXIT`. Never parse `ls`; use globs or `find -print0 | xargs -0`.
- Prefer `printf` over `echo` for anything non-trivial. Use `"$@"` to forward arguments.

## PowerShell (7+ preferred; Windows PowerShell 5.1 still common)
- Verb-Noun function names (`Get-Thing`), `[CmdletBinding()]` and typed `param()` blocks with validation attributes (`[ValidateNotNullOrEmpty()]`).
- `$ErrorActionPreference = 'Stop'` in scripts; `try { … } catch { … }` for terminating errors. Check native exit codes with `$LASTEXITCODE`.
- Objects, not text: pipe objects and use `Select-Object`, `Where-Object`, `ForEach-Object`, `Sort-Object`; format (`Format-Table`) only at the very end.
- Paths: `Join-Path`, `Test-Path`, `-LiteralPath` for paths with special characters. Quote paths with spaces.
- Environment variables: `$env:NAME`. Splatting (`@params`) for long command lines.
- Windows PowerShell 5.1 has no `&&`/`||`; use `;` or `if ($?)`. Use `-Encoding utf8` when writing files there.
- Never put secrets in scripts; use `SecretManagement` or env vars. Avoid `Invoke-Expression` on untrusted input.

## Cross-platform
- For cross-platform project scripts prefer package.json scripts, a Makefile/justfile, or Python/Node scripts over shell-specific syntax.
