import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type AuthMode = 'login' | 'register';
type Profile = 'ADMIN' | 'THERAPIST' | 'CLIENT';
type SessionUser = { id: string; email: string; name: string; role: Profile };

type ProfileOption = { value: Profile; label: string; description: string; restricted?: boolean };

const profileOptions: ProfileOption[] = [
  { value: 'CLIENT', label: 'Utente', description: 'Acede às suas marcações e informação.' },
  { value: 'THERAPIST', label: 'Fisioterapeuta', description: 'Acompanha agenda e evolução clínica.', restricted: true },
  { value: 'ADMIN', label: 'Administrador', description: 'Gere a clínica, equipa e configurações.', restricted: true },
];

const roleLabels: Record<Profile, string> = {
  ADMIN: 'Administrador',
  THERAPIST: 'Fisioterapeuta',
  CLIENT: 'Utente',
};

function App() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void hydrateSession(data.session.user, setSessionUser);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void hydrateSession(session.user, setSessionUser);
      else setSessionUser(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <main className={sessionUser ? 'app-shell dashboard-shell' : 'app-shell'}>
      <BrandHeader user={sessionUser} onSignOut={() => setSessionUser(null)} />
      {sessionUser
        ? <Dashboard user={sessionUser} onSignOut={() => setSessionUser(null)} />
        : <AuthPanel onAuthenticated={setSessionUser} />}
      <footer className="status-line">
        <span className="status-dot" aria-hidden="true" />
        <span>{sessionUser ? 'Sessão protegida por perfil' : 'Dados protegidos e acesso por perfil'}</span>
      </footer>
    </main>
  );
}

async function hydrateSession(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  setSessionUser: (user: SessionUser) => void,
) {
  const fallback = toSessionUser(user);
  if (!supabase) return setSessionUser(fallback);

  const { data } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (data?.role === 'ADMIN' || data?.role === 'THERAPIST' || data?.role === 'CLIENT') {
    setSessionUser({ ...fallback, name: data.name ?? fallback.name, role: data.role });
  } else {
    setSessionUser(fallback);
  }
}

function toSessionUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): SessionUser {
  const role = user.user_metadata?.role;
  return {
    id: user.id,
    email: user.email ?? '',
    name: typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : user.email?.split('@')[0] ?? 'Utilizador',
    role: role === 'ADMIN' || role === 'THERAPIST' ? role : 'CLIENT',
  };
}

function BrandHeader({ user, onSignOut }: { user: SessionUser | null; onSignOut: () => void }) {
  return (
    <header className="brand-bar">
      <div className="brand-lockup" aria-label="Fisiospot Fisioterapia">
        <img className="brand-mark" src={`${import.meta.env.BASE_URL}design/logo.png`} alt="Fisiospot" />
        <span className="brand-name">fisiospot</span>
        <span className="brand-subtitle">fisioterapia</span>
      </div>
      {user && <button className="sign-out-action" type="button" onClick={onSignOut}>Sair</button>}
    </header>
  );
}

function AuthPanel({ onAuthenticated }: { onAuthenticated: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [profile, setProfile] = useState<Profile>('CLIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isRegistering = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (isRegistering && profile !== 'CLIENT') {
      setMessage('Este perfil é criado por convite da clínica. Escolha Utente para criar uma conta.');
      return;
    }
    setIsLoading(true);

    const demoUser = resolveDemoUser(email, password);
    if (demoUser) {
      setIsLoading(false);
      setMessage('Acesso demo ativado com sucesso.');
      onAuthenticated(demoUser);
      return;
    }

    if (!supabase) {
      setMessage('O Supabase ainda não está configurado. Preencha as variáveis do ficheiro .env para ativar o acesso.');
      setIsLoading(false);
      return;
    }
    const result = isRegistering
      ? await supabase.auth.signUp({ email, password, options: { data: { name, role: profile } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (result.error) {
      setMessage(result.error.message);
    } else if (isRegistering) {
      setMessage('Conta criada. Verifique o seu email para confirmar o registo.');
    } else if (result.data.session) {
      await hydrateSession(result.data.session.user, onAuthenticated);
    }
  }

  async function handlePasswordReset() {
    if (!email) return setMessage('Indique primeiro o seu email para receber um link de recuperação.');
    if (!supabase) return setMessage('O Supabase ainda não está configurado. Preencha as variáveis do ficheiro .env para ativar a recuperação.');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setMessage(error?.message ?? 'Enviámos um link de recuperação para o seu email.');
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-heading">
        <p className="eyebrow">{isRegistering ? 'Novo acesso' : 'Área clínica'}</p>
        <h1 id="auth-title">{isRegistering ? 'Crie o seu acesso.' : 'Bem-vindo de volta.'}</h1>
        <p className="intro">{isRegistering ? 'Entre na rede Fisiospot e acompanhe o seu percurso de cuidado.' : 'Pacientes, agenda, evolução clínica e faturação reunidos num só lugar.'}</p>
      </div>
      <div className="auth-card">
        <div className="auth-tabs" role="tablist" aria-label="Autenticação">
          <button className={mode === 'login' ? 'tab is-active' : 'tab'} type="button" onClick={() => { setMode('login'); setMessage(''); }} role="tab" aria-selected={mode === 'login'}>Entrar</button>
          <button className={mode === 'register' ? 'tab is-active' : 'tab'} type="button" onClick={() => { setMode('register'); setMessage(''); }} role="tab" aria-selected={mode === 'register'}>Registar</button>
        </div>
        <div className="demo-credentials" aria-label="Contas de demonstração">
          <strong>Demo</strong>
          <span>filipe.db@fisiospot.pt / Demo123! · ADMIN</span>
          <span>ana.martins@fisiospot.pt / Demo123! · Fisioterapeuta</span>
          <span>joao.pereira@fisiospot.pt / Demo123! · Paciente</span>
        </div>
        <form onSubmit={handleSubmit}>
          {isRegistering && <label>Nome completo<input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
          {isRegistering && <fieldset><legend>Perfil</legend><div className="profile-options">{profileOptions.map((option) => <button className={profile === option.value ? 'profile-option is-selected' : 'profile-option'} type="button" key={option.value} onClick={() => setProfile(option.value)}><span className="profile-option-title">{option.label}</span><span className="profile-option-description">{option.description}</span>{option.restricted && <span className="profile-option-note">Por convite</span>}</button>)}</div></fieldset>}
          <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
          <label>Palavra-passe<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegistering ? 'new-password' : 'current-password'} /></label>
          {!isRegistering && <button className="forgot-action" type="button" onClick={handlePasswordReset}>Esqueci-me da palavra-passe</button>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="primary-action auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'A processar...' : isRegistering ? 'Criar acesso' : 'Entrar na plataforma'}<span aria-hidden="true">-&gt;</span></button>
        </form>
      </div>
    </section>
  );
}

function Dashboard({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const content = dashboardContent[user.role];
  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <p className="eyebrow">{roleLabels[user.role]}</p>
        <h1 id="dashboard-title">Olá, {user.name}.</h1>
        <p className="intro">{content.intro}</p>
      </div>
      <nav className="dashboard-nav" aria-label="Navegação principal">
        {content.navigation.map((item, index) => <button className={index === 0 ? 'dashboard-nav-item is-active' : 'dashboard-nav-item'} type="button" key={item}>{item}</button>)}
      </nav>
      <div className="dashboard-grid">
        {content.cards.map((card) => <article className="dashboard-card" key={card.label}><span className="card-kicker">{card.kicker}</span><strong>{card.value}</strong><span>{card.label}</span></article>)}
      </div>
      <div className="demo-records" aria-label="Registos de demonstração">
        <h2>{user.role === 'CLIENT' ? 'O meu percurso' : user.role === 'THERAPIST' ? 'Pacientes em acompanhamento' : 'Clínica em ação'}</h2>
        {demoRecordSets[user.role].map((record) => (
          <article className="demo-record" key={record.title}>
            <div>
              <strong>{record.title}</strong>
              <span>{record.detail}</span>
            </div>
            <small>{record.meta}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-footer"><span>{user.email}</span><button className="dashboard-exit" type="button" onClick={async () => { if (supabase) await supabase.auth.signOut(); onSignOut(); }}>Terminar sessão</button></div>
    </section>
  );
}

type DashboardData = { intro: string; navigation: string[]; cards: Array<{ kicker: string; value: string; label: string }> };

const demoAccounts = {
  'filipe.db@fisiospot.pt': { id: 'demo-admin', email: 'filipe.db@fisiospot.pt', name: 'Filipe D. Borges', role: 'ADMIN' as const, password: 'Demo123!' },
  'ana.martins@fisiospot.pt': { id: 'demo-therapist', email: 'ana.martins@fisiospot.pt', name: 'Ana Martins', role: 'THERAPIST' as const, password: 'Demo123!' },
  'joao.pereira@fisiospot.pt': { id: 'demo-client', email: 'joao.pereira@fisiospot.pt', name: 'João Pereira', role: 'CLIENT' as const, password: 'Demo123!' },
  'marta.oliveira@fisiospot.pt': { id: 'demo-client-2', email: 'marta.oliveira@fisiospot.pt', name: 'Marta Oliveira', role: 'CLIENT' as const, password: 'Demo123!' },
  'rui.santos@fisiospot.pt': { id: 'demo-therapist-2', email: 'rui.santos@fisiospot.pt', name: 'Rui Santos', role: 'THERAPIST' as const, password: 'Demo123!' },
};

const demoRecordSets: Record<Profile, Array<{ title: string; detail: string; meta: string }>> = {
  ADMIN: [
    { title: 'João Pereira', detail: 'Sessão de reabilitação do joelho', meta: 'Próxima consulta · 10:30' },
    { title: 'Marta Oliveira', detail: 'Avaliação inicial concluída', meta: 'Episódio ativo · 2 sessões' },
    { title: 'Ana Martins', detail: 'Agenda de hoje em dia', meta: 'Fisioterapeuta responsável' },
  ],
  THERAPIST: [
    { title: 'Marta Oliveira', detail: 'Melhoria progressiva da dor lombar', meta: 'Última sessão · 4 dias atrás' },
    { title: 'João Pereira', detail: 'Exercícios de força do quadril', meta: 'Próximo ajuste · 10:30' },
    { title: 'Rui Santos', detail: 'Partilha de caso e revisão de plano', meta: 'Consulta de supervisão' },
  ],
  CLIENT: [
    { title: 'Plano de tratamento', detail: 'Exercícios de mobilidade e força', meta: 'Última revisão · 12/09' },
    { title: 'Consulta agendada', detail: 'Fisioterapia de joelho', meta: 'Próxima · 24 SET · 10:30' },
    { title: 'Pagamentos', detail: 'Pack de 6 sessões ativo', meta: '2 sessões restantes' },
  ],
};

const dashboardContent: Record<Profile, DashboardData> = {
  ADMIN: {
    intro: 'Uma visão clara da operação da clínica, da equipa e da atividade de hoje.',
    navigation: ['Visão geral', 'Agenda', 'Equipa', 'Faturação', 'Auditoria'],
    cards: [{ kicker: 'Hoje', value: '12', label: 'marcações agendadas' }, { kicker: 'Equipa', value: '06', label: 'profissionais ativos' }, { kicker: 'Clínica', value: '€ 1.840', label: 'faturação pendente' }, { kicker: 'Segurança', value: '24', label: 'ações auditadas' }],
  },
  THERAPIST: {
    intro: 'Acompanhe a sua agenda e mantenha cada episódio clínico em movimento.',
    navigation: ['O meu dia', 'Pacientes', 'Episódios clínicos', 'Evolução'],
    cards: [{ kicker: 'Hoje', value: '05', label: 'consultas na agenda' }, { kicker: 'Pacientes', value: '18', label: 'pacientes acompanhados' }, { kicker: 'Clínica', value: '03', label: 'notas por concluir' }, { kicker: 'Próxima', value: '10:30', label: 'sessão de hoje' }],
  },
  CLIENT: {
    intro: 'Tenha as suas consultas e o seu percurso de cuidado sempre à mão.',
    navigation: ['Resumo', 'As minhas marcações', 'O meu percurso', 'Pagamentos'],
    cards: [{ kicker: 'Próxima consulta', value: '24 SET', label: 'Fisioterapia · 10:30' }, { kicker: 'Sessões', value: '04', label: 'sessões realizadas' }, { kicker: 'Pack', value: '06', label: 'sessões disponíveis' }, { kicker: 'Conta', value: '€ 0', label: 'por liquidar' }],
  },
};

function resolveDemoUser(email: string, password: string): SessionUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const account = demoAccounts[normalizedEmail as keyof typeof demoAccounts];

  if (!account || account.password !== password) return null;

  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
  };
}

export default App;
