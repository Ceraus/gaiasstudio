import { ArrowLeft, BriefcaseBusiness, Building2, FileText, KeyRound, Laptop, Mail, Paperclip, ReceiptText, ShieldAlert, Ticket, UserRound, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "@/shared/components/Avatar";
import { EmptyState } from "@/shared/components/EmptyState";
import { Tabs } from "@/shared/components/Tabs";
import { fetchCustomer, type CustomerDetailSection, type CustomerRecord } from "./customerApi";
import { SourceBadge } from "./CustomersPage";

const tabs: Array<{ id: "overview" | CustomerDetailSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts" },
  { id: "devices", label: "Devices" },
  { id: "contracts", label: "Contracts" },
  { id: "assets", label: "Assets" },
  { id: "tickets", label: "Tickets" },
  { id: "alerts", label: "Alerts" },
  { id: "passwords", label: "Passwords" },
  { id: "attachments", label: "Attachments" },
  { id: "workFromHome", label: "Work from Home" },
  { id: "invoices", label: "Invoices" }
];

const sectionIcons: Record<CustomerDetailSection, typeof UserRound> = {
  contacts: UserRound,
  devices: Laptop,
  contracts: BriefcaseBusiness,
  assets: Building2,
  tickets: Ticket,
  alerts: ShieldAlert,
  passwords: KeyRound,
  attachments: Paperclip,
  workFromHome: Wifi,
  invoices: ReceiptText
};

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    fetchCustomer(customerId)
      .then(setCustomer)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load customer."))
      .finally(() => setLoading(false));
  }, [customerId]);

  const meta = useMemo(() => {
    if (!customer) return [];
    return [
      { label: "Email", value: customer.email },
      { label: "Phone", value: customer.phone },
      { label: "Address", value: [customer.address, customer.city, customer.state].filter(Boolean).join(", ") || null },
      { label: "Domain", value: customer.domain }
    ];
  }, [customer]);

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-soft">Loading customer...</div>;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-field">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to customers
        </Link>
        <EmptyState icon={Building2} title="Customer unavailable" body={error ?? "The backend did not return this customer record."} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-field">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to customers
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={customer.name} className="h-14 w-14 text-base" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-3xl font-semibold text-ink">{customer.name}</h1>
                <SourceBadge source={customer.source} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">
                {meta.map((item) => (
                  <span key={item.label}>
                    {item.label}: <span className="text-slate-700">{display(item.value)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            Atera ID <span className="text-slate-800">{display(customer.ateraCustomerId)}</span>
          </div>
        </div>
      </section>

      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as typeof activeTab)}>
        {activeTab === "overview" ? <Overview customer={customer} /> : <SectionList section={activeTab} rows={customer.sections[activeTab]} />}
      </Tabs>
    </div>
  );
}

function Overview({ customer }: { customer: CustomerRecord }) {
  const fields = [
    ["Phone", customer.phone],
    ["Address", customer.address],
    ["Postal/Zip", customer.zipCode],
    ["City", customer.city],
    ["State", customer.state],
    ["Country", customer.country],
    ["Domain", customer.domain],
    ["Business ID #", customer.businessNumber],
    ["Created", formatDate(customer.createdAt)],
    ["Modified", formatDate(customer.updatedAt)]
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_1fr_1.1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="font-semibold text-ink">System fields</h2>
        <dl className="mt-5 space-y-4">
          {fields.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm">
              <dt className="font-bold text-slate-500">{label}</dt>
              <dd className="break-words font-semibold text-slate-700">{display(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="font-semibold text-ink">Custom fields</h2>
        <EmptyInline text="No custom fields returned by the backend yet." />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="font-semibold text-ink">Notes</h2>
        <div className="mt-5 min-h-64 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">{display(customer.notes)}</div>
      </div>
    </section>
  );
}

function SectionList({ section, rows }: { section: CustomerDetailSection; rows: unknown[] }) {
  const Icon = sectionIcons[section];
  if (!rows.length) {
    return <EmptyState icon={Icon} title="No data yet" body="The backend did not return records for this customer section." />;
  }

  return (
    <section className="grid gap-3">
      {rows.map((row, index) => (
        <article key={recordKey(row, index)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-ink">{recordTitle(row, section)}</h3>
              <p className="mt-1 break-words text-sm text-slate-500">{recordSummary(row)}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">{text}</p>;
}

function recordKey(row: unknown, index: number) {
  if (row && typeof row === "object" && "id" in row && row.id) return String(row.id);
  return String(index);
}

function recordTitle(row: unknown, section: CustomerDetailSection) {
  if (!row || typeof row !== "object") return section;
  const record = row as Record<string, unknown>;
  const value = record.name ?? record.title ?? record.label ?? record.email ?? record.contractName ?? record.contract_name ?? record.invoiceNumber ?? record.invoice_number;
  return value ? String(value) : "Untitled record";
}

function recordSummary(row: unknown) {
  if (!row || typeof row !== "object") return "N/A";
  const record = row as Record<string, unknown>;
  const values = ["email", "phone", "status", "role", "type", "serialNumber", "serial_number", "createdAt", "created_at"]
    .map((key) => record[key])
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);
  return values.length ? values.slice(0, 4).join(" · ") : "No additional fields returned.";
}

function display(value: string | null | undefined) {
  return value?.trim() ? value : "N/A";
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}
