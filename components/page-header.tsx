export function PageHeader({ title, description, actions }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-[70ch] text-steel">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, children, className = "" }: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card ${className}`}>
      {title && (
        <h2 className="border-b border-line bg-well px-4 py-2.5 text-[0.95rem] font-semibold">{title}</h2>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-10 text-center text-steel">
      <svg viewBox="0 0 24 24" className="size-7 text-line" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="M3.5 10h17M8 14h8" strokeLinecap="round" />
      </svg>
      <p>{children}</p>
    </div>
  );
}
