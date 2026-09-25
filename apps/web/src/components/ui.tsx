import { ReactNode, useEffect } from 'react';
import type { AppointmentStatus } from '../types/domain';

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <header className="panel-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <article className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  );
}

type Tone = 'mint' | 'neutral' | 'warn' | 'danger';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const appointmentStatus: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  scheduled: { label: 'Agendada', tone: 'neutral' },
  confirmed: { label: 'Confirmada', tone: 'mint' },
  completed: { label: 'Realizada', tone: 'mint' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
  no_show: { label: 'Faltou', tone: 'warn' },
};

export function StatusBadge({ status, late }: { status: AppointmentStatus; late?: boolean }) {
  const { label, tone } = appointmentStatus[status];
  return <Badge tone={tone}>{late ? 'Cancelada · sessão perdida' : label}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Locked({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="locked">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Row({ title, detail, meta, children }: { title: ReactNode; detail?: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="row">
      <div className="row-main">
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </div>
      {meta && <div className="row-meta">{meta}</div>}
      {children && <div className="row-actions">{children}</div>}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);
  return <div className="toast" role="status">{message}</div>;
}
