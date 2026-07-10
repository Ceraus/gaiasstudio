import { AlertCircle, ChevronLeft, ChevronRight, Filter, RefreshCw, Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { CUSTOMER_PAGE_SIZE_OPTIONS, fetchCustomers, syncCustomersFromAtera, type CustomerRecord } from "./customerApi";

const PAGE_STATE_KEY = "command2.customers.pagination";

type FilterState = {
  status: string;
  source: string;
  state: string;
  city: string;
};

export function CustomersPage() {
  const navigate = useNavigate();
  const initialPageState = readPageState();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [page, setPage] = useState(initialPageState.page);
  const [pageSize, setPageSize] = useState(initialPageState.pageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({ status: "all", source: "all", state: "all", city: "all" });
  const [draftFilters, setDraftFilters] = useState<FilterState>(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchCustomers({ page, pageSize });
      setCustomers(payload.data);
      setPage(payload.page);
      setPageSize(payload.pageSize);
      setTotalCount(payload.totalCount);
      setTotalPages(payload.totalPages);
      setSyncedAt(payload.syncedAt);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    window.localStorage.setItem(PAGE_STATE_KEY, JSON.stringify({ page, pageSize }));
  }, [page, pageSize]);

  const filterOptions = useMemo(() => {
    return {
      status: uniqueValues(customers.map((customer) => customer.status)),
      source: uniqueValues(customers.map((customer) => customer.source)),
      state: uniqueValues(customers.map((customer) => customer.state)),
      city: uniqueValues(customers.map((customer) => customer.city))
    };
  }, [customers]);

  const visibleCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        [customer.name, customer.email, customer.phone, customer.domain, customer.city, customer.state, customer.address]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus = filters.status === "all" || (customer.status ?? "N/A") === filters.status;
      const matchesSource = filters.source === "all" || customer.source === filters.source;
      const matchesState = filters.state === "all" || (customer.state ?? "N/A") === filters.state;
      const matchesCity = filters.city === "all" || (customer.city ?? "N/A") === filters.city;
      return matchesQuery && matchesStatus && matchesSource && matchesState && matchesCity;
    });
  }, [customers, filters, query]);

  const activeFilterCount = Object.values(filters).filter((value) => value !== "all").length;

  useEffect(() => {
    if (!filtersOpen) return;

    setDraftFilters(filters);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filters, filtersOpen]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await syncCustomersFromAtera();
      await loadCustomers();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Atera sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4 pb-28 lg:space-y-6 lg:pb-0">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-field sm:text-sm">Customers</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-ink sm:mt-2 sm:text-3xl">Client directory</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-2 sm:text-base">Atera-backed customer records, search, filters, and account detail access.</p>
          <p className="mt-1 text-xs font-semibold text-slate-400 sm:mt-2">Last synced {formatDateTime(syncedAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 sm:min-h-0"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} aria-hidden="true" />
          Sync from Atera
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft lg:hidden">
        <label className="text-xs font-bold uppercase text-slate-500">
          Search
          <span className="relative mt-2 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customers"
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-base font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-field focus:bg-white"
            />
          </span>
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm active:scale-[0.99]"
        >
          <Filter size={16} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>}
        </button>
      </section>

      <section className="hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-soft lg:block">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="min-w-0 flex-1 text-xs font-bold uppercase text-slate-500">
            Search
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, phone, domain, city, state, address"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-field focus:bg-white"
              />
            </span>
          </label>
          <FilterSelect label="Status" value={filters.status} options={filterOptions.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
          <FilterSelect label="Source" value={filters.source} options={filterOptions.source} onChange={(source) => setFilters((current) => ({ ...current, source }))} />
          <FilterSelect label="State" value={filters.state} options={filterOptions.state} onChange={(state) => setFilters((current) => ({ ...current, state }))} />
          <FilterSelect label="City" value={filters.city} options={filterOptions.city} onChange={(city) => setFilters((current) => ({ ...current, city }))} />
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertCircle size={16} aria-hidden="true" />
          <span className="min-w-0">{error}</span>
        </div>
      )}

      <section className="hidden min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft lg:block">
        <div className="app-scroll overflow-x-auto scrollbar-soft" tabIndex={0} aria-label="Scrollable customer table">
          <table className="min-w-[1180px] divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Client/Customer", "Email", "Phone", "Address", "City", "State", "Domain", "Status"].map((header) => (
                  <th key={header} className="px-4 py-4 font-semibold sm:px-5">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCustomers.map((customer) => (
                <tr key={customer.id} onClick={() => navigate(`/customers/${encodeURIComponent(customer.id)}`)} className="cursor-pointer transition hover:bg-slate-50">
                  <td className="px-4 py-4 align-middle sm:px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={customer.name} className="h-9 w-9 text-xs" />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{customer.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={customer.source} />
                          {customer.ateraCustomerId && <span className="text-xs font-semibold text-slate-400">#{customer.ateraCustomerId}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <TableCell>{display(customer.email)}</TableCell>
                  <TableCell>{display(customer.phone)}</TableCell>
                  <TableCell>{display(customer.address)}</TableCell>
                  <TableCell>{display(customer.city)}</TableCell>
                  <TableCell>{display(customer.state)}</TableCell>
                  <TableCell>{display(customer.domain)}</TableCell>
                  <td className="px-4 py-4 align-middle sm:px-5">{customer.status ? <StatusBadge>{titleCase(customer.status)}</StatusBadge> : <span className="text-slate-400">N/A</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="border-t border-slate-100 px-5 py-6 text-sm font-semibold text-slate-500">Loading customers...</div>}
        {!loading && visibleCustomers.length === 0 && (
          <div className="border-t border-slate-100 p-5">
            <EmptyState icon={Users} title="No customers found" body="No backend customer records matched the current page, search, and filters." />
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            Page {page} of {totalPages} · {totalCount} synced customers
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              Per page
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-field"
              >
                {CUSTOMER_PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className="compact-control grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40">
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading} className="compact-control grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40">
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft lg:hidden">
        <div className="divide-y divide-slate-100">
          {visibleCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => navigate(`/customers/${encodeURIComponent(customer.id)}`)}
              className="block w-full px-4 py-4 text-left transition active:bg-slate-50"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Avatar name={customer.name} className="h-10 w-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 max-w-full break-words text-base font-bold leading-snug text-ink">{customer.name}</p>
                    {customer.status ? <StatusBadge>{titleCase(customer.status)}</StatusBadge> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={customer.source} />
                    {customer.ateraCustomerId && <span className="text-xs font-semibold text-slate-400">#{customer.ateraCustomerId}</span>}
                  </div>
                  <div className="mt-3 grid gap-1.5 text-sm font-semibold text-slate-600">
                    <MobileValue label="Email" value={customer.email} />
                    <MobileValue label="Phone" value={customer.phone} />
                    <MobileValue label="Location" value={[customer.city, customer.state].filter(Boolean).join(", ") || null} />
                    <MobileValue label="Domain" value={customer.domain} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {loading && <div className="border-t border-slate-100 px-4 py-5 text-sm font-semibold text-slate-500">Loading customers...</div>}
        {!loading && visibleCustomers.length === 0 && (
          <div className="border-t border-slate-100 p-4">
            <EmptyState icon={Users} title="No customers found" body="No backend customer records matched the current page, search, and filters." />
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} loading={loading} onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }} onPrevious={() => setPage((value) => Math.max(1, value - 1))} onNext={() => setPage((value) => Math.min(totalPages, value + 1))} compact />
      </section>

      <FilterSheet
        open={filtersOpen}
        filters={draftFilters}
        filterOptions={filterOptions}
        activeFilterCount={activeFilterCount}
        onChange={(next) => setDraftFilters(next)}
        onClear={() => setDraftFilters({ status: "all", source: "all", state: "all", city: "all" })}
        onApply={() => {
          setFilters(draftFilters);
          setFiltersOpen(false);
        }}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-36 text-xs font-bold uppercase text-slate-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-semibold normal-case text-slate-700 outline-none focus:border-field lg:min-h-0 lg:py-3 lg:text-sm">
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableCell({ children }: { children: string }) {
  return <td className="max-w-64 truncate px-4 py-4 align-middle text-slate-700 sm:px-5">{children}</td>;
}

function MobileValue({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2">
      <span className="text-xs font-bold uppercase text-slate-400">{label}</span>
      <span className="min-w-0 break-words text-slate-700">{display(value)}</span>
    </p>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  loading,
  onPageSizeChange,
  onPrevious,
  onNext,
  compact = false
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  loading: boolean;
  onPageSizeChange: (size: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between sm:px-5"}`}>
      <span className="font-semibold">
        Page {page} of {totalPages} · {totalCount} synced customers
      </span>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-500">
          Per page
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-700 outline-none focus:border-field sm:text-sm"
          >
            {CUSTOMER_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevious} disabled={page <= 1 || loading} className="compact-control grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={onNext} disabled={page >= totalPages || loading} className="compact-control grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSheet({
  open,
  filters,
  filterOptions,
  activeFilterCount,
  onChange,
  onClear,
  onApply,
  onClose
}: {
  open: boolean;
  filters: FilterState;
  filterOptions: Record<keyof FilterState, string[]>;
  activeFilterCount: number;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const draftCount = Object.values(filters).filter((value) => value !== "all").length;

  return (
    <div className={`fixed inset-0 z-[60] lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button type="button" aria-label="Close filters" onClick={onClose} className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customer filters"
        className={`absolute inset-x-0 bottom-0 max-h-[86svh] overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 pt-[max(0.75rem,var(--safe-top))]">
          <div>
            <h2 className="text-base font-bold text-ink">Filters</h2>
            <p className="text-xs font-semibold text-slate-400">{draftCount || activeFilterCount || 0} active</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close filters" className="compact-control grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600">
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="app-scroll max-h-[calc(86svh-8.5rem)] space-y-4 overflow-y-auto px-4 py-4">
          <FilterSelect label="Status" value={filters.status} options={filterOptions.status} onChange={(status) => onChange({ ...filters, status })} />
          <FilterSelect label="Source" value={filters.source} options={filterOptions.source} onChange={(source) => onChange({ ...filters, source })} />
          <FilterSelect label="State" value={filters.state} options={filterOptions.state} onChange={(state) => onChange({ ...filters, state })} />
          <FilterSelect label="City" value={filters.city} options={filterOptions.city} onChange={(city) => onChange({ ...filters, city })} />
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-4 pb-[max(1rem,var(--safe-bottom))] pt-3">
          <button type="button" onClick={onClear} className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700">
            Clear
          </button>
          <button type="button" onClick={onApply} className="min-h-11 flex-1 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export function SourceBadge({ source }: { source: string }) {
  if (source === "atera") {
    return <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase text-blue-700">Atera</span>;
  }
  if (source === "manual") {
    return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">Manual</span>;
  }
  return <span className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-slate-400">Unknown</span>;
}

function readPageState() {
  try {
    const raw = window.localStorage.getItem(PAGE_STATE_KEY);
    if (!raw) return { page: 1, pageSize: 25 };
    const parsed = JSON.parse(raw) as { page?: unknown; pageSize?: unknown };
    const page = typeof parsed.page === "number" && parsed.page > 0 ? Math.floor(parsed.page) : 1;
    const pageSize = typeof parsed.pageSize === "number" && CUSTOMER_PAGE_SIZE_OPTIONS.includes(parsed.pageSize as (typeof CUSTOMER_PAGE_SIZE_OPTIONS)[number]) ? parsed.pageSize : 25;
    return { page, pageSize };
  } catch {
    return { page: 1, pageSize: 25 };
  }
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => value || "N/A"))).filter((value) => value !== "N/A").sort((a, b) => a.localeCompare(b));
}

function display(value: string | null) {
  return value?.trim() ? value : "N/A";
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
