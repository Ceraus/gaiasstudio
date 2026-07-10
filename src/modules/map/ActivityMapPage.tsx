import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ChevronLeft, ChevronRight, Clock, Coffee, LogIn, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, ScaleControl, TileLayer, useMap } from "react-leaflet";

type EventType = "Clock-In" | "Clock-Out" | "Break";

interface MapEmployee {
  id: string;
  name: string;
  initials: string;
  role: string;
}

interface MapProject {
  id: string;
  name: string;
  company: string;
}

interface ClockEvent {
  id: string;
  employeeId: string;
  projectId: string;
  type: EventType;
  timestamp: string;
  lat: number;
  lng: number;
}

const employees: MapEmployee[] = [
  { id: "emp-1", name: "Maya Chen", initials: "MC", role: "Field Lead" },
  { id: "emp-2", name: "Sam Rivera", initials: "SR", role: "Technician" },
  { id: "emp-3", name: "Priya Nair", initials: "PN", role: "Installer" },
  { id: "emp-4", name: "Jordan Lee", initials: "JL", role: "Operations Director" }
];

const projects: MapProject[] = [
  { id: "proj-northstar", name: "Northstar Clinic Expansion", company: "Clearview Global" },
  { id: "proj-hq", name: "Civicline HQ Refresh", company: "Clearview Global" },
  { id: "proj-ridgeview", name: "Ridgeview Access Upgrade", company: "Clearview Global" },
  { id: "proj-waterfront", name: "Waterfront Security Retrofit", company: "Clearview Global" }
];

const events: ClockEvent[] = [
  { id: "evt-1", employeeId: "emp-1", projectId: "proj-hq", type: "Clock-In", timestamp: "2026-06-18T09:12:00", lat: 40.7392, lng: -74.0311 },
  { id: "evt-2", employeeId: "emp-2", projectId: "proj-northstar", type: "Clock-In", timestamp: "2026-06-18T09:28:00", lat: 40.7528, lng: -73.9929 },
  { id: "evt-3", employeeId: "emp-3", projectId: "proj-ridgeview", type: "Break", timestamp: "2026-06-18T12:04:00", lat: 40.7168, lng: -74.0431 },
  { id: "evt-4", employeeId: "emp-4", projectId: "proj-waterfront", type: "Clock-Out", timestamp: "2026-06-18T17:21:00", lat: 40.7005, lng: -74.0126 },
  { id: "evt-5", employeeId: "emp-1", projectId: "proj-northstar", type: "Clock-In", timestamp: "2026-06-17T08:46:00", lat: 40.7484, lng: -73.9857 },
  { id: "evt-6", employeeId: "emp-2", projectId: "proj-hq", type: "Break", timestamp: "2026-06-17T11:39:00", lat: 40.7295, lng: -74.0044 },
  { id: "evt-7", employeeId: "emp-3", projectId: "proj-waterfront", type: "Clock-Out", timestamp: "2026-06-17T16:58:00", lat: 40.7099, lng: -74.0062 },
  { id: "evt-8", employeeId: "emp-4", projectId: "proj-ridgeview", type: "Clock-In", timestamp: "2026-06-19T09:04:00", lat: 40.7308, lng: -73.9975 },
  { id: "evt-9", employeeId: "emp-2", projectId: "proj-waterfront", type: "Clock-In", timestamp: "2026-06-19T09:33:00", lat: 40.7189, lng: -74.0152 },
  { id: "evt-10", employeeId: "emp-1", projectId: "proj-hq", type: "Break", timestamp: "2026-06-19T12:12:00", lat: 40.744, lng: -74.0248 }
];

const eventColors: Record<EventType, string> = {
  "Clock-In": "#16a34a",
  "Clock-Out": "#2563eb",
  Break: "#f59e0b"
};

const startDate = new Date("2026-06-18T12:00:00");

export function ActivityMapPage() {
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [projectFilter, setProjectFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const mapRef = useRef<L.Map | null>(null);

  const dayKey = selectedDate.toISOString().slice(0, 10);
  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesDate = event.timestamp.slice(0, 10) === dayKey;
    const matchesProject = projectFilter === "all" || event.projectId === projectFilter;
    const matchesEmployee = employeeFilter === "all" || event.employeeId === employeeFilter;
    return matchesDate && matchesProject && matchesEmployee;
  }), [dayKey, employeeFilter, projectFilter]);

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0];
  const center: [number, number] = selectedEvent ? [selectedEvent.lat, selectedEvent.lng] : [40.7282, -74.0122];

  function selectEvent(event: ClockEvent) {
    setSelectedEventId(event.id);
    mapRef.current?.flyTo([event.lat, event.lng], 15, { duration: 0.45 });
  }

  function shiftDay(amount: number) {
    setSelectedDate((date) => {
      const next = new Date(date);
      next.setDate(date.getDate() + amount);
      return next;
    });
    setSelectedEventId("");
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f7fb] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Operations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Activity Map</h1>
        </div>
        <DateControl date={selectedDate} onPrevious={() => shiftDay(-1)} onNext={() => shiftDay(1)} />
      </div>

      <div className="mb-4 grid gap-3 sm:max-w-xl sm:grid-cols-2">
        <SelectFilter label="Project" value={projectFilter} onChange={setProjectFilter} options={[{ id: "all", name: "All projects" }, ...projects.map((project) => ({ id: project.id, name: project.name }))]} />
        <SelectFilter label="Employee" value={employeeFilter} onChange={setEmployeeFilter} options={[{ id: "all", name: "All employees" }, ...employees.map((employee) => ({ id: employee.id, name: employee.name }))]} />
      </div>

      <section className="grid min-h-[calc(100vh-210px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <EventPanel events={filteredEvents} selectedEventId={selectedEvent?.id} onSelect={selectEvent} />
        <div className="relative min-h-[520px] lg:min-h-0">
          <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full min-h-[520px] w-full lg:min-h-full" ref={mapRef}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ScaleControl position="bottomleft" />
            <MapFocus event={selectedEvent} />
            {filteredEvents.map((event) => (
              <Marker key={event.id} position={[event.lat, event.lng]} icon={createEventIcon(event.type, event.id === selectedEvent?.id)} eventHandlers={{ click: () => selectEvent(event) }} />
            ))}
          </MapContainer>
          {!filteredEvents.length && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/40">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-lg">No activity for this filter.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EventPanel({ events, selectedEventId, onSelect }: { events: ClockEvent[]; selectedEventId?: string; onSelect: (event: ClockEvent) => void }) {
  return (
    <aside className="order-2 max-h-[44vh] overflow-y-auto border-t border-slate-200 bg-white lg:order-none lg:max-h-none lg:border-r lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-4 backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Event</p>
      </div>
      <div className="divide-y divide-slate-100">
        {events.map((event) => {
          const employee = employees.find((item) => item.id === event.employeeId);
          const project = projects.find((item) => item.id === event.projectId);
          const active = event.id === selectedEventId;
          const Icon = event.type === "Clock-In" ? LogIn : event.type === "Clock-Out" ? LogOut : Coffee;
          return (
            <button key={event.id} onClick={() => onSelect(event)} className={`flex w-full gap-3 px-5 py-4 text-left transition ${active ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">{employee?.initials ?? "CP"}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{employee?.name ?? "Unknown employee"}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{project?.company ?? "ClearPlan"} / {project?.name ?? "Unassigned"}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">{formatTime(event.timestamp)}</span>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  <Icon size={13} style={{ color: eventColors[event.type] }} />
                  {event.type}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function DateControl({ date, onPrevious, onNext }: { date: Date; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" aria-label="Previous day" onClick={onPrevious} className="grid h-11 w-11 place-items-center border-r border-slate-100 text-slate-600 hover:bg-slate-50"><ChevronLeft size={18} /></button>
      <button type="button" aria-label="Next day" onClick={onNext} className="grid h-11 w-11 place-items-center border-r border-slate-100 text-slate-600 hover:bg-slate-50"><ChevronRight size={18} /></button>
      <div className="flex h-11 min-w-44 items-center justify-center gap-2 px-4 text-sm font-bold text-slate-600">
        <Clock size={15} className="text-slate-400" />
        {date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold normal-case text-slate-600 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}

function MapFocus({ event }: { event?: ClockEvent }) {
  const map = useMap();
  useEffect(() => {
    if (event) map.flyTo([event.lat, event.lng], Math.max(map.getZoom(), 13), { duration: 0.35 });
  }, [event, map]);
  return null;
}

function createEventIcon(type: EventType, active: boolean) {
  const color = eventColors[type];
  return L.divIcon({
    className: "",
    html: `<div style="width:${active ? 34 : 28}px;height:${active ? 34 : 28}px;border-radius:999px;background:${color};border:4px solid white;box-shadow:0 12px 24px rgba(15,23,42,.24);display:grid;place-items:center;color:white;font-weight:900;font-size:12px;"><span>${type === "Break" ? "BR" : type === "Clock-In" ? "IN" : "OUT"}</span></div>`,
    iconSize: [active ? 34 : 28, active ? 34 : 28],
    iconAnchor: [active ? 17 : 14, active ? 17 : 14]
  });
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
