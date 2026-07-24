# Changelog

All notable changes to Gaia's Label Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
