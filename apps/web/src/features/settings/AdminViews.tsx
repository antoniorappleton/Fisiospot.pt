import { FormEvent, useState } from 'react';
import { Badge, Empty, Locked, Panel, Row, Sheet, Stat } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { patientName } from '../../services/selectors';
import { useStore } from '../../services/store';
import type { AuditLog, Role } from '../../types/domain';
import { formatDate, formatDateTime, formatMoney, isSameDay } from '../../utils/format';
import { roleLabels } from '../auth/permissions';

const actionTone: Record<AuditLog['action'], 'mint' | 'neutral' | 'warn' | 'danger'> = {
  CREATE: 'mint',
  READ: 'neutral',
  UPDATE: 'neutral',
  DELETE: 'danger',
  LOGIN: 'neutral',
  EXPORT: 'warn',
};

function AuditRow({ log }: { log: AuditLog }) {
  return (
    <Row
      title={<><Badge tone={actionTone[log.action]}>{log.action}</Badge> {log.metadata}</>}
      detail={`${log.userName} · ${log.tableName} #${log.recordId}`}
      meta={<span className="muted small">{formatDateTime(log.createdAt)}</span>}
    />
  );
}

export function AdminOverview({ go }: { go: (view: string) => void }) {
  const { db } = useStore();
  const weekAhead = Date.now() + 7 * 86_400_000;
  const week = db.appointments.filter((item) => new Date(item.dateStart).getTime() > Date.now() && new Date(item.dateStart).getTime() < weekAhead && item.status !== 'cancelled');
  const revenue = db.payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
  const auditToday = db.auditLogs.filter((item) => isSameDay(item.createdAt, new Date())).length;
  const rgpdPending = db.rgpdRequests.filter((item) => item.status === 'pending').length;

  return (
    <>
      <div className="stats stats-4">
        <Stat label="Utilizadores ativos" value={db.users.filter((item) => item.active).length} hint={`${db.users.length} no total`} />
        <Stat label="Consultas · 7 dias" value={week.length} />
        <Stat label="Recebido" value={formatMoney(revenue)} />
        <Stat label="Ações auditadas hoje" value={auditToday} />
      </div>
      {rgpdPending > 0 && (
        <div className="notice notice-warn">
          <strong>{rgpdPending} pedido{rgpdPending > 1 ? 's' : ''} RGPD por tratar</strong>
          <p>Há clientes a pedir o direito ao esquecimento.</p>
          <button className="button button-primary" type="button" onClick={() => go('rgpd')}>Tratar pedidos</button>
        </div>
      )}
      <Panel title="Atividade recente" action={<button className="button button-ghost" type="button" onClick={() => go('auditoria')}>Ver auditoria</button>}>
        {db.auditLogs.slice(0, 6).map((log) => <AuditRow key={log.id} log={log} />)}
      </Panel>
      <Locked title="Sem acesso clínico direto">Por defeito, o Administrador gere a plataforma mas não consulta processos clínicos.</Locked>
    </>
  );
}

export function UsersView() {
  const { db, user, actions } = useStore();
  const notify = useNotify();
  const [inviting, setInviting] = useState(false);
  const [filter, setFilter] = useState<Role | 'ALL'>('ALL');
  const list = db.users.filter((item) => filter === 'ALL' || item.role === filter);

  return (
    <>
      <Panel title="Utilizadores" action={<button className="button button-primary" type="button" onClick={() => setInviting(true)}>Convidar</button>}>
        <div className="chips">
          {(['ALL', 'ADMIN', 'RECEPTION', 'THERAPIST', 'CLIENT'] as const).map((role) => (
            <button type="button" key={role} className={filter === role ? 'chip is-active' : 'chip'} onClick={() => setFilter(role)}>{role === 'ALL' ? 'Todos' : roleLabels[role]}</button>
          ))}
        </div>
        {list.map((item) => (
          <Row key={item.id} title={item.name} detail={`${item.email} · ${item.lastLogin ? `último acesso ${formatDate(item.lastLogin)}` : 'nunca entrou'}`} meta={<Badge tone={item.active ? 'mint' : 'danger'}>{roleLabels[item.role]}{item.active ? '' : ' · inativo'}</Badge>}>
            {item.id !== user!.id && (
              <button className="button button-ghost" type="button" onClick={() => { actions.toggleUser(item.id); notify(item.active ? `${item.name} desativado.` : `${item.name} reativado.`); }}>
                {item.active ? 'Desativar' : 'Reativar'}
              </button>
            )}
          </Row>
        ))}
      </Panel>
      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
    </>
  );
}

function InviteSheet({ onClose }: { onClose: () => void }) {
  const { actions } = useStore();
  const notify = useNotify();
  const [form, setForm] = useState({ name: '', email: '', role: 'THERAPIST' as Role, speciality: '' });
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = actions.inviteUser(form);
    if (result) return setError(result);
    notify(`Convite enviado a ${form.email}. Password demo: Demo123!`);
    onClose();
  }

  return (
    <Sheet title="Convidar utilizador" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Perfil
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
            <option value="THERAPIST">Fisioterapeuta</option>
            <option value="RECEPTION">Administrativo</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>
        {form.role === 'THERAPIST' && <label>Especialidade<input value={form.speciality} onChange={(event) => setForm({ ...form, speciality: event.target.value })} /></label>}
        {error && <p className="form-message">{error}</p>}
        <button className="button button-primary button-block" type="submit">Enviar convite</button>
      </form>
    </Sheet>
  );
}

export function ServicesView() {
  const { db, actions } = useStore();
  const notify = useNotify();
  const [draft, setDraft] = useState({ name: '', durationMinutes: 45, price: 35 });

  return (
    <>
      <Panel title="Catálogo de serviços">
        {db.services.map((service) => (
          <div className="service-row" key={service.id}>
            <div className="row-main">
              <strong>{service.name}</strong>
              <span>{service.durationMinutes} min</span>
            </div>
            <label className="inline-field">€
              <input type="number" min={0} step={0.5} defaultValue={service.price} onBlur={(event) => {
                const price = Number(event.target.value);
                if (price !== service.price) { actions.updateService(service.id, { price }); notify(`Preço de ${service.name} atualizado.`); }
              }} />
            </label>
            <label className="switch">
              <input type="checkbox" checked={service.active} onChange={() => actions.updateService(service.id, { active: !service.active })} />
              <span aria-hidden="true" />
              <span className="sr-only">Ativo</span>
            </label>
          </div>
        ))}
      </Panel>
      <Panel title="Novo serviço">
        <form className="form form-inline" onSubmit={(event) => { event.preventDefault(); actions.addService(draft); notify(`${draft.name} adicionado.`); setDraft({ name: '', durationMinutes: 45, price: 35 }); }}>
          <label>Nome<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>Duração (min)<input required type="number" min={10} value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Number(event.target.value) })} /></label>
          <label>Preço (€)<input required type="number" min={0} step={0.5} value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
          <button className="button button-primary" type="submit">Adicionar</button>
        </form>
      </Panel>
    </>
  );
}

export function AuditView() {
  const { db } = useStore();
  const [action, setAction] = useState<AuditLog['action'] | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const list = db.auditLogs.filter((log) => (action === 'ALL' || log.action === action) && (!term || `${log.userName} ${log.tableName} ${log.metadata} ${log.recordId}`.toLowerCase().includes(term)));

  return (
    <Panel title="Registo de auditoria" action={<Badge>{list.length}</Badge>}>
      <div className="chips">
        {(['ALL', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'] as const).map((item) => (
          <button type="button" key={item} className={action === item ? 'chip is-active' : 'chip'} onClick={() => setAction(item)}>{item === 'ALL' ? 'Todas' : item}</button>
        ))}
      </div>
      <input className="search" type="search" placeholder="Filtrar por utilizador, tabela ou registo" value={query} onChange={(event) => setQuery(event.target.value)} />
      {list.length === 0 && <Empty>Sem registos.</Empty>}
      {list.map((log) => <AuditRow key={log.id} log={log} />)}
    </Panel>
  );
}

export function RgpdView() {
  const { db, actions } = useStore();
  const notify = useNotify();
  const withoutConsent = db.patients.filter((item) => !item.consentRgpd && !item.anonymized);

  return (
    <>
      <Panel title="Pedidos de esquecimento">
        {db.rgpdRequests.length === 0 && <Empty>Sem pedidos.</Empty>}
        {db.rgpdRequests.map((request) => (
          <Row key={request.id} title={patientName(db, request.patientId)} detail={`Pedido a ${formatDate(request.createdAt)}`} meta={<Badge tone={request.status === 'done' ? 'mint' : 'warn'}>{request.status === 'done' ? 'Anonimizado' : 'Pendente'}</Badge>}>
            {request.status === 'pending' && <button className="button button-danger" type="button" onClick={() => { actions.executeErasure(request.id); notify('Dados pessoais anonimizados.'); }}>Anonimizar</button>}
          </Row>
        ))}
        <p className="muted small">A anonimização remove os dados pessoais. Os registos clínicos ficam guardados pelo período legal de conservação.</p>
      </Panel>
      <Panel title="Clientes sem consentimento">
        {withoutConsent.length === 0 && <Empty>Todos os clientes têm consentimento registado.</Empty>}
        {withoutConsent.map((item) => <Row key={item.id} title={item.name} detail={item.patientCode} meta={<Badge tone="danger">Sem consentimento</Badge>} />)}
      </Panel>
    </>
  );
}
