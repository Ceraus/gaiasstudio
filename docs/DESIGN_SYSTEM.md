# ClearPlan Design System

ClearPlan uses uploaded references for workflow and information architecture only. The visual language should feel proprietary: rounded, calm, premium, and enterprise-ready.

## Foundations

- Page background: soft light gray (`#f5f7fa`)
- Application shell: one global header plus one dark collapsible sidebar
- Cards: 16px radius, subtle border, soft shadow, hover elevation
- Buttons: 12px radius, consistent 40px height on dashboards
- Inputs: 12px radius, subtle border, blue focus ring
- Pills: fully rounded, color-coded by workflow state
- Typography: compact enterprise density with strong title/address hierarchy

## Project Status

Statuses use shared definitions in `src/modules/projects/statusModel.ts`.

- Phase 1 - Site Visit
- Phase 2 - Quote Sent
- Phase 2.1 - Pending
- Phase 2.2 - Cancelled
- Phase 3 - Approved
- Phase 3.1 - Deposit Paid
- Phase 3.2 - Equipment Ordered
- Phase 3.3 - Scheduled
- Phase 4 - Installation In Progress
- Phase 4.1 - Installation Completed
- Phase 4.2 - Configuration In Progress
- Phase 4.3 - Configuration Completed
- Phase 5 - Job Completed
- Phase 6 - Final Payment Paid
- Phase 7 - Closed

## Project Workflow

Dashboard cards are clickable except for the status badge, favorite, crown, and overflow controls. Status updates patch local project state and show a success toast. Overflow supports change status, edit, duplicate, archive, and delete with confirmation.

## Plan Workflow

Plans support image and PDF uploads with local object URLs. Plan architecture is organized around:

- Thumbnails
- Bottom plan selector/upload strip
- Task pins
- Draggable markers
- Future comments, markups, measurements, and layers

PDF plans render page 1 into an image preview before display, so visual treatment and pin alignment match image plans. If rendering fails, the viewer shows a filename-specific render error state.

## Floor Plan Workspace

The full workspace uses ClearPlan styling rather than reference styling:

- Shared dark left sidebar for app and project workspace navigation
- One global header only
- Viewer overlay with compact plan title and zoom/fullscreen controls
- Floating dark vertical tool palette with rounded icon buttons
- White right task panel with compact task cards
- Rounded plan canvas and bottom plan selector strip

Functional tools today: fullscreen, zoom in/out, fit screen, add task pin, select cursor, drag pin, task popup, checklist, comments, image upload. Demo-disabled tools show tooltip labels and subdued disabled states.

Viewport interaction is intentionally centralized. The plan uses one shared transform tree for PDF/image content and overlays, with `translate3d(x, y, 0) scale(scale)` and `transform-origin: 0 0`. Navigation should feel like a field-grade map canvas: pointer drag pans, wheel zoom centers on the cursor, trackpad scroll pans, trackpad/mobile pinch zooms around the gesture center, and fit-to-screen defines the minimum zoom. Do not add independent transforms to waypoint overlays.
