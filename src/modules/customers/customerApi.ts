import { apiClient } from "@/core/api";

type AnyRecord = Record<string, unknown>;

export type CustomerSource = "atera" | "manual" | "unknown";

export type CustomerContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
};

export type CustomerRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  domain: string | null;
  status: string | null;
  source: CustomerSource;
  ateraCustomerId: string | null;
  businessNumber: string | null;
  notes: string | null;
  syncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contacts: CustomerContact[];
  sections: Record<CustomerDetailSection, unknown[]>;
};

export type CustomerListResult = {
  data: CustomerRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  syncedAt: string | null;
};

export type CustomerListQuery = {
  page: number;
  pageSize: number;
};

export const CUSTOMER_PAGE_SIZE_OPTIONS = [25, 50, 100, 500] as const;

export type CustomerDetailSection =
  | "contacts"
  | "devices"
  | "contracts"
  | "assets"
  | "tickets"
  | "alerts"
  | "passwords"
  | "attachments"
  | "workFromHome"
  | "invoices";

const CLIENTS_PATH = "/api/v1/clients";

export async function fetchCustomers(query: CustomerListQuery): Promise<CustomerListResult> {
  const raw = await apiClient.get<unknown>(CLIENTS_PATH, {
    query: {
      page: query.page,
      pageSize: query.pageSize
    }
  });

  return mapCustomerListResult(raw, query);
}

export async function fetchCustomer(id: string): Promise<CustomerRecord> {
  const raw = await apiClient.get<unknown>(`${CLIENTS_PATH}/${encodeURIComponent(id)}`);
  return mapCustomer(unwrapData(raw));
}

export async function syncCustomersFromAtera(): Promise<CustomerListResult> {
  const raw = await apiClient.post<unknown>(CLIENTS_PATH, {});
  return mapCustomerListResult(raw, { page: 1, pageSize: 25 });
}

function mapCustomerListResult(raw: unknown, query: CustomerListQuery): CustomerListResult {
  const isArrayDirect = Array.isArray(raw);
  const source = isArrayDirect ? { data: raw } : toRecord(raw);
  const dataEnvelope = toRecord(source.data);
  const payload = Array.isArray(source.data) || isArrayDirect ? source : dataEnvelope;
  const meta = toRecord(payload.meta);
  const rowsRaw = unwrapList(payload);
  const data = rowsRaw.map(mapCustomer);
  const pageSize = asNumber(pick(payload, "pageSize", "perPage", "per_page") ?? pick(meta, "pageSize", "perPage", "per_page"), query.pageSize);
  const totalCount = asNumber(pick(payload, "totalCount", "total") ?? pick(meta, "totalCount", "total"), data.length);
  const page = asNumber(pick(payload, "page", "currentPage", "current_page") ?? pick(meta, "page", "currentPage", "current_page"), query.page);
  const totalPages = asNumber(pick(payload, "totalPages", "last_page") ?? pick(meta, "totalPages", "last_page"), Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))));

  return {
    data,
    totalCount,
    totalPages,
    page,
    pageSize,
    syncedAt: asNullableString(pick(payload, "syncedAt", "synced_at"))
  };
}

function mapCustomer(raw: unknown): CustomerRecord {
  const row = toRecord(raw);
  const ateraProfile = toRecord(pick(row, "ateraProfile", "atera_profile"));
  const sourcePayload = toRecord(pick(row, "sourcePayload", "source_payload", "rawPayload", "raw_payload"));
  const contactsRaw = unwrapList(pick(row, "contacts"));
  const ateraCustomerId = asNullableString(
    pick(row, "ateraCustomerId", "atera_customer_id", "customerId", "customer_id") ??
      pick(ateraProfile, "ateraCustomerId", "atera_customer_id", "customerId", "customer_id") ??
      pick(sourcePayload, "CustomerID", "customerID", "customerId", "customer_id")
  );
  const explicitSource = asNullableString(pick(row, "source", "origin"));
  const source: CustomerSource = ateraCustomerId || explicitSource?.toLowerCase() === "atera" || Object.keys(ateraProfile).length > 0 ? "atera" : explicitSource ? "manual" : "unknown";

  return {
    id: asString(pick(row, "id", "uuid", "clientId", "client_id", "customerUuid", "customer_uuid", "customerId", "customer_id", "ateraCustomerId", "atera_customer_id")),
    name: asString(pick(row, "name", "customerName", "customer_name", "displayName", "display_name"), "Untitled customer"),
    email: asNullableString(pick(row, "email") ?? pick(ateraProfile, "email") ?? pick(sourcePayload, "Email", "email")),
    phone: asNullableString(pick(row, "phone") ?? pick(ateraProfile, "phone") ?? pick(sourcePayload, "Phone", "phone")),
    address: asNullableString(pick(row, "address") ?? pick(ateraProfile, "address") ?? pick(sourcePayload, "Address", "address")),
    city: asNullableString(pick(row, "city") ?? pick(ateraProfile, "city") ?? pick(sourcePayload, "City", "city")),
    state: asNullableString(pick(row, "state") ?? pick(ateraProfile, "state") ?? pick(sourcePayload, "State", "state")),
    zipCode: asNullableString(pick(row, "zipCode", "zip_code", "zip") ?? pick(ateraProfile, "zipCode", "zip_code", "zip") ?? pick(sourcePayload, "ZipCode", "ZipCodeStr", "zipCode", "zip")),
    country: asNullableString(pick(row, "country") ?? pick(ateraProfile, "country") ?? pick(sourcePayload, "Country", "country")),
    domain: normalizeDomain(pick(row, "domain", "website") ?? pick(ateraProfile, "domain", "website") ?? pick(sourcePayload, "Domain", "Website", "domain", "website")),
    status: asNullableString(pick(row, "status", "lifecycleStatus", "lifecycle_status")),
    source,
    ateraCustomerId,
    businessNumber: asNullableString(pick(row, "businessNumber", "business_number")),
    notes: asNullableString(pick(row, "notes", "internalNotes", "internal_notes")),
    syncedAt: asNullableString(pick(row, "syncedAt", "synced_at", "ateraMasterSyncedAt", "atera_master_synced_at")),
    createdAt: asNullableString(pick(row, "createdAt", "created_at")),
    updatedAt: asNullableString(pick(row, "updatedAt", "updated_at", "lastModifiedAt", "last_modified_at")),
    contacts: contactsRaw.map(mapContact),
    sections: {
      contacts: contactsRaw.map(mapContact),
      devices: unwrapList(pick(row, "devices")),
      contracts: unwrapList(pick(row, "contracts", "ateraContracts", "atera_contracts")),
      assets: unwrapList(pick(row, "assets")),
      tickets: unwrapList(pick(row, "tickets")),
      alerts: unwrapList(pick(row, "alerts")),
      passwords: unwrapList(pick(row, "passwords")),
      attachments: unwrapList(pick(row, "attachments")),
      workFromHome: unwrapList(pick(row, "workFromHome", "work_from_home")),
      invoices: unwrapList(pick(row, "invoices"))
    }
  };
}

function mapContact(raw: unknown): CustomerContact {
  const row = toRecord(raw);
  const first = asNullableString(pick(row, "firstName", "first_name"));
  const last = asNullableString(pick(row, "lastName", "last_name"));
  const name = asNullableString(pick(row, "name")) ?? [first, last].filter(Boolean).join(" ");

  return {
    id: asString(pick(row, "id", "uuid", "contactId", "contact_id"), crypto.randomUUID()),
    name: name || "Unnamed contact",
    email: asNullableString(pick(row, "email")),
    phone: asNullableString(pick(row, "phone")),
    role: asNullableString(pick(row, "role", "title")),
    isPrimary: pick(row, "isPrimary", "is_primary") === true
  };
}

function unwrapData(raw: unknown): unknown {
  const row = toRecord(raw);
  return isRecord(row.data) ? row.data : raw;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const row = toRecord(raw);
  if (Array.isArray(row.data)) return row.data;
  if (isRecord(row.data) && Array.isArray(row.data.data)) return row.data.data;
  for (const key of ["customers", "items", "contacts", "devices", "contracts", "assets", "tickets", "alerts", "passwords", "attachments", "workFromHome", "work_from_home", "invoices"]) {
    if (Array.isArray(row[key])) return row[key];
  }
  return [];
}

function pick(row: AnyRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function asNullableString(value: unknown): string | null {
  const output = asString(value).trim();
  return output ? output : null;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDomain(value: unknown): string | null {
  const domain = asNullableString(value);
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}
