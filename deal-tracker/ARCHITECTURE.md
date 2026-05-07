# Enterprise Structure

The project has been reorganized into a scalable monolith-first layout.

## Backend

- `backend/src/app.js` owns Express app setup and route registration.
- `backend/src/config` contains environment, MongoDB, Redis, and logging config.
- `backend/src/modules/deals` contains the active deals domain: controllers, routes, and models.
- `backend/src/common` contains shared middleware and utilities.
- `backend/src/queues`, `backend/src/jobs`, and `backend/workers` are scaffolded for async queue processing.
- `backend/uploads` remains local temporary storage.

## Frontend

- `frontend/src/pages`, `frontend/src/js`, `frontend/src/css`, and `frontend/src/components` contain the current static UI.
- `frontend/src/app`, `frontend/src/modules`, `frontend/src/routes`, `frontend/src/hooks`, `frontend/src/utils`, and `frontend/src/layouts` are scaffolded for gradual React-style modularization.

## Run

```bash
cd backend
npm start
```

Docker entrypoints are available in `backend/Dockerfile` and `backend/docker-compose.yml`.
