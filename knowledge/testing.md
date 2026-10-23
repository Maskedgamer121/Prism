# Testing best practices

- Use the project's existing framework and layout. Common defaults: Vitest/Jest (JS/TS), pytest (Python), `go test`, `cargo test`, xUnit/NUnit (.NET), JUnit 5 (Java), Playwright (E2E web).
- Test behavior through public interfaces, not implementation details. A refactor that keeps behavior should not break tests.
- Arrange–Act–Assert; one behavior per test; descriptive names (`returns 404 when the user does not exist`).
- Cover: happy path, edge cases (empty, zero, max, unicode, duplicates), error paths, and every bug you fix (regression test first — watch it fail).
- Deterministic tests: control time (fake timers / injectable clock), randomness (seed), network (mock at the boundary: MSW, `responses`, `httptest`), and the filesystem (temp dirs).
- Mock only what you don't own or what is slow/non-deterministic. Prefer fakes and real in-memory implementations over deep mock chains.
- Test pyramid: many fast unit tests, fewer integration tests (real DB via containers/Testcontainers or SQLite), a few end-to-end smoke tests.
- Keep tests fast and independent (no ordering dependencies, no shared mutable state). Clean up resources.
- Table/parameterized tests for many input/output pairs.
- Coverage is a guide, not a target; untested critical paths matter more than the percentage.
- Run the full suite before declaring work done; if a test is flaky, fix or quarantine it with a ticket — never just retry until green.
