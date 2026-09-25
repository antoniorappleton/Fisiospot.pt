import { ReactNode, useEffect, useState } from 'react';
import { ClientAppointments } from './features/appointments/ClientAppointments';
import { ReceptionAgenda, ReceptionToday } from './features/appointments/ReceptionViews';
import { AuthScreen } from './features/auth/AuthScreen';
import { ClientPayments } from './features/billing/ClientPayments';
import { InvoicesView, ReceptionPayments } from './features/billing/ReceptionBilling';
import { TherapistAgenda, TherapistEpisodes, TherapistPatients } from './features/clinical/TherapistViews';
import { ClientHome, ClientProfile } from './features/patients/ClientViews';
import { ReceptionClients } from './features/patients/ReceptionClients';
import { AdminOverview, AuditView, RgpdView, ServicesView, UsersView } from './features/settings/AdminViews';
import { NotifyProvider } from './hooks/useNotify';
import { AppLayout, NavItem } from './layouts/AppLayout';
import { clientScope, therapistScope } from './services/selectors';
import { StoreProvider, useStore } from './services/store';
import type { Database, User } from './types/domain';

function App() {
  return (
    <StoreProvider>
      <NotifyProvider>
        <Shell />
      </NotifyProvider>
    </StoreProvider>
  );
}

/** Navegação de cada perfil, conforme as permissões do Caderno de Encargos. */
function navigationFor(user: User, db: Database): NavItem[] {
  switch (user.role) {
    case 'CLIENT': {
      const scope = clientScope(db, user);
      return [
        { id: 'inicio', label: 'Início', icon: 'home' },
        { id: 'marcacoes', label: 'Marcações', icon: 'calendar' },
        { id: 'pagamentos', label: 'Pagamentos', icon: 'card', badge: scope.payments.filter((item) => item.status === 'pending' && !item.awaitingValidation).length },
        { id: 'dados', label: 'Os meus dados', icon: 'user' },
      ];
    }
    case 'THERAPIST':
      return [
        { id: 'agenda', label: 'Agenda', icon: 'calendar' },
        { id: 'pacientes', label: 'Pacientes', icon: 'users' },
        { id: 'episodios', label: 'Episódios', icon: 'clipboard', badge: therapistScope(db, user).episodes.filter((item) => item.status === 'open').length },
      ];
    case 'RECEPTION':
      return [
        { id: 'hoje', label: 'Hoje', icon: 'inbox', badge: db.bookingRequests.filter((item) => item.status === 'pending').length + db.patients.filter((item) => !item.validated && !item.anonymized).length },
        { id: 'agenda', label: 'Agenda', icon: 'calendar' },
        { id: 'clientes', label: 'Clientes', icon: 'users' },
        { id: 'pagamentos', label: 'Pagamentos', icon: 'card', badge: db.payments.filter((item) => item.awaitingValidation).length },
        { id: 'faturacao', label: 'Faturação', icon: 'file' },
      ];
    case 'ADMIN':
      return [
        { id: 'visao', label: 'Visão geral', icon: 'activity' },
        { id: 'utilizadores', label: 'Utilizadores', icon: 'users' },
        { id: 'configuracao', label: 'Configuração', icon: 'settings' },
        { id: 'faturacao', label: 'Faturação', icon: 'file' },
        { id: 'auditoria', label: 'Auditoria', icon: 'shield' },
        { id: 'rgpd', label: 'RGPD', icon: 'user', badge: db.rgpdRequests.filter((item) => item.status === 'pending').length },
      ];
  }
}

function Shell() {
  const { db, user, actions } = useStore();
  const [view, setView] = useState('');
  const [episodeId, setEpisodeId] = useState<string | null>(null);

  const nav = user ? navigationFor(user, db) : [];
  const current = nav.some((item) => item.id === view) ? view : nav[0]?.id;

  useEffect(() => {
    setView('');
    setEpisodeId(null);
  }, [user?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current, episodeId]);

  if (!user) return <AuthScreen />;

  const go = (next: string) => {
    setView(next);
    setEpisodeId(null);
  };

  const openEpisode = (id: string) => {
    actions.viewEpisode(id);
    setView('episodios');
    setEpisodeId(id);
  };

  const titles: Record<string, string> = {
    inicio: `Olá, ${user.name.split(' ')[0]}`,
    marcacoes: 'As minhas marcações',
    pagamentos: 'Pagamentos',
    dados: 'Os meus dados',
    agenda: 'Agenda',
    pacientes: 'Pacientes',
    episodios: 'Episódios clínicos',
    hoje: 'Hoje na clínica',
    clientes: 'Clientes',
    faturacao: 'Faturação',
    visao: 'Visão geral',
    utilizadores: 'Utilizadores',
    configuracao: 'Configuração da clínica',
    auditoria: 'Auditoria',
    rgpd: 'RGPD',
  };

  const screens: Record<string, ReactNode> = user.role === 'CLIENT'
    ? { inicio: <ClientHome go={go} />, marcacoes: <ClientAppointments />, pagamentos: <ClientPayments />, dados: <ClientProfile /> }
    : user.role === 'THERAPIST'
      ? { agenda: <TherapistAgenda />, pacientes: <TherapistPatients openEpisode={openEpisode} />, episodios: <TherapistEpisodes selected={episodeId} select={setEpisodeId} /> }
      : user.role === 'RECEPTION'
        ? { hoje: <ReceptionToday go={go} />, agenda: <ReceptionAgenda />, clientes: <ReceptionClients />, pagamentos: <ReceptionPayments />, faturacao: <InvoicesView canSync /> }
        : { visao: <AdminOverview go={go} />, utilizadores: <UsersView />, configuracao: <ServicesView />, faturacao: <InvoicesView canSync={false} />, auditoria: <AuditView />, rgpd: <RgpdView /> };

  return (
    <AppLayout
      user={user}
      nav={nav}
      view={current}
      onNavigate={go}
      onSignOut={() => void actions.logout()}
      onReset={() => { if (window.confirm('Repor todos os dados demo? As alterações feitas serão perdidas.')) actions.resetDemo(); }}
      title={titles[current]}
    >
      {screens[current]}
    </AppLayout>
  );
}

export default App;
