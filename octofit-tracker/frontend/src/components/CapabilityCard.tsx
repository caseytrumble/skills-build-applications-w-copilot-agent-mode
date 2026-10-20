import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
};

export function CapabilityCard({ title, description, loading = false, error = null, empty = false, emptyMessage, children }: Props) {
  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading ? <p role="status">Loading...</p> : null}
        {!loading && error ? <p role="alert">Unable to load {title.toLowerCase()}: {error}</p> : null}
        {!loading && !error && empty ? <p>{emptyMessage ?? `No ${title.toLowerCase()} available.`}</p> : null}
        {!loading && !error && !empty ? children : null}
      </div>
    </section>
  );
}
