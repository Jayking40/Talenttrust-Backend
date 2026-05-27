# Database Migration Authoring

`src/db/database.ts` opens SQLite and immediately calls `runMigrations()` before
the application serves requests. The migration runner records every applied
migration in `schema_version` with its version, name, checksum, and timestamp.

## Rules

- Append new migrations to `MIGRATIONS` in `src/db/migrations.ts`.
- Use contiguous versions starting at `1`; do not reorder migrations.
- Never edit the `name` or `up` body of a migration after it has been merged or
  applied. Add a new migration instead.
- Keep migrations deterministic and free of secrets, environment-specific data,
  network calls, or user input.
- Write migrations so they are safe to run once in production and easy to test
  against an empty SQLite database.

## Checksum Verification

On startup, the runner verifies that every applied migration still matches the
recorded checksum. If a migration is missing, renamed, reordered, or edited, the
process fails fast instead of applying more schema changes on an untrusted
history.

Older databases whose `schema_version` table lacks checksums are upgraded by
adding the checksum column and backfilling checksums for known applied
migrations. After that, any mismatch aborts startup.

## Transaction Behavior

Each pending migration runs inside a single SQLite transaction together with its
`schema_version` insert. If the migration throws, all DDL/DML from that migration
is rolled back and the migration is not recorded.

## Security Notes

- Migration SQL is static application code, not request input.
- Application authentication, signature verification, and authorization happen
  outside the migration layer.
- Do not log secrets from migrations; schema changes should not contain secret
  values.
- Idempotency is provided by the `schema_version` table and checksum checks.
