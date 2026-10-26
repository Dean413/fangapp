# Known issues and loose ends

Found while documenting the codebase.

## Planned

- `/profile/community` shows hard-coded sample data (topics, members, a fixed like count) and
  `/profile/live-chat` has topic buttons that do nothing; neither talks to the server yet. Both pages
  will be built soon.

## Bigger projects

- No database migrations; `production_schema_current.sql` (schema dump) is the only record of the schema
  and has to be re-dumped by hand after changes. The database is shared with FangWriters, so agree which
  app owns schema changes first.
- No automated tests. The money code (`unlockChapter`, `creditPayment`, `creditVipPeriod`,
  `claimCheckin`) is the place to start.
