# JavaScript best practices

- Modern syntax: ES modules, `const`/`let`, arrow functions, destructuring, spread, optional chaining, `??`, template literals, `Array.prototype.at`, `structuredClone`, `Object.groupBy`.
- Strict equality `===` everywhere. Beware falsy traps: use `??` when `0`, `''` or `false` are valid values.
- Prefer `for…of` over `forEach` when you need `await`, `break` or `return`. Never `await` inside `.forEach` (it doesn't wait).
- `async/await` with `try/catch` at the boundary; never leave a promise floating — `await` it, return it, or explicitly `void` it with error handling.
- Don't mutate function arguments; return new objects/arrays (`toSorted`, `toReversed`, `with`).
- Use `Map`/`Set` for dynamic keys and membership checks instead of plain objects.
- Dates: store/transmit ISO strings or epoch ms in UTC; format with `Intl.DateTimeFormat`. Numbers/currency with `Intl.NumberFormat`. Money in integer cents.
- DOM: `textContent` instead of `innerHTML` for untrusted data. Delegate events for long lists. Debounce input handlers.
- `fetch`: check `res.ok` before `res.json()`; use `AbortController` / `AbortSignal.timeout()` for timeouts and cancellation.
- Avoid premature micro-optimizations; avoid huge synchronous loops on the main thread (use workers).
- Add JSDoc types (`// @ts-check`) in JS-only projects for editor type checking, or migrate to TypeScript.
- Package management: commit the lockfile; use the package manager the repo uses (npm/pnpm/yarn/bun — look for the lockfile).

## Vue / Svelte quick notes
- Vue 3: Composition API with `<script setup lang="ts">`, `ref`/`computed`, props via `defineProps<T>()`, Pinia for shared state.
- Svelte 5: runes (`$state`, `$derived`, `$effect`, `$props`); keep effects for side effects only, derive everything else.
