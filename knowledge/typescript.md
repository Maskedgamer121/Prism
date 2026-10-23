# TypeScript best practices

## Compiler & tooling
- `"strict": true` always. Also valuable: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- Use the project's TS version and module settings; for bundlers prefer `"moduleResolution": "bundler"`, for Node ESM `"nodenext"`.
- Type-check in CI with `tsc --noEmit`; lint with typescript-eslint; format with Prettier/Biome (whatever the repo uses).

## Types
- Let inference work for locals; annotate function parameters, return types of exported functions, and public APIs.
- Prefer `unknown` over `any`. Narrow with type guards (`typeof`, `in`, `instanceof`, discriminants). If `any` is unavoidable, contain it in one place.
- Model state with discriminated unions instead of optional-field soup:
  ```ts
  type Result<T> = { ok: true; value: T } | { ok: false; error: string }
  ```
- Use `as const` for literal tuples/objects; `satisfies` to check a value against a type without widening it.
- Avoid non-null assertions (`!`) unless an invariant guarantees it; prefer an explicit check that throws a helpful error.
- `type` for unions/aliases, `interface` for object shapes that may be extended — be consistent with the codebase.
- Use `readonly` and `ReadonlyArray` for data that shouldn't change. Avoid `enum`; use string-literal unions or `as const` objects.
- Validate external data at runtime (zod, valibot, arktype) and derive the static type from the schema (`z.infer`).
- Exhaustiveness: in `switch` over a union, add `default: { const _x: never = value }` so new cases fail to compile.

## Code style
- `const` by default, `let` when reassigned, never `var`.
- `async/await` over `.then` chains; always handle rejections; use `Promise.all` for independent work and `Promise.allSettled` when partial failure is OK.
- Optional chaining `?.` and nullish coalescing `??` (not `||` when `0`/`''` are valid).
- Use ES modules; avoid default exports in libraries (named exports refactor better) unless the framework requires them.
- Errors: throw `Error` subclasses, never strings. Use `cause` for wrapping: `new Error('Failed to load config', { cause: err })`.

## Node specifics
- Use `node:` prefixed built-ins (`node:fs/promises`, `node:path`). Never block the event loop with sync I/O on hot paths.
- In ESM, `__dirname` doesn't exist: `path.dirname(fileURLToPath(import.meta.url))`.
- Read config from env once at startup and validate it.
