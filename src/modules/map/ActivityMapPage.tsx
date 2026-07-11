import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ChevronLeft, ChevronRight, Clock, Coffee, LogIn, LogOut, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, ScaleControl, TileLayer, useMap } from "react-leaflet";
import { useAppSelector } from "@/store/hooks";
import {
  EXAMPLE_EMPLOYEES,
  EXAMPLE_MAP_PROJECTS,
  EXAMPLE_CLOCK_EVENTS,
  type ExampleEmployee,
  type ExampleMapProject,
  type ExampleClockEvent,
  type ExampleEventType,
} from "@/core/example/exampleDataPayloads";

// Re-use the exact shapes from the example payload so there are no local type
// duplications. The component exclusively reads from `exampleDataPayloads.ts`
// when useExampleData is ON, and renders a clean empty state when OFF.
type MapEmployee = Pick<ExampleEmployee, "id" | "name" | "initials" | "role">;
type MapProject  = ExampleMapProject;
type EventType   = ExampleEventType;
type ClockEvent  = ExampleClockEvent;

const eventColors: Record<EventType, string> = {
  "Clock-In":  "#16a34a",
  "Clock-Out": "#2563eb",
  Break:       "#f59e0b",
};

const DEFAULT_CENTER: [number, number] = [40.7282, -74.0122];
const DEFAULT_DATE   = new Date("2026-06-18T12:00:00");

export function ActivityMapPage() {
  const useExampleData = useAppSelector((s) => s.account.useExampleData);

  // Data derived from the example gateway — empty arrays when toggle is OFF.
  const employees: MapEmployee[] = useExampleData ? EXAMPLE_EMPLOYEES : [];
  const projects:  MapProject[]  = useExampleData ? EXAMPLE_MAP_PROJECTS : [];
  const allEvents: ClockEvent[]  = useExampleData ? EXAMPLE_CLOCK_EVENTS : [];

  const [selectedDate, setSelectedDate] = useState(DEFAULT_DATE);
  const [projectFilter, setProjectFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState(allEvents[0]?.id ?? "");
  const mapRef = useRef<L.Map | null>(null);

  // Reset filters and selection when the toggle changes.
  useEffect(() => {
    setProjectFilter("all");
    setEmployeeFilter("all");
    setSelectedDate(DEFAULT_DATE);
    setSelectedEventId(useExampleData ? EXAMPLE_CLOCK_EVENTS[0]?.id ?? "" : "");
  }, [useExampleData]);

  const dayKey = selectedDate.toISOString().slice(0, 10);
  const filteredEvents = useMemo(() => allEvents.filter((ev) => {
    const matchesDate     = ev.timestamp.slice(0, 10) === dayKey;
    const matchesProject  = projectFilter  === "all" || ev.projectId  === projectFilter;
    const matchesEmployee = employeeFilter === "all" || ev.employeeId === employeeFilter;
    return matchesDate && matchesProject && matchesEmployee;
  }), [allEvents, dayKey, employeeFilter, projectFilter]);

  const selectedEvent = filteredEvents.find((ev) => ev.id === selectedEventId) ?? filteredEvents[0];
  const center: [number, number] = selectedEvent
    ? [selectedEvent.lat, selectedEvent.lng]
    : DEFAULT_CENTER;

  function selectEvent(ev: ClockEvent) {
    setSelectedEventId(ev.id);
    mapRef.current?.flyTo([ev.lat, ev.lng], 15, { duration: 0.45 });
  }

  function shiftDay(amount: number) {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + amount);
      return next;
    });
    setSelectedEventId("");
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f7fb] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Workforce</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Activity Map</h1>
        </div>
        <DateControl date={selectedDate} onPrevious={() => shiftDay(-1)} onNext={() => shiftDay(1)} />
      </div>

      {/* Empty state when no data (useExampleData is OFF) */}
      {!useExampleData ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-white">
          <MapPin size={36} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">No activity data</p>
          <p className="max-w-xs text-center text-xs text-slate-400">
            Enable Example Data in the sidebar to preview field activity, or connect to the
            backend to stream live clock events.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:max-w-xl sm:grid-cols-2">
            <SelectFilter
              label="Project"
              value={projectFilter}
              onChange={setProjectFilter}
              options={[{ id: "all", name: "All projects" }, ...projects.map((p) => ({ id: p.id, name: p.name }))]}
            />
            <SelectFilter
              label="Employee"
              value={employeeFilter}
              onChange={setEmployeeFilter}
              options={[{ id: "all", name: "All employees" }, ...employees.map((e) => ({ id: e.id, name: e.name }))]}
            />
          </div>

          <section className="grid min-h-[calc(100vh-210px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[340px_minmax(0,1fr)]">
            <EventPanel
              events={filteredEvents}
              employees={employees}
              projects={projects}
              selectedEventId={selectedEvent?.id}
              onSelect={selectEvent}
            />
            <div className="relative min-h-[520px] lg:min-h-0">
              <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full min-h-[520px] w-full lg:min-h-full" ref={mapRef}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ScaleControl position="bottomleft" />
                <MapFocus event={selectedEvent} />
                {filteredEvents.map((ev) => (
                  <Marker
                    key={ev.id}
                    position={[ev.lat, ev.lng]}
                    icon={createEventIcon(ev.type, ev.id === selectedEvent?.id)}
                    eventHandlers={{ click: () => selectEvent(ev) }}
                  />
                ))}
              </MapContainer>
              {!filteredEvents.length && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/40">
                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-lg">
                    No activity for this filter.
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EventPanel({
  events,
  employees,
  projects,
  selectedEventId,
  onSelect,
}: {
  events: ClockEvent[];
  employees: MapEmployee[];
  projects: MapProject[];
  selectedEventId?: string;
  onSelect: (ev: ClockEvent) => void;
}) {
  return (
    <aside className="order-2 max-h-[44vh] overflow-y-auto border-t border-slate-200 bg-white lg:order-none lg:max-h-none lg:border-r lg:border-t-0">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-4 backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Events</p>
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <p className="text-xs text-slate-400">No events on this day.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {events.map((ev) => {
            const employee = employees.find((e) => e.id === ev.employeeId);
            const project  = projects.find((p)  => p.id === ev.projectId);
            const active = ev.id === selectedEventId;
            const Icon = ev.type === "Clock-In" ? LogIn : ev.type === "Clock-Out" ? LogOut : Coffee;
            return (
              <button key={ev.id} onClick={() => onSelect(ev)} className={`flex w-full gap-3 px-5 py-4 text-left transition ${active ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">
                  {employee?.initials ?? "--"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{employee?.name ?? "Unknown employee"}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {project?.company ?? "Clearplan Command"} / {project?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">{formatTime(ev.timestamp)}</span>
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    <Icon size={13} style={{ color: eventColors[ev.type] }} />
                    {ev.type}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function DateControl({ date, onPrevious, onNext }: { date: Date; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" aria-label="Previous day" onClick={onPrevious} className="grid h-11 w-11 place-items-center border-r border-slate-100 text-slate-600 hover:bg-slate-50"><ChevronLeft size={18} /></button>
      <button type="button" aria-label="Next day"     onClick={onNext}     className="grid h-11 w-11 place-items-center border-r border-slate-100 text-slate-600 hover:bg-slate-50"><ChevronRight size={18} /></button>
      <div className="flex h-11 min-w-44 items-center justify-center gap-2 px-4 text-sm font-bold text-slate-600">
        <Clock size={15} className="text-slate-400" />
        {date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold normal-case text-slate-600 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
  const size  = active ? 34 : 28;
  const anchor = size / 2;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:4px solid white;box-shadow:0 12px 24px rgba(15,23,42,.24);display:grid;place-items:center;color:white;font-weight:900;font-size:12px;"><span>${type === "Break" ? "BR" : type === "Clock-In" ? "IN" : "OUT"}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
  });
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
