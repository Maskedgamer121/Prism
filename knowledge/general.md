# General engineering practices

## Before changing code
- Read the code you're changing and its callers. Find the project's conventions (formatter config, lint rules, existing patterns) and follow them over personal preference.
- Find how the project builds, runs and tests (package.json scripts, Makefile, pyproject, README, CI config) before you need it.
- Reproduce a bug before fixing it; fix the root cause, not the symptom.

## Writing code
- Small, focused functions with descriptive names. Names say *what*, comments say *why* (only when it isn't obvious).
- Handle errors where you can do something useful; otherwise let them propagate with context. Never swallow errors silently.
- Validate input at boundaries (user input, network, files, env vars). Trust internal calls.
- Prefer pure functions and immutable data where practical; isolate side effects (I/O, globals, time, randomness).
- Don't duplicate logic — but don't abstract before there are 2–3 real uses.
- Keep public APIs stable; when changing one, update every caller.
- No secrets in code or logs. Read them from env vars or a secret store.
- Use the standard library and well-maintained, popular dependencies; check a dependency's maintenance and license before adding it. Pin versions with a lockfile.
- Make the smallest change that solves the task. Don't reformat unrelated code — it hides the real diff.

## Verifying
- Run the build/type checker, linter and tests after changes. Add a test that fails without your fix.
- Test the unhappy paths: empty input, nulls, huge input, concurrency, network failure, permission errors.
- If you can't verify something, say so explicitly.

## Performance
- Measure before optimizing. Watch for N+1 queries, work inside loops that could be hoisted, unbounded memory growth, blocking I/O on hot paths.
- Choose the right data structure (maps/sets for lookups) before micro-optimizing.

## Communication
- Commit messages: imperative summary line (≤72 chars), body explains why.
- Leave the codebase a little clearer than you found it, without scope creep.
