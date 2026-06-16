export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-header fade-in">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="section-card fade-in">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted-copy">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, meta, tone = 'primary' }) {
  return (
    <article className={`stat-card tone-${tone} fade-in`}>
      <span className="label">{label}</span>
      <strong className="value">{value}</strong>
      {meta && <small className="meta">{meta}</small>}
    </article>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card" />
      ))}
    </div>
  );
}
