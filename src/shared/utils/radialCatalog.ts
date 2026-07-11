/**
 * radialCatalog.ts — Radial quick-action ring catalogue.
 *
 * Redux-native: no i18n dependency; all labels are plain English strings.
 * Consumed by `RadialMenuBuilder` in the Mouse & Keyboard settings panel.
 */

export interface RadialAction {
  id: string
  label: string
}

export const RADIAL_CATALOG: RadialAction[] = [
  { id: 'palette',    label: 'Command Palette'  },
  { id: 'search',     label: 'Global Search'    },
  { id: 'calculator', label: 'Calculator'        },
  { id: 'note',       label: 'Quick Note'       },
  { id: 'save',       label: 'Save'             },
  { id: 'dashboard',  label: 'Dashboard'        },
  { id: 'contracts',  label: 'Contracts'        },
  { id: 'clients',    label: 'Clients'          },
  { id: 'tasks',      label: 'Tasks'            },
  { id: 'blueprint',  label: 'Blueprint Hub'    },
  { id: 'timesheets', label: 'Timesheets'       },
  { id: 'inbox',      label: 'Inbox'            },
  { id: 'print',      label: 'Print'            },
  { id: 'copy',       label: 'Copy'             },
  { id: 'paste',      label: 'Paste'            },
]

export const RADIAL_MIN_SLOTS = 3
export const RADIAL_MAX_SLOTS = 10

/** Distribute `count` nodes evenly clockwise from 12 o'clock. */
export function slotPosition(
  index: number,
  count: number,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const angle = (-90 + index * (360 / count)) * (Math.PI / 180)
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  }
}
