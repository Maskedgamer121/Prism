# C# / .NET best practices (incl. Unity)

## Language (C# 12+ / .NET 8+)
- Enable nullable reference types (`<Nullable>enable</Nullable>`) and treat warnings as errors. Respect `?` annotations instead of using `!`.
- File-scoped namespaces, `var` when the type is obvious, records for immutable data (`public record User(string Name, int Age);`), primary constructors, pattern matching (`switch` expressions, `is not null`).
- `async`/`await` all the way down; return `Task`/`ValueTask`; never `.Result`/`.Wait()` (deadlocks); accept and pass `CancellationToken`. `ConfigureAwait(false)` in libraries.
- Dispose `IDisposable` with `using` declarations. Use `IAsyncDisposable` with `await using`.
- LINQ for clarity, but avoid multiple enumeration of `IEnumerable` and LINQ in hot loops.
- Exceptions for exceptional cases; specific exception types; don't catch `Exception` unless at a top-level boundary that logs.
- Naming: `PascalCase` types/methods/properties, `camelCase` locals/params, `_camelCase` private fields, `I` prefix for interfaces, `Async` suffix for async methods.

## ASP.NET Core
- Dependency injection with appropriate lifetimes (singleton/scoped/transient); options pattern for config; `ILogger<T>` structured logging.
- Minimal APIs or controllers consistently; validate input; return `ProblemDetails` for errors. EF Core: `AsNoTracking` for reads, migrations in source control, avoid N+1 with `Include`/projections.
- Tests: xUnit + FluentAssertions; `WebApplicationFactory` for integration tests.

## Unity
- Cache component references in `Awake` (`GetComponent` once, not every frame). Avoid `Find*` methods at runtime.
- Physics in `FixedUpdate`, input/visuals in `Update`, camera follow in `LateUpdate`. Use `Time.deltaTime` / `Time.fixedDeltaTime`.
- `[SerializeField] private` fields instead of public fields. ScriptableObjects for shared config/data.
- Avoid allocations in `Update` (no LINQ, string concat, `new` lists per frame); pool frequently spawned objects (`UnityEngine.Pool.ObjectPool`).
- Coroutines or `async` with `Awaitable` (Unity 2023+) for sequencing; stop them on disable.
- Compare tags with `CompareTag`, not `tag ==`. Use the new Input System. Keep scenes and prefabs in source control with Force Text serialization.
