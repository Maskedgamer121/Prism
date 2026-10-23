# Rust best practices

- Tooling: `cargo fmt`, `cargo clippy -- -D warnings`, `cargo test`, `cargo doc`. Pin the toolchain with `rust-toolchain.toml` if the project does.
- Ownership: borrow (`&T`, `&mut T`) by default; take ownership when you store or consume. Accept `&str` / `&[T]` / `impl AsRef<Path>` in parameters; return owned types.
- Avoid `.clone()` to silence the borrow checker — restructure instead; clone only when you need an independent copy.
- Errors: return `Result<T, E>`; use `?`. Libraries: define error enums with `thiserror`. Applications: `anyhow::Result` with `.context("what failed")`.
- Never `unwrap()`/`expect()` on recoverable errors in library or production code; `expect("reason")` only for true invariants.
- Use `Option` combinators (`map`, `and_then`, `unwrap_or_else`, `ok_or`) and `if let` / `let … else`.
- Enums + exhaustive `match` to model state. Newtypes for domain values (`struct UserId(u64);`).
- Iterators over index loops; `collect::<Result<Vec<_>, _>>()` to short-circuit errors.
- Derive common traits (`Debug, Clone, PartialEq, Eq, Hash, Default`) where meaningful; implement `Display` for user-facing types.
- Concurrency: `Arc<Mutex<T>>`/`RwLock` sparingly; prefer message passing (channels). Async: tokio, don't block inside async (use `spawn_blocking`), don't hold a `std::sync::Mutex` guard across `.await`.
- `unsafe` only with a `// SAFETY:` comment explaining the invariant; keep unsafe blocks tiny.
- Serialization with serde (`#[derive(Serialize, Deserialize)]`, `#[serde(rename_all = "camelCase")]`). CLIs with clap derive. HTTP with reqwest/axum.
- Tests: unit tests in `#[cfg(test)] mod tests`, integration tests in `tests/`, doc tests in examples.
