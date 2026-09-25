import { FormEvent, useState } from 'react';
import { Wordmark } from '../../components/Logo';
import { DEMO_PASSWORD, demoLogins } from '../../services/demoData';
import { useStore } from '../../services/store';

type Mode = 'login' | 'register' | 'reset';

export function AuthScreen() {
  const { actions } = useStore();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', nif: '', consent: false });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field: keyof typeof form) => (event: { target: HTMLInputElement }) =>
    setForm((current) => ({ ...current, [field]: field === 'consent' ? event.target.checked : event.target.value }));

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage('');
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (mode === 'reset') {
      setMessage('Se o email existir, receberá um link para definir uma nova palavra-passe.');
      return;
    }
    setBusy(true);
    const error = mode === 'login'
      ? await actions.login(form.email, form.password)
      : form.consent
        ? actions.register(form)
        : 'É necessário aceitar a política de privacidade (RGPD).';
    setBusy(false);
    if (error) setMessage(error);
  }

  const fillDemo = (email: string) => {
    setMode('login');
    setForm((current) => ({ ...current, email, password: DEMO_PASSWORD }));
    setMessage('');
  };

  return (
    <div className="auth-screen">
      <aside className="auth-hero">
        <div className="auth-brand">
          <Wordmark />
          <span className="auth-hero-line" aria-hidden="true" />
        </div>
        <div className="auth-hero-copy">
          <h1>Cuidar do movimento, com a clínica toda no mesmo lugar.</h1>
          <p>Marcações, processo clínico, pagamentos e auditoria, com acesso de acordo com o perfil de cada pessoa.</p>
        </div>
      </aside>

      <main className="auth-card">
        {mode !== 'reset' && (
          <div className="segmented" role="tablist" aria-label="Autenticação">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>Entrar</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')}>Criar conta</button>
          </div>
        )}

        <form className="form" onSubmit={handleSubmit}>
          {mode === 'reset' && (
            <div>
              <h2>Recuperar acesso</h2>
              <p className="muted">Indique o email da sua conta.</p>
            </div>
          )}
          {mode === 'register' && (
            <>
              <p className="muted small">As contas de fisioterapeuta, administrativo e administrador são criadas por convite da clínica.</p>
              <label>Nome completo<input required value={form.name} onChange={update('name')} autoComplete="name" /></label>
              <div className="form-grid">
                <label>Telemóvel<input required value={form.phone} onChange={update('phone')} autoComplete="tel" inputMode="tel" /></label>
                <label>NIF<input required value={form.nif} onChange={update('nif')} inputMode="numeric" pattern="\d{9}" title="9 dígitos" /></label>
              </div>
            </>
          )}
          <label>Email<input required type="email" value={form.email} onChange={update('email')} autoComplete="email" /></label>
          {mode !== 'reset' && (
            <label>Palavra-passe<input required minLength={6} type="password" value={form.password} onChange={update('password')} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
          )}
          {mode === 'register' && (
            <label className="check">
              <input type="checkbox" checked={form.consent} onChange={update('consent')} />
              <span>Autorizo o tratamento dos meus dados pessoais e de saúde para a prestação de cuidados (RGPD).</span>
            </label>
          )}
          {mode === 'login' && <button className="link-button" type="button" onClick={() => switchMode('reset')}>Esqueci-me da palavra-passe</button>}
          {message && <p className="form-message" role="status">{message}</p>}
          <button className="button button-primary button-block" type="submit" disabled={busy}>
            {busy ? 'A entrar…' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar link'}
          </button>
          {mode === 'reset' && <button className="link-button" type="button" onClick={() => switchMode('login')}>Voltar a entrar</button>}
        </form>

        {mode === 'login' && (
          <div className="demo-box">
            <span className="eyebrow">Contas demo · {DEMO_PASSWORD}</span>
            <div className="demo-list">
              {demoLogins.map((item) => (
                <button type="button" key={item.email} onClick={() => fillDemo(item.email)}>
                  <strong>{item.label}</strong>
                  <span>{item.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
