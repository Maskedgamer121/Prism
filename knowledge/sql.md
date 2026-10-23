# SQL & database best practices

- **Always parameterize queries** (`WHERE id = $1` / `?`). Never concatenate user input into SQL.
- Schema: primary key on every table, foreign keys with appropriate `ON DELETE`, `NOT NULL` by default, `CHECK`/`UNIQUE` constraints to enforce invariants in the database.
- Types: `timestamptz` (Postgres) in UTC for times, `numeric`/integer cents for money, `uuid` or `bigint identity` keys, `text` over `varchar(n)` in Postgres unless a limit is a real rule.
- Migrations in version control (Prisma, Drizzle, Alembic, Flyway, EF migrations); never edit a migration that has run in production; make them backwards-compatible for zero-downtime deploys (add column → backfill → switch → drop).
- Index columns used in `WHERE`, `JOIN` and `ORDER BY`; composite index column order matters (equality first, then range). Check plans with `EXPLAIN ANALYZE`. Don't over-index write-heavy tables.
- Select only the columns you need (no `SELECT *` in application code). Paginate with keyset pagination (`WHERE id > $last ORDER BY id LIMIT 50`) for large tables.
- Avoid N+1: fetch related rows with `JOIN`s or `IN (...)` batches.
- Use transactions for multi-statement changes; keep them short. Choose isolation level deliberately; use `SELECT … FOR UPDATE` or optimistic locking (version column) for read-modify-write.
- Use CTEs for readability, window functions for rankings/running totals, `UPSERT` (`INSERT … ON CONFLICT`) instead of check-then-insert races.
- Formatting: uppercase keywords, one clause per line, meaningful aliases.
- Least privilege: the app's DB user shouldn't own the schema or have superuser rights. Back up and test restores.
