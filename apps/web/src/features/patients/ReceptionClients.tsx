import { useState } from 'react';
import { Badge, Empty, Locked, Panel, Row, Sheet, StatusBadge } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { serviceName, therapistName } from '../../services/selectors';
import { useStore } from '../../services/store';
import type { Patient } from '../../types/domain';
import { formatDateTime, formatMoney } from '../../utils/format';

export function ReceptionClients() {
  const { db } = useStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const term = query.trim().toLowerCase();
  const list = db.patients.filter((item) => !term || [item.name, item.email, item.phone, item.nif, item.patientCode].some((value) => value.toLowerCase().includes(term)));

  return (
    <>
      <Panel title="Clientes" action={<Badge>{db.patients.length}</Badge>}>
        <input className="search" type="search" placeholder="Pesquisar por nome, email, telefone ou NIF" value={query} onChange={(event) => setQuery(event.target.value)} />
        {list.length === 0 && <Empty>Nenhum cliente encontrado.</Empty>}
        {list.map((patient) => (
          <button className="row row-button" type="button" key={patient.id} onClick={() => setSelected(patient)}>
            <div className="row-main">
              <strong>{patient.name}</strong>
              <span>{patient.patientCode} · {patient.phone || '—'} · NIF {patient.nif || '—'}</span>
            </div>
            <div className="row-meta">
              {patient.anonymized ? <Badge>Anonimizado</Badge> : patient.validated ? <Badge tone="mint">Validado</Badge> : <Badge tone="warn">Por validar</Badge>}
            </div>
          </button>
        ))}
      </Panel>
      {selected && <ClientSheet patientId={selected.id} onClose={() => setSelected(null)} />}
    </>
  );
}

function ClientSheet({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { db, actions } = useStore();
  const notify = useNotify();
  const patient = db.patients.find((item) => item.id === patientId)!;
  const appointments = db.appointments.filter((item) => item.patientId === patientId).sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  const pending = db.payments.filter((item) => item.patientId === patientId && item.status === 'pending');
  const pack = db.packs.find((item) => item.patientId === patientId);

  return (
    <Sheet title={patient.name} onClose={onClose}>
      <div className="stack">
        {!patient.validated && !patient.anonymized && (
          <div className="notice notice-warn">
            <strong>Ficha por validar</strong>
            <p>Confirme a identidade e os contactos do cliente.</p>
            <button className="button button-primary" type="button" onClick={() => { actions.validatePatient(patient.id); notify('Ficha validada.'); }}>Validar ficha</button>
          </div>
        )}
        <dl className="details">
          <div><dt>Nº</dt><dd>{patient.patientCode}</dd></div>
          <div><dt>Email</dt><dd>{patient.email || '—'}</dd></div>
          <div><dt>Telemóvel</dt><dd>{patient.phone || '—'}</dd></div>
          <div><dt>NIF</dt><dd>{patient.nif || '—'}</dd></div>
          <div><dt>Consentimento RGPD</dt><dd>{patient.consentRgpd ? 'Sim' : 'Não'}</dd></div>
          <div><dt>Pack</dt><dd>{pack ? `${pack.remainingSessions}/${pack.totalSessions} sessões` : '—'}</dd></div>
          <div><dt>Por liquidar</dt><dd>{formatMoney(pending.reduce((sum, item) => sum + item.amount, 0))}</dd></div>
        </dl>
        <h3>Consultas</h3>
        {appointments.length === 0 && <Empty>Sem consultas.</Empty>}
        {appointments.map((item) => (
          <Row key={item.id} title={serviceName(db, item.serviceId)} detail={`${therapistName(db, item.therapistId)} · ${formatDateTime(item.dateStart)}`} meta={<StatusBadge status={item.status} late={item.lateCancellation} />} />
        ))}
        <Locked title="Conteúdo clínico reservado">O perfil Administrativo não tem acesso a episódios, avaliações nem notas de sessão.</Locked>
      </div>
    </Sheet>
  );
}
