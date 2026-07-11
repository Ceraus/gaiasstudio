export function HubPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-field">Clearplan Command hub</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-slate-500">Coming soon.</p>
      </div>
    </div>
  );
}
