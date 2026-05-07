# Scalable MIS Dashboard Architecture

## Frontend

- Large Excel imports run inside Web Workers so parsing does not block the UI thread.
- Rows are emitted and uploaded in bounded chunks to prevent unbounded browser memory growth.
- Uploads show phase-based progress: uploading, processing, generating insights, and dashboard refresh.
- Chunk uploads retry transient failures before surfacing an error.
- Records are fetched with server-side pagination instead of loading the full collection.
- Search is debounced and re-fetches from page 1.
- Tables render only the current page, minimizing DOM updates for 100k+ row datasets.

## Backend

- Bulk inserts use `insertMany` with server-side normalization and sequential ID allocation per chunk.
- List APIs use projection, `lean()`, pagination, and `countDocuments()`.
- Summary totals use MongoDB aggregation instead of loading records into Node.js memory.
- Common dashboard fields have supporting indexes for faster search, date, decision, project, and amount queries.
- Compression is enabled automatically when the optional `compression` package is installed.

## Capacity Defaults

- Frontend upload chunk size: 5,000 rows.
- Concurrent chunk uploads: 2.
- Max queued parsed chunks in browser memory: 4.
- Max upload file size: 100 MB.
- Records page size: 100 rows.
- Backend max rows per bulk request: 5,000.

## Next Enterprise Step

For multi-user concurrent imports, move `/api/deals/bulk` behind a durable queue such as BullMQ plus Redis. Keep the current chunk API as the producer, process chunks in worker processes, and expose job status over the existing SSE monitor stream.
