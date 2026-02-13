# API Guide

All endpoints are served under `/api/v1/`. The interactive OpenAPI documentation is available at `/api/v1/docs` (Scalar UI) and the raw spec at `/api/v1/openapi.json`.

## Response Format

### Success responses

```json
{
  "data": { ... }
}
```

### Paginated list responses

```json
{
  "data": {
    "items": [ ... ],
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

### Error responses

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Description of the error",
    "details": [{ "message": "field-level error" }]
  }
}
```

### Error codes

| Code                | HTTP Status | Description                       |
| ------------------- | ----------- | --------------------------------- |
| `VALIDATION_FAILED` | 400         | Invalid input or query parameters |
| `NOT_FOUND`         | 404         | Resource does not exist           |
| `UNAUTHORIZED`      | 401         | Missing or invalid API key        |
| `DUPLICATE_IMPORT`  | 409         | Credit file already ingested      |
| `RATE_LIMITED`      | 429         | Too many requests                 |
| `NOT_READY`         | 503         | Database not available            |
| `INTERNAL_ERROR`    | 500         | Unexpected server error           |

### Pagination

List endpoints accept `limit` and `offset` query parameters:

| Parameter | Default | Range | Description              |
| --------- | ------- | ----- | ------------------------ |
| `limit`   | 50      | 1-200 | Number of items per page |
| `offset`  | 0       | 0+    | Number of items to skip  |

---

## Health and Status

### `GET /api/v1/health`

Liveness probe. Always returns 200 if the server is running.

```bash
curl http://localhost:3000/api/v1/health
```

```json
{ "data": { "status": "ok", "version": "0.1.0" } }
```

### `GET /api/v1/ready`

Readiness probe. Returns 200 if the database is reachable, 503 otherwise.

```bash
curl http://localhost:3000/api/v1/ready
```

```json
{ "data": { "status": "ready" } }
```

---

## Ingestion

### `POST /api/v1/ingest`

Ingest a credit timeline JSON file. Validates the payload, performs referential checks, and persists all entities to the database.

Protected by `INGEST_API_KEY` if configured. Rate limited (default: 30 requests/minute).

```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <key>' \
  -d @spec/examples/credittimeline-file.v1.example.json
```

**Success (201):**

```json
{
  "data": {
    "success": true,
    "fileId": "...",
    "importId": "...",
    "warnings": []
  }
}
```

**Validation failure (400):**

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Credit file validation failed",
    "details": [{ "message": "..." }]
  }
}
```

---

## Dashboard

### `GET /api/v1/dashboard`

Aggregated overview of all data in the system.

```bash
curl http://localhost:3000/api/v1/dashboard
```

```json
{
  "data": {
    "counts": {
      "tradelines": 12,
      "imports": 3,
      "searches": 8,
      "scores": 4,
      "publicRecords": 1,
      "addresses": 5,
      "fraudMarkers": 0,
      "disputes": 0,
      "insights": 6
    },
    "latestScores": [ ... ],
    "debtSummary": {
      "totalBalance": 15000,
      "totalCreditLimit": 30000,
      "openTradelineCount": 8
    },
    "recentImports": [ ... ]
  }
}
```

---

## Subjects

### `GET /api/v1/subjects`

List all credit subjects.

| Parameter | Type   | Description                  |
| --------- | ------ | ---------------------------- |
| `limit`   | number | Items per page (default: 50) |
| `offset`  | number | Skip count (default: 0)      |

```bash
curl 'http://localhost:3000/api/v1/subjects?limit=10'
```

### `GET /api/v1/subjects/:subjectId/summary`

Detailed summary for a specific subject.

```bash
curl http://localhost:3000/api/v1/subjects/subj-123/summary
```

```json
{
  "data": {
    "subjectId": "subj-123",
    "createdAt": "2024-01-15T10:00:00Z",
    "names": [{ "nameId": "...", "fullName": "John Smith", "nameType": "current" }],
    "activeTradelineCount": 5,
    "closedTradelineCount": 3,
    "publicRecordCount": 0,
    "fraudMarkerCount": 0,
    "latestScores": [ ... ],
    "lastImportAt": "2024-06-01T12:00:00Z",
    "insightCount": 4
  }
}
```

### `GET /api/v1/subjects/:subjectId/anomalies`

Anomaly data for a subject (insight counts by severity and recent insights).

```bash
curl http://localhost:3000/api/v1/subjects/subj-123/anomalies
```

```json
{
  "data": {
    "countBySeverity": { "warning": 2, "info": 4 },
    "recentInsights": [ ... ]
  }
}
```

---

## Tradelines

### `GET /api/v1/tradelines`

List tradelines with optional filters.

| Parameter      | Type   | Description                  |
| -------------- | ------ | ---------------------------- |
| `limit`        | number | Items per page (default: 50) |
| `offset`       | number | Skip count (default: 0)      |
| `subjectId`    | string | Filter by subject            |
| `accountType`  | string | Filter by account type       |
| `status`       | string | Filter by current status     |
| `sourceSystem` | string | Filter by source system      |

```bash
curl 'http://localhost:3000/api/v1/tradelines?subjectId=subj-123&status=active&limit=20'
```

### `GET /api/v1/tradelines/:tradelineId`

Full detail for a single tradeline, including identifiers, parties, terms, snapshots, events, and cross-agency peers.

```bash
curl http://localhost:3000/api/v1/tradelines/tl-456
```

### `GET /api/v1/tradelines/:tradelineId/metrics`

Monthly metric time series for a tradeline.

| Parameter    | Type   | Description                  |
| ------------ | ------ | ---------------------------- |
| `limit`      | number | Items per page (default: 50) |
| `offset`     | number | Skip count (default: 0)      |
| `metricType` | string | Filter by metric type        |
| `from`       | string | Start date (YYYY-MM-DD)      |
| `to`         | string | End date (YYYY-MM-DD)        |

```bash
curl 'http://localhost:3000/api/v1/tradelines/tl-456/metrics?from=2023-01-01&to=2024-01-01'
```

---

## Searches

### `GET /api/v1/searches`

List credit search records.

| Parameter    | Type   | Description                             |
| ------------ | ------ | --------------------------------------- |
| `limit`      | number | Items per page (default: 50)            |
| `offset`     | number | Skip count (default: 0)                 |
| `subjectId`  | string | Filter by subject                       |
| `visibility` | string | Filter by visibility (e.g., hard, soft) |
| `searchType` | string | Filter by search type                   |
| `from`       | string | Start date                              |
| `to`         | string | End date                                |

```bash
curl 'http://localhost:3000/api/v1/searches?subjectId=subj-123&visibility=hard'
```

---

## Scores

### `GET /api/v1/scores`

List credit scores.

| Parameter      | Type   | Description                  |
| -------------- | ------ | ---------------------------- |
| `limit`        | number | Items per page (default: 50) |
| `offset`       | number | Skip count (default: 0)      |
| `subjectId`    | string | Filter by subject            |
| `sourceSystem` | string | Filter by bureau/source      |
| `from`         | string | Start date                   |
| `to`           | string | End date                     |

```bash
curl 'http://localhost:3000/api/v1/scores?subjectId=subj-123&sourceSystem=experian'
```

---

## Imports

### `GET /api/v1/imports`

List import batches.

| Parameter   | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `limit`     | number | Items per page (default: 50) |
| `offset`    | number | Skip count (default: 0)      |
| `subjectId` | string | Filter by subject            |

```bash
curl 'http://localhost:3000/api/v1/imports?limit=10'
```

### `GET /api/v1/imports/:importId`

Full detail for a specific import, including raw artifacts and ingestion receipt.

```bash
curl http://localhost:3000/api/v1/imports/imp-789
```

---

## Addresses

### `GET /api/v1/addresses`

List addresses with associations and electoral roll entries.

| Parameter   | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `limit`     | number | Items per page (default: 50) |
| `offset`    | number | Skip count (default: 0)      |
| `subjectId` | string | Filter by subject            |
| `role`      | string | Filter by address role       |

```bash
curl 'http://localhost:3000/api/v1/addresses?subjectId=subj-123'
```

---

## Public Records

### `GET /api/v1/public-records`

List public records (CCJs, bankruptcies, etc.).

| Parameter   | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `limit`     | number | Items per page (default: 50) |
| `offset`    | number | Skip count (default: 0)      |
| `subjectId` | string | Filter by subject            |

```bash
curl 'http://localhost:3000/api/v1/public-records?subjectId=subj-123'
```

---

## Insights

### `GET /api/v1/insights`

List generated insights and anomaly detections.

| Parameter   | Type   | Description                  |
| ----------- | ------ | ---------------------------- |
| `limit`     | number | Items per page (default: 50) |
| `offset`    | number | Skip count (default: 0)      |
| `subjectId` | string | Filter by subject            |
| `severity`  | string | Filter by severity           |
| `kind`      | string | Filter by insight kind       |

```bash
curl 'http://localhost:3000/api/v1/insights?subjectId=subj-123&severity=warning'
```

---

## Settings

### `GET /api/v1/settings`

Get all application settings.

```bash
curl http://localhost:3000/api/v1/settings
```

### `PUT /api/v1/settings`

Update a single application setting.

```bash
curl -X PUT http://localhost:3000/api/v1/settings \
  -H 'Content-Type: application/json' \
  -d '{ "key": "theme", "value": "dark" }'
```

Note: The `ddl_hash` key is read-only and cannot be modified.

### `GET /api/v1/settings/health`

System health information including table row counts, last ingest time, DB engine, and schema version.

```bash
curl http://localhost:3000/api/v1/settings/health
```

```json
{
  "data": {
    "tableCounts": { "tradeline": 12, "search": 8 },
    "lastIngestAt": "2024-06-01T12:00:00Z",
    "dbEngine": "sqlite",
    "schemaVersion": "a1b2c3d4e5f6g7h8"
  }
}
```

---

## Export

### `GET /api/v1/export/json?fileId=xxx`

Export a previously ingested credit file as JSON (round-trip reconstruction). Returns a downloadable JSON file.

```bash
curl -O -J 'http://localhost:3000/api/v1/export/json?fileId=file-123'
```

### `GET /api/v1/export/csv/:entity?subjectId=xxx`

Export data as CSV. Supported entities: `tradelines`, `searches`, `scores`.

```bash
curl -O -J 'http://localhost:3000/api/v1/export/csv/tradelines?subjectId=subj-123'
curl -O -J 'http://localhost:3000/api/v1/export/csv/searches?subjectId=subj-123'
curl -O -J 'http://localhost:3000/api/v1/export/csv/scores?subjectId=subj-123'
```

### `GET /api/v1/export/dashboard?subjectId=xxx`

Export a printable HTML dashboard for a subject.

```bash
curl -O -J 'http://localhost:3000/api/v1/export/dashboard?subjectId=subj-123'
```

---

## Backup and Restore

Requires `BACKUP_DIR` to be configured. Protected by `INGEST_API_KEY` if set.

### `GET /api/v1/backup`

List available backups.

```bash
curl -H 'Authorization: Bearer <key>' \
  http://localhost:3000/api/v1/backup
```

### `POST /api/v1/backup`

Create a new database backup.

```bash
curl -X POST -H 'Authorization: Bearer <key>' \
  http://localhost:3000/api/v1/backup
```

### `POST /api/v1/restore`

Restore the database from a backup file. The backup's DDL hash must match the current schema.

```bash
curl -X POST http://localhost:3000/api/v1/restore \
  -H 'Authorization: Bearer <key>' \
  -H 'Content-Type: application/json' \
  -d '{ "backupFile": "credittimeline-2024-06-01T120000.db" }'
```

---

## Maintenance

### `POST /api/v1/maintenance/compact`

Run data compaction to clean up old or redundant records. Protected by `INGEST_API_KEY` if set.

```bash
curl -X POST -H 'Authorization: Bearer <key>' \
  http://localhost:3000/api/v1/maintenance/compact
```

---

## OpenAPI Specification

### `GET /api/v1/openapi.json`

Returns the full OpenAPI 3.1 specification as JSON.

```bash
curl http://localhost:3000/api/v1/openapi.json
```

The interactive Scalar documentation UI is served at `/api/v1/docs`.
