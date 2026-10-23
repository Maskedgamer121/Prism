# Python best practices

## Project & tooling
- Python 3.11+ for new projects. Manage envs and deps with `uv` (fast; `uv init`, `uv add`, `uv run`) or the tool the repo already uses (poetry, pip-tools). Always use a virtual environment; never install into system Python.
- `pyproject.toml` for config. Lint + format with Ruff (`ruff check --fix`, `ruff format`). Type-check with mypy or pyright.
- Test with pytest; use fixtures and `parametrize`; `tmp_path` for files; `monkeypatch` for env.

## Style
- PEP 8 naming: `snake_case` functions/vars, `PascalCase` classes, `UPPER_CASE` constants. Max clarity over cleverness.
- Type hints on all public functions: `def load(path: Path) -> dict[str, Any]:`. Use built-in generics (`list[int]`, `dict[str, X]`) and `X | None`.
- f-strings for formatting; `pathlib.Path` for paths; `with` for every file/lock/connection.
- Dataclasses (`@dataclass(slots=True, frozen=True)`) or Pydantic models for structured data instead of loose dicts. Pydantic for validating external input.
- Comprehensions for simple transforms; plain loops when logic gets complex. Generators for large streams.
- `enumerate`, `zip(strict=True)`, `itertools`, `collections.Counter/defaultdict` instead of manual bookkeeping.

## Errors
- Catch specific exceptions; never bare `except:`. Re-raise with context: `raise ConfigError("bad config") from err`.
- Don't use exceptions for normal control flow in hot loops; don't return `None` to signal errors when an exception is clearer.
- Use `logging` (module-level `logger = logging.getLogger(__name__)`), not `print`, in libraries and services.

## Pitfalls
- Never use mutable default arguments (`def f(x=[])`); use `None` and create inside.
- `is` only for `None`/singletons; `==` for values.
- Floating point: `math.isclose`; money with `decimal.Decimal`.
- Timezones: `datetime.now(tz=UTC)`; store UTC.
- Don't build SQL or shell commands with string formatting — use parameters and `subprocess.run([...], check=True)` with a list.

## Async
- `asyncio` for I/O-bound concurrency; `asyncio.TaskGroup` (3.11+) for structured concurrency; `httpx.AsyncClient` for HTTP. Never call blocking I/O inside async functions (use `asyncio.to_thread`).
- CPU-bound work: `concurrent.futures.ProcessPoolExecutor`.

## Web/data
- FastAPI with Pydantic models and dependency injection; Django for batteries-included apps. Use `if __name__ == "__main__":` guards for scripts.
- pandas/polars: vectorize instead of row loops; be explicit about dtypes.
