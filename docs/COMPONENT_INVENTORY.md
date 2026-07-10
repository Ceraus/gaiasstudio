# Component Inventory

## Layout

- `AppShell`: single authenticated application shell.
- `Header`: single global header with search, notifications, and account controls.
- `Sidebar`: single dark collapsible sidebar with global app navigation and project workspace navigation.

## Project Workspace

- `ProjectDetailPage`: renders project workspace content sections only; navigation comes from `Sidebar`.
- `ProjectPlanWorkspace`: fullscreen Plans workspace with canvas, floating tools, right task panel, bottom thumbnails/upload, and the single production viewport controller for pan, wheel zoom, trackpad pan, trackpad pinch, direct touch pan, mobile pinch, fit-to-screen, and waypoint-aligned transforms.
- `ProjectsPage`: approved project card dashboard rendered inside `AppShell`.

## Activity Map

- `ActivityMapPage`: `/map` module with OpenStreetMap tiles via Leaflet/react-leaflet, local clock-event filters, event panel, markers, date controls, and responsive map-first mobile layout.

## Shared UI

- `Modal`, `Drawer`, `DataTable`, `StatusBadge`, `Avatar`, `FileUploadCard`, `TaskPin`, and `FloorPlanViewer` remain reusable UI primitives.

## Deprecated Layout Pattern

Do not create new route-level shells, duplicate top navs, page-local sidebars, or mobile bottom navs. Add navigation to `Sidebar` and page actions to page content.
