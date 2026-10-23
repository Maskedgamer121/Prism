# API design best practices

## REST/HTTP
- Resource-oriented URLs with plural nouns (`/users/{id}/orders`); HTTP verbs for actions (GET read, POST create, PUT replace, PATCH partial update, DELETE remove). GET must be safe; PUT/DELETE idempotent.
- Correct status codes: 200/201 (with `Location`)/204, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 422 semantic errors, 429 rate limited, 5xx server faults.
- Consistent error body (RFC 9457 Problem Details: `type`, `title`, `status`, `detail`, plus field errors).
- Pagination (cursor-based for large/changing data), filtering and sorting via query params; return `next` cursors.
- Version the API (`/v1` or a header) and never break existing clients; additive changes only within a version.
- Idempotency keys for POSTs that create payments/orders. Timeouts and retries with exponential backoff + jitter on the client.
- Describe the API with OpenAPI; generate clients/types from it. Validate request and response schemas.
- Use ISO 8601 UTC timestamps, consistent casing (camelCase JSON or snake_case — pick one), and string IDs.
- Auth with bearer tokens/OAuth; never put secrets in query strings.

## GraphQL / RPC
- GraphQL: design the schema around client needs, use DataLoader to avoid N+1, limit query depth/complexity, paginate with connections.
- gRPC/tRPC: keep messages backward compatible (never reuse field numbers), deadlines on every call.
