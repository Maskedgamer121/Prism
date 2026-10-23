# React best practices (React 19 era)

## Components
- Function components + hooks only. Components are pure functions of props and state — no side effects during render.
- Keep components small; lift state only as high as needed. Colocate state with where it's used.
- Derive values during render instead of syncing them into state with `useEffect`. If it can be computed from props/state, compute it.
- Stable, unique `key`s from data IDs — never array indexes for lists that reorder.
- Composition over configuration: pass `children` / render props instead of growing boolean props.

## Effects
- `useEffect` is for synchronizing with external systems (subscriptions, timers, DOM APIs, network). Always return a cleanup.
- Fetching data: prefer the framework's data layer (Next.js server components/route loaders, React Router loaders) or TanStack Query, over hand-rolled `useEffect` fetches. If you do fetch in an effect, handle races with an `ignore` flag or `AbortController`.
- Include every reactive value in dependency arrays; fix the design rather than silencing the lint rule.

## State
- `useState` for local UI state, `useReducer` for complex transitions, context for rarely-changing values (theme, auth). Use a store (Zustand, Redux Toolkit, Jotai) for frequently-updated shared state.
- Never mutate state; create new objects/arrays.
- Forms: controlled inputs for small forms; React Hook Form + zod for larger ones. In React 19, `<form action>` + `useActionState` / `useFormStatus` for server-action style forms.

## Performance
- Measure with the React Profiler first. The React Compiler (if enabled) handles most memoization; otherwise use `useMemo`/`useCallback`/`memo` only for proven hot spots or referential stability.
- Virtualize long lists (TanStack Virtual). Code-split routes with `lazy` + `Suspense`.

## Next.js (App Router)
- Server Components by default; add `'use client'` only for interactivity. Keep secrets and data access on the server.
- Use `fetch` caching/revalidation options or `unstable_cache` deliberately; mutate via Server Actions and `revalidatePath`/`revalidateTag`.
- `next/image`, `next/font`, metadata API for SEO.

## Accessibility & styling
- Semantic HTML first (`button`, `label`, `nav`); every interactive element keyboard-reachable; images have `alt`.
- Styling: follow the repo (Tailwind, CSS Modules, styled-components). Don't mix systems.

## Testing
- React Testing Library: test behavior through the DOM the way users do (`getByRole`), not implementation details. Playwright for end-to-end.
