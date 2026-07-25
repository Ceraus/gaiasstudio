# Changelog

All notable changes to Gaia's Label Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Recipe list pagination** — "Your Recipes" on the Choose Recipe screen
  is now capped at 19 per page (matching the height of the editor column
  beside it), with Prev/Next controls and a "Page X of Y" indicator. Saving
  a new recipe automatically jumps to whichever page it landed on.
- **Complete ingredient icon coverage** — every ingredient in the database
  now has a purpose-built, colorful icon instead of falling back to a
  generic category icon. Added five new icon shapes (milk bottle, molecule,
  granular cluster, powder mound, lab flask) and 198 new colorful icon
  entries to cover every previously-uncovered ingredient.

### Changed
- **Default interface scale is now 100%** (was 125%); the "default" badge
  in Settings → Interface size moved to the 100% option accordingly.
- **Header navigation** no longer fights over an artificial ~1024px width
  budget — the tab bar, "Hi Rosa" greeting, New Label/AI Prompt/Settings
  buttons and language switcher all render fully on one line, using the
  window's actual full width instead of a fixed max-width container.

### Fixed
- The "active draft in progress" dot on the Workspace tab was being
  cropped by the nav's horizontally-scrolling wrapper; removed the
  now-unnecessary scroll container so the dot renders uncropped.
- WorkflowStepper tooltips were appearing underneath the header instead of
  stacking above it; fixed the z-index order.

## [2.0.29] - 2026-07-24

### Added
- **Workspace dashboard** — designs can now be filed under colour-coded
  Collections (product lines). Global search reaches through a design's
  template, collection, recipe and that recipe's ingredients, so searching
  "lavender" finds a label whose recipe simply contains it. Collection filter
  chips (including an "Unfiled" bucket) show live counts, and a Collections
  manager lets you create, rename, recolour and delete collections.
- **Mixed batch printing ("Ink Saver")** — queue several different saved
  designs onto one Avery sheet from the Workspace, with a live sheet preview,
  per-design quantity steppers, and a "fill evenly" action that tops up the
  last sheet so it's never wasted. Designs with a different label size are
  flagged and excluded rather than mis-printed.
- **Digital inch rulers** — a toggleable physical ruler along the canvas
  edges, zeroed on the trim line, for precise by-hand placement.
- **Interface scale** — a 100/110/125/140% display-size setting in Settings
  for accessibility; the whole UI (not just the canvas) scales together.
- Non-destructive brightness/contrast/saturation adjustments on images.
- Drag-to-reorder in the Layers panel.
- Real object clipboard (Ctrl/Cmd+C/X/V) alongside the existing style painter.
- Undockable Properties panel (floats in its own movable window).
- Spanish and English translations for every new string (54 additions each).

### Changed
- The round front label layout is now a true front face — curved product
  name arcing along the ring, benefit tagline and net weight inside the
  legibility circle — instead of duplicating the back label's content.
- README documents the Workspace/Collections model, mixed batch printing,
  the ruler and the interface scale.

### Fixed
- Curved text no longer loses its ascenders to Fabric's object cache; it now
  renders uncached while curved and re-caches once straightened.
- Content that can't fit a label is dropped from the least important line
  upward instead of overflowing past the die-cut.

### Security
- A single, shared `will-download` interceptor (main + AI-Studio sessions)
  with async, size-capped image conversion and sanitized filenames.
- Embedded `<webview>`s are forced into `contextIsolation`, denied a
  preload, and have every permission request refused; popups are routed
  through an allowlisted, session-sharing AI browser window instead of
  spawning unaudited windows.
- `open-file` / `open-folder` IPC is scoped to the portable save-system
  directory so a compromised renderer can't launch arbitrary files.

## [2.0.28] - 2026-07-19

Initial tracked release — offline-first label & sticker editor with an
Avery print-routing engine, recipe/ingredient library, and PDF export.
