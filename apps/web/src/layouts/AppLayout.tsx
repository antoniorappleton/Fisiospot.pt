import { ReactNode } from 'react';
import { Wordmark } from '../components/Logo';
import { roleLabels, roleRestrictions } from '../features/auth/permissions';
import type { User } from '../types/domain';
import { initials } from '../utils/format';

export type NavItem = { id: string; label: string; icon: IconName; badge?: number };

export function AppLayout({ user, nav, view, onNavigate, onSignOut, onReset, title, children }: {
  user: User;
  nav: NavItem[];
  view: string;
  onNavigate: (view: string) => void;
  onSignOut: () => void;
  onReset: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="app">
      <aside className="sidebar">
        <Wordmark compact />
        <nav className="nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? 'nav-item is-active' : 'nav-item'} aria-current={view === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {!!item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{roleLabels[user.role]}</small>
            </span>
          </div>
          <p className="restriction">{roleRestrictions[user.role]}</p>
          <button className="button button-ghost button-block" type="button" onClick={onSignOut}>Terminar sessão</button>
          <button className="link-button" type="button" onClick={onReset}>Repor dados demo</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Wordmark compact />
          <div className="topbar-user">
            <span className="avatar" title={`${user.name} · ${roleLabels[user.role]}`}>{initials(user.name)}</span>
            <button className="button button-ghost" type="button" onClick={onSignOut}>Sair</button>
          </div>
        </header>
        <div className="page-head">
          <span className="eyebrow">{roleLabels[user.role]}</span>
          <h1>{title}</h1>
        </div>
        <div className="content">{children}</div>
        <p className="mobile-foot">
          {roleRestrictions[user.role]} · <button className="link-button" type="button" onClick={onReset}>Repor dados demo</button>
        </p>
      </div>
    </div>
  );
}

type IconName = 'home' | 'calendar' | 'card' | 'user' | 'users' | 'clipboard' | 'inbox' | 'file' | 'shield' | 'settings' | 'activity';

const paths: Record<IconName, string> = {
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
