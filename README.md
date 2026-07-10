# ClearPlan Frontend Demo

ClearPlan is a frontend-only React demo for an admin-first field operations product with an employee-first mobile experience.

It combines two modules:

- **Democlock**: employee clock/time tracking, shifts, breaks, timesheets, GPS status, and employee status.
- **Demofield**: internal project management with projects, floor plans, task pins, galleries, templates, checklists, categories, users, and account settings.

## Layout Architecture

ClearPlan uses one reusable application shell for all authenticated routes:

- `src/app/shell/AppShell.tsx`
- `src/app/shell/Header.tsx`
- `src/app/shell/Sidebar.tsx`
- `src/app/shell/BottomTabBar.tsx`

The shell provides the single global header, dark collapsible sidebar, mobile drawer behavior, global navigation, mobile bottom tabs for Projects, Time & Material, and Profile, and project workspace navigation. Pages render only their content; they do not create standalone headers, navbars, or sidebars.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router
- lucide-react
- Leaflet + react-leaflet with OpenStreetMap tiles
- TEMP_DEMO_AUTH frontend-only demo gate
- Local mock data only
- Responsive layout designed to be Capacitor-ready for future iOS packaging

## Run Locally

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

Production preview/deploy verification:

```bash
npm run build
npm run preview
```

When deploying to static hosting such as A2Hosting, upload `dist/index.html` and the full `dist/assets/` directory. Floor plan PDF rendering depends on the generated `dist/assets/pdfjs/` folder: the pdf.js worker is served from `/assets/pdfjs/pdf.worker.min.js`, and cMaps, standard fonts, and JBIG2/WASM decoding assets are served from `/assets/pdfjs/cmaps/`, `/assets/pdfjs/standard_fonts/`, and `/assets/pdfjs/wasm/`.

## Temporary Demo Auth

ClearPlan currently protects authenticated app routes with a frontend-only `TEMP_DEMO_AUTH` gate while backend Microsoft SSO is paused for Dokploy separation.

Demo credentials:

- Email: `admin@clearviewglobal.net`
- Password: configured only in `src/core/auth/AuthContext.tsx` for the temporary demo gate.

Behavior:

- `/login` shows the ClearPlan demo sign-in page.
- Unauthenticated users are redirected to `/login`.
- Correct credentials store only a `clearplan_TEMP_DEMO_AUTH_session` flag in `localStorage`.
- Refresh keeps the demo session.
- Logout clears the demo session flag and returns to `/login`.

Security note: this is not production security. It only hides the app UI for demos and must be replaced by Laravel-managed Microsoft SSO before production authentication is required.

## Routes

- `/login`
- `/dashboard`
- `/clock`
- `/clock/timesheets`
- `/employees`
- `/projects`
- `/time-material`
- `/profile`
- `/map`
- `/projects/:projectId`
- `/projects/:projectId/plan`
- `/projects/:projectId/plans/:planId`
- `/projects/:projectId/tasks/:taskId`
- `/projects/:projectId/gallery`
- `/templates`
- `/checklists`
- `/categories`
- `/users`
- `/account`
- `/mobile`

## Mocked

Seed data lives in `src/infrastructure/offline/mockData.ts`. Runtime demo data is composed through `src/app/providers/AppProviders.tsx`, managed in memory by `src/app/providers/DemoDataProvider.tsx`, and hydrated from IndexedDB. There is no payment flow or external storage in this frontend repo.

Mock data includes employees, clients, locations, projects, floor plans, tasks, statuses, categories, checklists, templates, time entries, gallery photos, and activity.

## Activity Map

The `/map` route renders a local-only Activity Map using `leaflet` and `react-leaflet` with free OpenStreetMap raster tiles. It does not use paid map APIs or API keys.

The module includes project and employee filters, mock clock events around NY/NJ, employee activity markers, a left event panel, date previous/next controls, OSM zoom controls, and a scale control. Selecting an event or marker centers the map and highlights the event.

## Floor Plan Uploads And Pin Rule

Floor plan uploads accept `image/*` and `application/pdf`. Uploaded files are stored for the current session with object URLs and added to the active project plan library immediately.

Images render directly in the plan canvas. PDFs are rendered client-side with `pdfjs-dist`: page 1 is drawn to a canvas, converted to a PNG Blob, cached in IndexedDB, and shown as the plan background.

The production PDF worker intentionally uses a same-origin static `.js` file at `/assets/pdfjs/pdf.worker.min.js` instead of a dev-server or hashed `.mjs` URL. This avoids static-host MIME/path issues and keeps uploaded File/Blob rendering reliable after deployment.

Floor plan task pins store relative coordinates as `x_percent` and `y_percent`. The UI positions and drags pins with CSS percentages, so pins remain stable when the screen resizes, desktop/mobile layouts switch, zoom changes, the project reopens, or the container dimensions change.

In Add task mode, clicking the plan opens a create-task modal. Saving creates a real task and pin in local React state. Pins can be dragged inside the plan bounds, edited from the detail drawer, and deleted with the linked task.

The project workspace includes Overview, Plans, Tasks, Photos, Files, Checklists, and Activity sections. Section switching is URL-driven through the shared sidebar, for example `/projects/:projectId?section=plans`. The compatibility route `/projects/:projectId/plans/:planId` opens the same workspace with Plans active.

## Floor Plan Workspace

The full floor plan module includes:

- Shared dark app/project sidebar
- Global header with search, notifications, and account controls
- Main pan/zoom canvas
- Floating vertical tool palette
- Right tasks panel
- Bottom plan selector/upload strip
- Task pins with `x_percent` / `y_percent`
- Task detail popup with attributes, checklist, activity, comments, image attachments, and delete action

Supported local interactions include zoom, fit, fullscreen, add task pin, drag pin, hover tooltip, edit task attributes, checklist add/toggle/delete, chat-style comments, and image comment uploads with object URLs.

The floor plan viewport uses one production-grade controller for navigation. Pointer Events handle direct mouse/touch/pen pan and pinch; a single non-passive wheel listener handles mouse-wheel zoom, trackpad pan, and trackpad pinch; Safari `gesture*` events are used only as a fallback for WebKit trackpad pinch. PDF/image content and waypoint overlays share the same `translate3d(x, y, 0) scale(scale)` transform tree, so pins remain aligned at every zoom level.

## Offline Cache

ClearPlan uses Dexie over IndexedDB in `src/core/storage` as an offline foundation. The schema includes `projects`, `projectStatuses`, `plans`, `planAssets`, `tasks`, `comments`, `attachments`, `photos`, `files`, `checklists`, `checklistItems`, `users`, `timeEntries`, `activityEvents`, and `syncQueue`.

Uploaded image/PDF plan files are stored as Blobs in `planAssets.original_blob`. Rendered PDF previews are stored in `planAssets.preview_blob`. Runtime object URLs are recreated only when data is loaded into the UI.

The local sync queue records future API mutations as `{ entity, operation, payload, status, created_at, retry_count }`. It is local-only today; no backend data calls, service worker, PWA caching, or secret/token storage are implemented.

## Future Backend Placeholders

Future Microsoft SSO contract after Dokploy/backend separation:

- `GET /auth/microsoft/redirect`
- `GET /auth/microsoft/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Likely data API surfaces later:

- `POST /auth/login`
- `GET /dashboard`
- `GET /employees`
- `GET /time-entries`
- `POST /clock-events`
- `GET /projects`
- `POST /projects`
- `PATCH /projects/:id`
- `GET /projects/:id/tasks`
- `POST /projects/:id/tasks`
- `PATCH /tasks/:id`
- `POST /floor-plans`
- `POST /media`
- `POST /sync`
- `GET /templates`
- `GET /checklists`
- `GET /categories`
- `GET /users`
