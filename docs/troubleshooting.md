# Troubleshooting

## better-sqlite3 binding issues

**Symptom:** Error about missing native bindings when starting the app, such as:

```
Error: Could not locate the bindings file
```

**Cause:** Native modules need to be compiled for your platform and Node.js version.

**Solution:**

```bash
# Rebuild native modules
pnpm rebuild better-sqlite3

# Or reinstall everything from scratch
rm -rf node_modules
pnpm install
```

If using Docker, ensure the build stage uses the same Node.js version as the runtime stage.

## Database locked errors

**Symptom:** `SqliteError: database is locked`

**Cause:** SQLite only supports one writer at a time. This usually happens when multiple processes try to write simultaneously, or a long-running transaction holds the lock.

**Solution:**

- Ensure only one instance of the app is running against the same database file.
- If using Docker, make sure no other container or process is accessing the same database volume.
- If the error persists after stopping all processes, delete any `-wal` or `-shm` journal files alongside the database:

```bash
rm -f data/credittimeline.db-wal data/credittimeline.db-shm
```

## Port already in use

**Symptom:** `EADDRINUSE: address already in use :::3000`

**Cause:** Another process is using the same port.

**Solution:**

```bash
# Find what is using port 3000
lsof -i :3000

# Kill the process, or use a different port
PORT=3001 pnpm dev
```

For Docker, change the host-side port mapping:

```bash
docker run -p 3001:3000 ctview
```

## DDL hash mismatch (schema changed)

**Symptom:** The app detects a schema change on startup and recreates the database, or a backup restore fails with a DDL hash validation error.

**Cause:** The database schema definition has changed since the database was created. The app tracks a hash of the DDL and detects when it diverges.

**Solution:**

If you want to start fresh (development):

```bash
pnpm db:reset
```

If you need to preserve data, export it first via the JSON export endpoint, reset, then re-ingest:

```bash
# Export
curl -o backup.json 'http://localhost:3000/api/v1/export/json?fileId=<your-file-id>'

# Reset
pnpm db:reset

# Start the app and re-ingest
pnpm dev
curl -X POST http://localhost:5173/api/v1/ingest \
  -H 'Content-Type: application/json' -d @backup.json
```

## Rate limiting (429 responses)

**Symptom:** `POST /api/v1/ingest` returns HTTP 429 with error code `RATE_LIMITED`.

**Cause:** The ingestion endpoint is rate-limited to prevent abuse. The default is 30 requests per minute.

**Solution:**

- Wait for the rate limit window to reset (1 minute).
- Increase the limit via the `RATE_LIMIT_INGEST_RPM` environment variable:

```bash
RATE_LIMIT_INGEST_RPM=100 pnpm dev
```

- Set to `0` to disable rate limiting entirely (not recommended for production).

## CORS issues

**Symptom:** Browser console shows `Access-Control-Allow-Origin` errors when calling the API from a different domain.

**Cause:** By default, the API does not send CORS headers (same-origin only).

**Solution:**

Set the `CORS_ALLOW_ORIGIN` environment variable:

```bash
# Allow all origins (development only)
CORS_ALLOW_ORIGIN='*' pnpm dev

# Allow a specific origin
CORS_ALLOW_ORIGIN='https://myapp.example.com' pnpm dev
```

## Backup restore failures

**Symptom:** `POST /api/v1/restore` returns a validation error.

**Possible causes and solutions:**

1. **DDL hash mismatch:** The backup was created with a different schema version. You can only restore backups that match the current schema. If the schema has changed, you need to export data via JSON and re-ingest instead.

2. **BACKUP_DIR not configured:** The `BACKUP_DIR` environment variable must be set for backup/restore to work:

```bash
BACKUP_DIR=./backups pnpm dev
```

3. **File not found:** The `backupFile` value in the request body must be a filename (not a full path) that exists in the configured `BACKUP_DIR`.

## Empty dashboard or missing data

**Symptom:** The dashboard shows all zeros or endpoints return empty results.

**Cause:** No data has been ingested yet.

**Solution:**

Ingest a credit file:

```bash
curl -X POST http://localhost:5173/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -d @spec/examples/credittimeline-file.v1.example.json
```

## Node.js version mismatch

**Symptom:** Various cryptic errors during install or startup.

**Cause:** The project requires Node.js 22 or later.

**Solution:**

```bash
node --version  # Should be >= 22

# If using nvm
nvm install 22
nvm use 22
```
