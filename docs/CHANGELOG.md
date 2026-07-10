# Changelog

## 0.10.0 - 2026-06-18

- Replaced the accumulated Floor Plan gesture patches with one viewport controller.
- Moved viewport navigation to Pointer Events for direct pan/pinch, one non-passive wheel listener for mouse and trackpad, and Safari `gesture*` fallback only for WebKit trackpad pinch.
- Added fit-to-screen as the dynamic minimum zoom and kept zoom-to-cursor / zoom-to-pinch-center behavior.
- Preserved the single shared `translate3d(x, y, 0) scale(scale)` transform tree for PDF/image content and waypoint overlays.
- Documented the viewport architecture and the rule against independent waypoint transforms.

## 0.9.0 - 2026-06-18

- Added `TEMP_DEMO_AUTH`, a frontend-only demo login gate while backend Microsoft SSO is paused.
- Protected app-shell routes behind the demo session flag.
- Added ClearPlan demo credentials login with wrong-credential error handling.
- Added logout that clears the demo session and returns to `/login`.
- Updated `.env.example`, README, project context, and deployment notes to mark this as temporary non-production auth.

## 0.8.0 - 2026-06-18

- Served the pdf.js worker from `public/pdfjs/pdf.worker.min.js` so production static hosting can load it from `/pdfjs/pdf.worker.min.js` with a JavaScript MIME type.
- Kept pdf.js cMaps, standard fonts, and JBIG2/WASM decoding assets on same-origin `/pdfjs/` paths for Vite preview and A2Hosting deployments.
- Tightened the floor plan canvas touch surface for mobile Safari with contained overscroll, disabled native touch selection/callouts, and canvas-only default touch prevention while preserving desktop pointer and wheel behavior.

## 0.1.0 - 2026-06-17

- Scaffolded ClearPlan as a React + Vite + TypeScript frontend demo.
- Added Tailwind CSS styling and responsive desktop/mobile shells.
- Added Democlock clock screen, employee status list, location map placeholder, and admin timesheets.
- Added Demofield project list, project detail tabs, task board, floor plan viewer, task detail, and gallery preview.
- Added floor plan pins with percentage-based coordinates.
- Added admin dashboard, templates, checklists, categories, users, account, and login screens.
- Added employee-first dark mobile home with iOS safe-area support.
- Added typed local mock data for employees, clients, locations, projects, floor plans, tasks, statuses, categories, checklists, templates, time entries, gallery photos, and activity.

## 0.2.0 - 2026-06-17

- Added `DemoDataProvider` for mutable in-memory project, floor plan, task, gallery, and time-entry state.
- Replaced placeholder upload cards with functional file inputs.
- Added local image/PDF floor plan uploads with object URLs and active plan selection.
- Rebuilt the floor plan workspace with add-task mode, create-task modal, draggable percentage pins, edit fields, and delete task/pin action.
- Improved project list filters and made project creation persist in local state.
- Added gallery Add Media menu, object URL photo uploads, and next/previous photo preview.
- Expanded task detail with info, checklist, activity, comments, media, and plan preview sections.
- Improved Democlock web and mobile state changes with confirmation modals and employee map pins.
- Expanded admin templates, checklists, categories/status customization, users, and account/profile screens.

## 0.3.0 - 2026-06-17

- Added shared project phase/status model and dashboard status selector.
- Added project dashboard overflow actions: change status, edit, duplicate, archive, and delete with confirmation.
- Added status update toast and local project state patching.
- Rebuilt `/projects/:projectId` as the primary ClearPlan project workspace with header metadata and tabs.
- Added Overview, Plans, Tasks, Photos, Files, Checklists, and Activity tab structure.
- Expanded Plans with folders, categories, search, upload, active selection, thumbnails, and viewer links.
- Added `/projects/:projectId/plans/:planId` plan viewer route with thumbnail navigation and zoom controls.
- Added `DESIGN_SYSTEM.md` documenting ClearPlan visual language, status workflow, and plan workflow.

## 0.4.0 - 2026-06-17

- Rebuilt `/projects/:projectId/plans/:planId` as the full ClearPlan floor plan workspace.
- Added left project sidebar, top toolbar, main canvas, right tasks panel, floating tool palette, and bottom plan strip.
- Added functional zoom, fit, fullscreen, select, and add task pin tools.
- Added draggable task pins with hover tooltip and persistent percentage coordinates.
- Added task detail popup with editable title, status, category, assignee, location, dates, manpower, cost, tags, and watchers.
- Added task checklist add/toggle/delete behavior with completion count.
- Added chat-style comments with image attachment upload using object URLs.
- Added plan upload support from the viewer and bottom plan strip.

## 0.5.0 - 2026-06-18

- Consolidated authenticated routes under one reusable `AppShell`.
- Added one global `Header` for search, notifications, and account controls.
- Rebuilt the global `Sidebar` as the single dark, collapsible navigation source for app sections and project workspace sections.
- Removed duplicate project-only headers, sidebars, dashboard nav bars, and mobile bottom navigation.
- Migrated project workspace section switching to URL-driven state via the shared sidebar.
- Kept Projects dashboard cards and Plans fullscreen viewer behavior inside the unified shell.

## 0.6.0 - 2026-06-18

- Added Dexie/IndexedDB offline cache foundation under `src/lib/db`.
- Added stores for projects, statuses, plans, plan assets, tasks, comments, attachments, photos, files, checklists, checklist items, users, time entries, activity events, and sync queue.
- Seeded mock data into IndexedDB on first load and hydrated core UI state from cache.
- Added local sync queue records for future create/update/delete mutations.
- Persisted uploaded plan image/PDF Blobs and rendered PDF preview Blobs.
- Updated PDF upload flow to render page 1 with `pdfjs-dist` and display it as the plan background.
- Persisted task pins and task comments/comment attachments locally.

## 0.7.0 - 2026-06-18

- Added `/map` Activity Map module using Leaflet, react-leaflet, and OpenStreetMap tiles.
- Added local NY/NJ demo activity events with employee/project/date filtering.
- Added event list, employee activity markers, selected-date controls, marker click focus, event click focus, zoom controls, and scale control.
- Reordered global sidebar navigation to Dashboard, Projects, Map, Timesheets, Employees, Templates, Checklists, Categories, Users, Account, Mobile.
