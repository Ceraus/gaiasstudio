# Project Context

ClearPlan is a new company project. It is intentionally standalone and does not copy or reference any other product code, branding, routing, environment naming, or architecture.

## Demo Goal

Create a polished frontend demo that can be shown today:

- Web: admin-first operations dashboard.
- Mobile: employee-first iOS-like clock and field work surface.
- Admin tools remain reachable on mobile for a mocked admin role.

## Module Boundaries

- `src/modules/clock`: Democlock employee time tracking and admin timesheets.
- `src/modules/projects`: Demofield project management, project details, floor plans, tasks, galleries.
- `src/modules/map`: Activity Map with local clock events rendered on OpenStreetMap tiles.
- `src/modules/admin`: dashboard, users, templates, checklists, categories, account, login.
- `src/modules/employees`: employee table and mobile employee home.
- `src/app/router`: route table and lazy-loaded route modules.
- `src/app/providers`: app-level provider composition and mutable demo state.
- `src/app/shell`: AppShell, Header, Sidebar, and mobile bottom tab navigation.
- `src/core/api`: centralized future Laravel API client.
- `src/core/auth`: temporary frontend auth gate behind a replaceable auth boundary.
- `src/core/storage` and `src/core/sync`: Dexie persistence, repositories, and local sync queue.
- `src/shared/components`: reusable UI primitives.
- `src/shared/types`: shared domain types.
- `src/infrastructure/offline`: PWA lifecycle and local demo/offline seed data.

## Temporary Demo Auth

ClearPlan currently uses `TEMP_DEMO_AUTH`, a frontend-only demo gate in `src/core/auth/AuthContext.tsx`, while backend Microsoft SSO is paused for Dokploy separation.

The demo gate protects app-shell routes, accepts the temporary demo credentials, stores only a `clearplan_TEMP_DEMO_AUTH_session` flag in `localStorage`, and clears that flag on logout. This is not production security and must be replaced by Laravel-managed Microsoft SSO.

## State And Data

The app uses local React state hydrated from IndexedDB. `DemoDataProvider` still exposes the mutable demo state API, but core entities are seeded into Dexie on first load and mutations write through to IndexedDB. Backend data APIs are not connected yet.

TODO for backend work: replace local repositories with typed data services backed by REST or RPC endpoints. Floor plan uploads should move from IndexedDB Blobs to persistent storage, and media should use signed upload URLs or a storage SDK.

## Activity Map

Route: `/map`.

The Activity Map uses `leaflet` and `react-leaflet` with OpenStreetMap tiles. It is frontend-only and API-key-free. Mock employees, projects, and clock events are local to `src/modules/map/ActivityMapPage.tsx`; filters and selected date are local React state.

Interactions:

- Project and employee filters narrow the event list and markers.
- Event clicks and marker clicks center the map.
- Date arrows switch between local mock days.
- Desktop shows an event panel beside the map; mobile stacks the map first with the event panel below.

## IndexedDB Offline Cache

Dexie database: `clearplan-offline-cache`.

Stores:

- `projects`
- `projectStatuses`
- `plans`
- `planAssets`
- `tasks`
- `comments`
- `attachments`
- `photos`
- `files`
- `checklists`
- `checklistItems`
- `users`
- `timeEntries`
- `activityEvents`
- `syncQueue`

Every cached record is prepared with `org_id` and `tenant_id` fields for future tenant isolation. Runtime object URLs are never treated as durable data; uploaded files and rendered PDF previews are stored as Blobs.

## Floor Plans

Floor plan tasks must attach:

- `projectId`
- `floorPlanId`
- `x_percent`
- `y_percent`
- `title`
- `category`
- `status`
- `assigneeId`

Coordinates are percentages, not pixels. This is the key invariant for keeping task pins stable across responsive layouts and zoom.

The Plans viewport has one interaction controller. Pointer Events are the primary path for direct pan and pinch gestures; a single non-passive wheel listener handles mouse-wheel zoom, Apple Magic Trackpad pan, and browser pinch-wheel zoom; Safari `gesture*` events are retained only as a WebKit trackpad pinch fallback. Do not add separate React touch handlers or parallel gesture systems.

Plan uploads are local-only:

- Images persist as original Blobs and render from runtime object URLs.
- PDFs persist as original Blobs, render page 1 through `pdfjs-dist`, persist the rendered preview Blob, and display that preview as the plan background.
- Uploaded plans are added to the current project library immediately.
- Add task mode creates a real local task after the create-task modal is saved.
- Dragging a pin updates `x_percent` and `y_percent` and clamps the pin within the plan.

## Project Workspace

The primary workspace route is `/projects/:projectId`. It includes:

- Project header content with back navigation, status selector, favorite, client, address, manager, and team.
- Shared-sidebar sections for Overview, Plans, Tasks, Photos, Files, Checklists, and Activity.
- URL-driven section state using `?section=overview|plans|tasks|photos|files|checklists|activity`.
- Plans content with fullscreen canvas, bottom plan thumbnails/upload, floating tools, and a right task panel.
- Tasks content with Board and List modes plus status, assignee, category, and priority filters.
- Local-only state that can later be replaced by endpoint-backed services.

## Floor Plan Module Architecture

The full floor-plan workspace is rendered inside the shared application shell at `/projects/:projectId?section=plans` and compatibility routes such as `/projects/:projectId/plans/:planId`.

Core state remains local React state/context:

- Tasks and pin coordinates are written through `DemoDataProvider`.
- Pin coordinates are stored as `x_percent` and `y_percent`, never absolute pixels.
- Checklist items and task comments are local to the viewer session.
- Task comments and comment image attachments are persisted in IndexedDB.

The viewer is structured for future backend expansion around task pins, draggable markers, comments, markups, measurements, layers, attachments, and plan versions.

Viewport transform invariant:

- PDF/image layer and waypoint overlay share one transformed parent.
- Transform source of truth is `translate3d(x, y, 0) scale(scale)` with `transform-origin: 0 0`.
- Min zoom is calculated from fit-to-screen.
- Waypoint and annotation coordinates remain normalized document percentages.

Future endpoint placeholders after backend work resumes:

- `GET /auth/microsoft/redirect`
- `GET /auth/microsoft/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id/plans`
- `POST /api/projects/:id/plans`
- `GET /api/projects/:id/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/sync`
