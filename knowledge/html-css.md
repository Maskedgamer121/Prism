# HTML & CSS best practices

## HTML
- Semantic elements: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `button` (not clickable `div`s), `a` for navigation.
- `<!doctype html>`, `<html lang="…">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- Every `img` has meaningful `alt` (empty `alt=""` for decorative). Every input has a `<label>`. Headings in order (one `h1`).
- Forms: correct `type` (`email`, `number`, `tel`), `autocomplete` attributes, native validation (`required`, `pattern`) plus server validation.
- Load scripts with `type="module"` or `defer`. Lazy-load below-the-fold images (`loading="lazy"`) and give them `width`/`height` to avoid layout shift.

## CSS
- Use custom properties for design tokens (`--color-bg`, `--space-2`). Support dark mode with `prefers-color-scheme`.
- Layout with Flexbox (1D) and Grid (2D); avoid floats/absolute positioning for layout. Use `gap` instead of margins between children.
- Mobile-first responsive design with `min-width` media queries or container queries (`@container`). Fluid sizes with `clamp()`.
- `box-sizing: border-box` globally. Use `rem` for font sizes, respect user zoom.
- Low specificity: classes, not IDs; avoid `!important`. Use a naming convention (BEM) or scoped CSS (Modules, Tailwind) consistently.
- Modern features: nesting, `:has()`, `:is()/:where()`, logical properties (`margin-inline`), `aspect-ratio`, `dvh` units.
- Animations: animate `transform` and `opacity` only; respect `prefers-reduced-motion`.
- Focus styles must be visible (`:focus-visible`). Text contrast ≥ 4.5:1.

## Tailwind
- Compose utilities in markup; extract components (not `@apply` soup) for repetition; configure the theme instead of arbitrary values everywhere.
