/**
 * exampleDataPayloads.ts — The ONLY authorised source of ALL example / sample data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRACT:
 *   All arrays in this file are consumed EXCLUSIVELY when `account.useExampleData === true`.
 *   No component (.tsx / .jsx), Redux slice, or context provider may define local
 *   fallback arrays with named individuals, project names, or metric numbers.
 *   When the toggle is OFF the platform renders a 100% blank slate.
 *
 * Sanitisation rules enforced:
 *   - "Quote Sent"       → "Proposal Sent"  (Phase 2 detail)
 *   - "Quote Sent"       → "Contract Drafted" for later-stage Phase 2 entries
 *   - No "Project Investment" labels — all financial fields use "Total Investment"
 *   - Zero references to "Quotes" in any field
 *   - "caldentey" is strictly excluded from all payloads
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Dashboard project shape (mirrors ProjectsPage internal type) ──────────────

export interface ExampleDashboardProject {
  id: string
  name: string
  address: string
  phase: string
  phaseDetail: string
  people: number
  tasks: number
}

// ── Sanitized 30-project example payload ─────────────────────────────────────

export const EXAMPLE_DASHBOARD_PROJECTS: ExampleDashboardProject[] = [
  { id: 'dash-1',  name: 'HERE Arts Center',              address: '145 6th Ave',                       phase: 'Phase 3', phaseDetail: 'Approved',                      people: 3, tasks: 8  },
  { id: 'dash-2',  name: 'Adaptive Build',                 address: '200 Park Ave S, Suite 1702',        phase: 'Phase 2', phaseDetail: 'Proposal Sent',                 people: 5, tasks: 12 },
  { id: 'dash-3',  name: 'AO Management',                  address: '287 Park Ave S',                    phase: 'Phase 1', phaseDetail: 'Site Visit',                    people: 3, tasks: 9  },
  { id: 'dash-4',  name: 'Atlas Wellness Clinic',          address: '505 8th Ave, 12th Floor',           phase: 'Phase 2', phaseDetail: 'Proposal Sent',                 people: 3, tasks: 11 },
  { id: 'dash-5',  name: 'Bharati Center',                 address: '305 Schermerhorn St',               phase: 'Phase 2', phaseDetail: 'Proposal Sent',                 people: 3, tasks: 10 },
  { id: 'dash-6',  name: 'Dailymotion',                    address: '150 W 22nd St 12 Floor',            phase: 'Phase 7', phaseDetail: 'Job Completed Pending Payment', people: 5, tasks: 18 },
  { id: 'dash-7',  name: 'Earned',                         address: '287 Park Ave S 7th Floor',          phase: 'Phase 5', phaseDetail: 'Job Completed',                 people: 5, tasks: 16 },
  { id: 'dash-8',  name: 'Fever Up',                       address: '483-485 Broadway',                  phase: 'Phase 4', phaseDetail: 'Installation in Progress',      people: 5, tasks: 14 },
  { id: 'dash-9',  name: 'Herald Center',                  address: '1239 Broadway',                     phase: 'Phase 3', phaseDetail: 'Approved',                      people: 3, tasks: 8  },
  { id: 'dash-10', name: 'Herald Towers Elevator project', address: 'HT Elevators 2026',                 phase: 'Phase 3', phaseDetail: 'Approved',                      people: 3, tasks: 7  },
  { id: 'dash-11', name: 'Instant One',                    address: '53W 21th St',                       phase: 'Phase 2', phaseDetail: 'Proposal Sent',                 people: 3, tasks: 9  },
  { id: 'dash-12', name: 'Irving Realty',                  address: '33W 17th St',                       phase: 'Phase 1', phaseDetail: 'Site Visit',                    people: 3, tasks: 6  },
  { id: 'dash-13', name: 'Jembrealty',                     address: '150 Broadway 4th Floor',            phase: 'Phase 1', phaseDetail: 'Site Visit',                    people: 5, tasks: 13 },
  { id: 'dash-14', name: 'Khaite',                         address: '65 Bleeker Street 9th floor',       phase: 'Phase 3', phaseDetail: 'Approved',                      people: 5, tasks: 19 },
  { id: 'dash-15', name: 'Le Parc',                        address: '287 Park Ave S',                    phase: 'Phase 4', phaseDetail: 'Installation in Progress',      people: 4, tasks: 15 },
  { id: 'dash-16', name: 'Metaforms AI',                   address: '30 East 23rd Street',               phase: 'Phase 7', phaseDetail: 'Job Completed Pending Payment', people: 5, tasks: 20 },
  { id: 'dash-17', name: 'Neighborhood Restore',           address: '150 Broadway',                      phase: 'Phase 7', phaseDetail: 'Job Completed Pending Payment', people: 4, tasks: 17 },
  { id: 'dash-18', name: 'Park Pictures',                  address: '184 5th Ave',                       phase: 'Phase 1', phaseDetail: 'Site Visit',                    people: 6, tasks: 14 },
  { id: 'dash-19', name: 'Pharsalus',                      address: '200 Varick St, Floor 8',            phase: 'Phase 2', phaseDetail: 'Contract Drafted',              people: 3, tasks: 8  },
  { id: 'dash-20', name: 'Phaze App',                      address: '330 7th Ave 21th Floor',            phase: 'Phase 5', phaseDetail: 'Job Completed',                 people: 5, tasks: 16 },
  { id: 'dash-21', name: 'Probook AI',                     address: '130 Madison Avenue',                phase: 'Phase 2', phaseDetail: 'Proposal Sent',                 people: 3, tasks: 9  },
  { id: 'dash-22', name: 'Runway',                         address: '18 West 18th Street, Floor 8',      phase: 'Phase 7', phaseDetail: 'Job Completed Pending Payment', people: 3, tasks: 11 },
  { id: 'dash-23', name: 'SFI Sunbeth',                    address: '375 9th Avenue',                    phase: 'Phase 1', phaseDetail: 'Site Visit',                    people: 3, tasks: 7  },
  { id: 'dash-24', name: 'Skillz',                         address: '150 Broadway 15th Floor',           phase: 'Phase 4', phaseDetail: 'Installation in Progress',      people: 5, tasks: 13 },
  { id: 'dash-25', name: 'Sola Salon',                     address: '50 W 17th Street',                  phase: 'Phase 4', phaseDetail: 'Installation in Progress',      people: 5, tasks: 15 },
  { id: 'dash-26', name: 'Sola Salon',                     address: '666 Broadway',                      phase: 'Phase 4', phaseDetail: 'Installation in Progress',      people: 5, tasks: 12 },
  { id: 'dash-27', name: 'Still Here',                     address: '905 Madison Ave',                   phase: 'Phase 2', phaseDetail: 'Contract Drafted',              people: 3, tasks: 10 },
  { id: 'dash-28', name: 'Sutton Smyth',                   address: '155 E 55th St #6C',                 phase: 'Phase 7', phaseDetail: 'Job Completed Pending Payment', people: 5, tasks: 17 },
  { id: 'dash-29', name: 'The Globe Show Room',            address: '236W 38th St',                      phase: 'Phase 2', phaseDetail: 'Proposal Sent',                 people: 3, tasks: 8  },
  { id: 'dash-30', name: 'Too Lost',                       address: '915 Broadway 801',                  phase: 'Phase 5', phaseDetail: 'Job Completed',                 people: 5, tasks: 15 },
]

// ── Workforce ─────────────────────────────────────────────────────────────────
// Shared across: Admin Dashboard (Live Field Status + metric cards), Clock page,
// and Activity Map. Gate behind `account.useExampleData === true`.

export interface ExampleEmployee {
  id: string
  name: string
  initials: string
  role: 'Admin' | 'Manager' | 'Employee'
  title: string
  status: 'Clocked in' | 'On break' | 'Off shift'
  phone: string
  location: string
  todayHours: number
  weekHours: number
  assignedProjectId: string
  assignedProjectName: string
}

export const EXAMPLE_EMPLOYEES: ExampleEmployee[] = [
  { id: 'emp-1', name: 'Jordan Lee',  initials: 'JL', role: 'Admin',    title: 'Operations Director', status: 'Clocked in', phone: '(617) 555-0120', location: 'Northstar Level 4',  todayHours: 6.4, weekHours: 31.2, assignedProjectId: 'proj-northstar', assignedProjectName: 'Northstar Clinic Expansion'    },
  { id: 'emp-2', name: 'Maya Chen',   initials: 'MC', role: 'Manager',  title: 'Field Lead',          status: 'On break',   phone: '(617) 555-0144', location: 'Civicline Tower',    todayHours: 4.1, weekHours: 28.8, assignedProjectId: 'proj-hq',        assignedProjectName: 'Civicline HQ Refresh'          },
  { id: 'emp-3', name: 'Sam Rivera',  initials: 'SR', role: 'Employee', title: 'Technician',          status: 'Clocked in', phone: '(617) 555-0188', location: 'Ridgeview Campus',   todayHours: 5.7, weekHours: 24.3, assignedProjectId: 'proj-ridgeview',  assignedProjectName: 'Ridgeview Access Upgrade'      },
  { id: 'emp-4', name: 'Priya Nair',  initials: 'PN', role: 'Employee', title: 'Installer',           status: 'Off shift',  phone: '(617) 555-0199', location: 'Northstar Level 4',  todayHours: 0,   weekHours: 22.5, assignedProjectId: 'proj-northstar', assignedProjectName: 'Northstar Clinic Expansion'    },
]

// ── Activity Map ──────────────────────────────────────────────────────────────
// Used exclusively by ActivityMapPage when useExampleData is ON.

export interface ExampleMapProject {
  id: string
  name: string
  company: string
}

export type ExampleEventType = 'Clock-In' | 'Clock-Out' | 'Break'

export interface ExampleClockEvent {
  id: string
  employeeId: string
  projectId: string
  type: ExampleEventType
  timestamp: string
  lat: number
  lng: number
}

export const EXAMPLE_MAP_PROJECTS: ExampleMapProject[] = [
  { id: 'proj-northstar',  name: 'Northstar Clinic Expansion',    company: 'Clearview Global' },
  { id: 'proj-hq',         name: 'Civicline HQ Refresh',          company: 'Clearview Global' },
  { id: 'proj-ridgeview',  name: 'Ridgeview Access Upgrade',      company: 'Clearview Global' },
  { id: 'proj-waterfront', name: 'Waterfront Security Retrofit',  company: 'Clearview Global' },
]

export const EXAMPLE_CLOCK_EVENTS: ExampleClockEvent[] = [
  { id: 'evt-1',  employeeId: 'emp-1', projectId: 'proj-hq',        type: 'Clock-In',  timestamp: '2026-06-18T09:12:00', lat: 40.7392, lng: -74.0311 },
  { id: 'evt-2',  employeeId: 'emp-2', projectId: 'proj-northstar',  type: 'Clock-In',  timestamp: '2026-06-18T09:28:00', lat: 40.7528, lng: -73.9929 },
  { id: 'evt-3',  employeeId: 'emp-3', projectId: 'proj-ridgeview',  type: 'Break',     timestamp: '2026-06-18T12:04:00', lat: 40.7168, lng: -74.0431 },
  { id: 'evt-4',  employeeId: 'emp-4', projectId: 'proj-waterfront', type: 'Clock-Out', timestamp: '2026-06-18T17:21:00', lat: 40.7005, lng: -74.0126 },
  { id: 'evt-5',  employeeId: 'emp-1', projectId: 'proj-northstar',  type: 'Clock-In',  timestamp: '2026-06-17T08:46:00', lat: 40.7484, lng: -73.9857 },
  { id: 'evt-6',  employeeId: 'emp-2', projectId: 'proj-hq',         type: 'Break',     timestamp: '2026-06-17T11:39:00', lat: 40.7295, lng: -74.0044 },
  { id: 'evt-7',  employeeId: 'emp-3', projectId: 'proj-waterfront', type: 'Clock-Out', timestamp: '2026-06-17T16:58:00', lat: 40.7099, lng: -74.0062 },
  { id: 'evt-8',  employeeId: 'emp-4', projectId: 'proj-ridgeview',  type: 'Clock-In',  timestamp: '2026-06-19T09:04:00', lat: 40.7308, lng: -73.9975 },
  { id: 'evt-9',  employeeId: 'emp-2', projectId: 'proj-waterfront', type: 'Clock-In',  timestamp: '2026-06-19T09:33:00', lat: 40.7189, lng: -74.0152 },
  { id: 'evt-10', employeeId: 'emp-1', projectId: 'proj-hq',         type: 'Break',     timestamp: '2026-06-19T12:12:00', lat: 40.7440, lng: -74.0248 },
]

// ── Projects (full Project domain objects) ────────────────────────────────────
// Consumed by DemoDataProvider when useExampleData is ON.
// IDs proj-1 / proj-2 / proj-3 intentionally align with EXAMPLE_TASKS and
// EXAMPLE_FLOOR_PLANS so Blueprint Hub and ProjectPlanWorkspace resolve correctly.
// The remaining entries mirror EXAMPLE_DASHBOARD_PROJECTS with proper status mapping:
//   Phase 1–2 → Planning  |  Phase 3–4 → Active  |  Phase 5–6 → Complete  |  Phase 7 → Review

export const EXAMPLE_PROJECTS = [
  // ── Task / floor-plan anchor projects ────────────────────────────────────
  { id: 'proj-1', name: 'Northstar Clinic Expansion',  clientId: '', address: 'Northstar Medical Center',         status: 'Active'   as const, phaseCode: 'phase-4', progress: 62, budget: '$0', startDate: '2026-01-15', managerId: '', assignedUserIds: [], floorPlanIds: ['plan-1'] },
  { id: 'proj-2', name: 'Civicline HQ Refresh',        clientId: '', address: 'Civicline Tower, Floor 8',         status: 'Active'   as const, phaseCode: 'phase-3', progress: 42, budget: '$0', startDate: '2026-02-01', managerId: '', assignedUserIds: [], floorPlanIds: ['plan-2'] },
  { id: 'proj-3', name: 'Ridgeview Access Upgrade',    clientId: '', address: 'Ridgeview Campus',                 status: 'Review'   as const, phaseCode: 'phase-5', progress: 84, budget: '$0', startDate: '2025-11-10', managerId: '', assignedUserIds: [], floorPlanIds: ['plan-3'] },
  // ── Dashboard example projects ────────────────────────────────────────────
  { id: 'dash-1',  name: 'HERE Arts Center',              clientId: '', address: '145 6th Ave',                       status: 'Active'   as const, phaseCode: 'phase-3', progress: 42, budget: '$0', startDate: '2026-03-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-2',  name: 'Adaptive Build',                clientId: '', address: '200 Park Ave S, Suite 1702',        status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-04-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-3',  name: 'AO Management',                 clientId: '', address: '287 Park Ave S',                    status: 'Planning' as const, phaseCode: 'phase-1', progress:  8, budget: '$0', startDate: '2026-05-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-4',  name: 'Atlas Wellness Clinic',         clientId: '', address: '505 8th Ave, 12th Floor',           status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-04-15', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-5',  name: 'Bharati Center',                clientId: '', address: '305 Schermerhorn St',               status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-04-20', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-6',  name: 'Dailymotion',                   clientId: '', address: '150 W 22nd St 12 Floor',            status: 'Review'   as const, phaseCode: 'phase-7', progress: 95, budget: '$0', startDate: '2025-09-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-7',  name: 'Earned',                        clientId: '', address: '287 Park Ave S 7th Floor',          status: 'Complete' as const, phaseCode: 'phase-5', progress: 84, budget: '$0', startDate: '2025-10-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-8',  name: 'Fever Up',                      clientId: '', address: '483-485 Broadway',                  status: 'Active'   as const, phaseCode: 'phase-4', progress: 62, budget: '$0', startDate: '2026-02-15', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-9',  name: 'Herald Center',                 clientId: '', address: '1239 Broadway',                     status: 'Active'   as const, phaseCode: 'phase-3', progress: 42, budget: '$0', startDate: '2026-03-10', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-10', name: 'Herald Towers Elevator project',clientId: '', address: 'HT Elevators 2026',                 status: 'Active'   as const, phaseCode: 'phase-3', progress: 42, budget: '$0', startDate: '2026-03-05', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-11', name: 'Instant One',                   clientId: '', address: '53W 21th St',                       status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-05-10', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-12', name: 'Irving Realty',                 clientId: '', address: '33W 17th St',                       status: 'Planning' as const, phaseCode: 'phase-1', progress:  8, budget: '$0', startDate: '2026-06-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-13', name: 'Jembrealty',                    clientId: '', address: '150 Broadway 4th Floor',            status: 'Planning' as const, phaseCode: 'phase-1', progress:  8, budget: '$0', startDate: '2026-06-05', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-14', name: 'Khaite',                        clientId: '', address: '65 Bleeker Street 9th floor',       status: 'Active'   as const, phaseCode: 'phase-3', progress: 45, budget: '$0', startDate: '2026-02-20', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-15', name: 'Le Parc',                       clientId: '', address: '287 Park Ave S',                    status: 'Active'   as const, phaseCode: 'phase-4', progress: 62, budget: '$0', startDate: '2026-01-20', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-16', name: 'Metaforms AI',                  clientId: '', address: '30 East 23rd Street',               status: 'Review'   as const, phaseCode: 'phase-7', progress: 95, budget: '$0', startDate: '2025-08-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-17', name: 'Neighborhood Restore',          clientId: '', address: '150 Broadway',                      status: 'Review'   as const, phaseCode: 'phase-7', progress: 95, budget: '$0', startDate: '2025-09-15', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-18', name: 'Park Pictures',                 clientId: '', address: '184 5th Ave',                       status: 'Planning' as const, phaseCode: 'phase-1', progress:  8, budget: '$0', startDate: '2026-06-10', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-19', name: 'Pharsalus',                     clientId: '', address: '200 Varick St, Floor 8',            status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-05-20', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-20', name: 'Phaze App',                     clientId: '', address: '330 7th Ave 21th Floor',            status: 'Complete' as const, phaseCode: 'phase-5', progress: 84, budget: '$0', startDate: '2025-10-10', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-21', name: 'Probook AI',                    clientId: '', address: '130 Madison Avenue',                status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-05-25', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-22', name: 'Runway',                        clientId: '', address: '18 West 18th Street, Floor 8',      status: 'Review'   as const, phaseCode: 'phase-7', progress: 95, budget: '$0', startDate: '2025-11-01', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-23', name: 'SFI Sunbeth',                   clientId: '', address: '375 9th Avenue',                    status: 'Planning' as const, phaseCode: 'phase-1', progress:  8, budget: '$0', startDate: '2026-06-15', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-24', name: 'Skillz',                        clientId: '', address: '150 Broadway 15th Floor',           status: 'Active'   as const, phaseCode: 'phase-4', progress: 62, budget: '$0', startDate: '2026-02-10', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-25', name: 'Sola Salon',                    clientId: '', address: '50 W 17th Street',                  status: 'Active'   as const, phaseCode: 'phase-4', progress: 62, budget: '$0', startDate: '2026-01-25', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-26', name: 'Sola Salon',                    clientId: '', address: '666 Broadway',                      status: 'Active'   as const, phaseCode: 'phase-4', progress: 62, budget: '$0', startDate: '2026-02-05', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-27', name: 'Still Here',                    clientId: '', address: '905 Madison Ave',                   status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-05-15', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-28', name: 'Sutton Smyth',                  clientId: '', address: '155 E 55th St #6C',                 status: 'Review'   as const, phaseCode: 'phase-7', progress: 95, budget: '$0', startDate: '2025-10-20', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-29', name: 'The Globe Show Room',           clientId: '', address: '236W 38th St',                      status: 'Planning' as const, phaseCode: 'phase-2', progress: 22, budget: '$0', startDate: '2026-05-05', managerId: '', assignedUserIds: [], floorPlanIds: [] },
  { id: 'dash-30', name: 'Too Lost',                      clientId: '', address: '915 Broadway 801',                  status: 'Complete' as const, phaseCode: 'phase-5', progress: 84, budget: '$0', startDate: '2025-11-20', managerId: '', assignedUserIds: [], floorPlanIds: [] },
]

// ── Floor Plans ───────────────────────────────────────────────────────────────
// Consumed by DemoDataProvider when useExampleData is ON.

export const EXAMPLE_FLOOR_PLANS = [
  { id: 'plan-1', projectId: 'proj-1', name: 'Level 4 clinical wing',     type: 'image' as const, uploadedAt: '2026-06-08', previewUrl: '' },
  { id: 'plan-2', projectId: 'proj-2', name: 'Headquarters floor plate',  type: 'pdf'   as const, uploadedAt: '2026-06-12' },
  { id: 'plan-3', projectId: 'proj-3', name: 'Campus access zones',       type: 'image' as const, uploadedAt: '2026-05-19', previewUrl: '' },
]

// ── Tasks ─────────────────────────────────────────────────────────────────────
// Consumed by DemoDataProvider when useExampleData is ON.

export const EXAMPLE_TASKS = [
  { id: 'task-1', projectId: 'proj-1', floorPlanId: 'plan-1', title: 'IT room router cutover',         category: 'Network',        status: 'In Progress' as const, assigneeId: 'emp-4', priority: 'High'   as const, dueDate: '2026-06-19', checklistIds: ['check-1'], x_percent: 28, y_percent: 34, description: 'Replace temporary router, verify VLAN routing, and capture rack photo.' },
  { id: 'task-2', projectId: 'proj-1', floorPlanId: 'plan-1', title: 'Firewall handoff label',         category: 'Security',       status: 'Scheduled'   as const, assigneeId: 'emp-1', priority: 'Medium' as const, dueDate: '2026-06-20', checklistIds: ['check-3'], x_percent: 63, y_percent: 42, description: 'Apply final labels and update the client handoff sheet.' },
  { id: 'task-3', projectId: 'proj-1', floorPlanId: 'plan-1', title: 'Nurse station access reader',    category: 'Access Control', status: 'Backlog'      as const, assigneeId: 'emp-4', priority: 'Medium' as const, dueDate: '2026-06-24', checklistIds: [],           x_percent: 46, y_percent: 72, description: 'Install badge reader and confirm door schedule.' },
  { id: 'task-4', projectId: 'proj-2', floorPlanId: 'plan-2', title: 'Conference room A/V rough-in',   category: 'A/V',            status: 'Blocked'      as const, assigneeId: 'emp-2', priority: 'High'   as const, dueDate: '2026-06-26', checklistIds: [],           x_percent: 52, y_percent: 51, description: 'Waiting on ceiling grid access before cable pull.' },
  { id: 'task-5', projectId: 'proj-3', floorPlanId: 'plan-3', title: 'Final access report',            category: 'Closeout',       status: 'Done'         as const, assigneeId: 'emp-3', priority: 'Low'    as const, dueDate: '2026-06-14', checklistIds: ['check-2'],                               description: 'Package final notes and client signoff.' },
]

// ── Time Entries ──────────────────────────────────────────────────────────────

export const EXAMPLE_TIME_ENTRIES = [
  { id: 'time-1', employeeId: 'emp-1', projectId: 'proj-1', date: '2026-06-17', clockIn: '07:58', breakMinutes: 30, hours: 6.4, locationStatus: 'Inside geofence' },
  { id: 'time-2', employeeId: 'emp-2', projectId: 'proj-2', date: '2026-06-17', clockIn: '08:24', breakMinutes: 20, hours: 4.1, locationStatus: 'Manual review'    },
  { id: 'time-3', employeeId: 'emp-3', projectId: 'proj-3', date: '2026-06-17', clockIn: '07:41', breakMinutes: 15, hours: 5.7, locationStatus: 'Inside geofence' },
  { id: 'time-4', employeeId: 'emp-4', projectId: 'proj-1', date: '2026-06-16', clockIn: '08:10', clockOut: '16:36', breakMinutes: 45, hours: 7.7, locationStatus: 'Remote' },
]

// ── Gallery Photos ────────────────────────────────────────────────────────────

export const EXAMPLE_GALLERY_PHOTOS = [
  { id: 'photo-1', projectId: 'proj-1', title: 'Rack before turnover',       category: 'Network',        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80', uploadedBy: 'emp-4', uploadedAt: '2026-06-16' },
  { id: 'photo-2', projectId: 'proj-1', title: 'Clinical corridor device',   category: 'Access Control', url: 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&w=900&q=80', uploadedBy: 'emp-1', uploadedAt: '2026-06-15' },
  { id: 'photo-3', projectId: 'proj-2', title: 'Conference room ceiling',    category: 'A/V',            url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80', uploadedBy: 'emp-2', uploadedAt: '2026-06-14' },
]

// ── Activity Log ──────────────────────────────────────────────────────────────

export const EXAMPLE_ACTIVITY_LOG = [
  { id: 'act-1', projectId: 'proj-1', actorId: 'emp-1', action: 'moved Firewall handoff label to Scheduled', timestamp: '2026-06-17 10:22' },
  { id: 'act-2', projectId: 'proj-1', actorId: 'emp-4', action: 'uploaded Rack before turnover',             timestamp: '2026-06-16 16:08' },
  { id: 'act-3', projectId: 'proj-2', actorId: 'emp-2', action: 'created A/V rough-in blocker',              timestamp: '2026-06-17 09:47' },
]

// ── Templates ─────────────────────────────────────────────────────────────────

export const EXAMPLE_TEMPLATES = [
  { id: 'tmpl-1', name: 'Low-voltage project', type: 'Project',   updatedAt: '2026-06-11', sections: ['Discovery', 'Plan', 'Install', 'QA', 'Closeout'] },
  { id: 'tmpl-2', name: 'Floor plan task',     type: 'Task',      updatedAt: '2026-06-10', sections: ['Location', 'Materials', 'Checklist', 'Photos'] },
  { id: 'tmpl-3', name: 'Client closeout',     type: 'Checklist', updatedAt: '2026-05-31', sections: ['Approvals', 'Assets', 'Archive'] },
]

// ── Checklists ────────────────────────────────────────────────────────────────

export const EXAMPLE_CHECKLISTS = [
  { id: 'check-1', title: 'Network closet turnover', scope: 'Task',    items: ['Label patch panels', 'Photograph rack', 'Confirm uplink', 'Attach as-built notes'] },
  { id: 'check-2', title: 'Account closeout',        scope: 'Account', items: ['Collect approvals', 'Export photos', 'Send client packet'] },
  { id: 'check-3', title: 'Security install QA',     scope: 'Project', items: ['Validate camera angles', 'Run access test', 'Confirm retention policy'] },
]
