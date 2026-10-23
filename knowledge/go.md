# Go best practices

- Format with `gofmt`/`goimports`; vet with `go vet` and `staticcheck`/`golangci-lint`. Modules with `go.mod`; keep `go.sum` committed.
- Errors are values: check every error immediately; wrap with context `fmt.Errorf("load config: %w", err)`; inspect with `errors.Is` / `errors.As`. Don't panic for expected failures.
- Small interfaces defined by the consumer ("accept interfaces, return structs"). `io.Reader`/`io.Writer` are the model.
- Pass `context.Context` as the first parameter of anything that does I/O or may block; respect cancellation; never store contexts in structs.
- Concurrency: goroutines + channels or `sync.WaitGroup`/`errgroup.Group`. Every goroutine needs a clear exit path (no leaks). Protect shared state with `sync.Mutex`. Run tests with `-race`.
- Zero values should be useful; constructors `NewX(...)` when invariants are needed.
- Naming: short, clear, `MixedCaps`; exported = capitalized; package names lowercase singular, no `util`/`common` dumping grounds.
- `defer` for cleanup right after acquiring a resource (`defer f.Close()`), but not inside long loops.
- Table-driven tests with `t.Run` subtests; `httptest` for HTTP; `t.TempDir()` for files.
- Standard library first (`net/http` with the 1.22+ router patterns, `log/slog` for structured logging, `encoding/json`).
- Avoid global mutable state; inject dependencies.
