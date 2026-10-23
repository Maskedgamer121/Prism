# Security best practices

## Input & output
- Validate all external input (type, length, range, format) on the server with an allowlist approach. Client-side validation is UX only.
- Prevent injection: parameterized SQL, no shell string building (pass argument arrays), no `eval`/`exec` on user data, safe YAML/pickle loaders.
- Prevent XSS: rely on framework auto-escaping, avoid `dangerouslySetInnerHTML`/`innerHTML`/`v-html` with untrusted data; sanitize with DOMPurify if HTML is required; set a Content-Security-Policy.
- Path traversal: resolve user-supplied paths and verify they stay inside the allowed root.
- SSRF: validate/allowlist outbound URLs requested on behalf of users; block internal IP ranges.

## Auth
- Use proven libraries/providers (OAuth/OIDC, Auth.js, Clerk, Supabase Auth, ASP.NET Identity). Never roll your own crypto or password hashing — use Argon2id or bcrypt.
- Check authorization on every request server-side (object-level: "can *this* user access *this* record?").
- Sessions: `HttpOnly`, `Secure`, `SameSite` cookies; CSRF protection for cookie auth; short-lived tokens with rotation.
- Rate-limit login, signup, password reset and expensive endpoints.

## Secrets & data
- No secrets in source, logs, error messages, URLs or client bundles. Use env vars/secret managers; `.env` in `.gitignore`; rotate anything leaked.
- Encrypt in transit (TLS everywhere) and at rest for sensitive data; collect only what you need.
- Log security events without logging secrets or personal data.

## Dependencies & config
- Keep dependencies updated (Dependabot/Renovate), run `npm audit` / `pip-audit` / `cargo audit`, pin with lockfiles, and avoid abandoned or typosquatted packages.
- Secure defaults: debug off in production, least-privilege service accounts and DB users, restrictive CORS, security headers (HSTS, X-Content-Type-Options, frame-ancestors).

## Errors
- Fail closed. Show users generic errors; keep details in server logs.
