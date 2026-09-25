import { Badge, Locked, Panel, Row, Stat, StatusBadge } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { clientScope, serviceName, therapistName } from '../../services/selectors';
import { useStore } from '../../services/store';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

export function ClientHome({ go }: { go: (view: string) => void }) {
  const { db, user } = useStore();
  const scope = clientScope(db, user!);
  const next = scope.appointments.find((item) => (item.status === 'scheduled' || item.status === 'confirmed') && new Date(item.dateEnd) > new Date());
  const due = scope.payments.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0);
  const pack = scope.packs[0];
  const done = scope.appointments.filter((item) => item.status === 'completed').length;

  return (
    <>
      {!scope.patient.validated && (
        <div className="notice notice-warn">
          <strong>A sua ficha está a ser validada</strong>
          <p>A equipa administrativa vai confirmar os seus dados antes da primeira consulta.</p>
        </div>
      )}

      <Panel className="panel-hero">
        <span className="eyebrow">Próxima consulta</span>
        {next ? (
          <>
            <h2 className="hero-title">{formatDateTime(next.dateStart)}</h2>
            <p className="muted">{serviceName(db, next.serviceId)} com {therapistName(db, next.therapistId)}</p>
            <div className="hero-actions">
              <StatusBadge status={next.status} />
              <button className="button button-ghost" type="button" onClick={() => go('marcacoes')}>Gerir marcações</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="hero-title">Sem consultas marcadas</h2>
            <button className="button button-primary" type="button" onClick={() => go('marcacoes')}>Fazer marcação</button>
          </>
        )}
      </Panel>

      <div className="stats">
        <Stat label="Sessões realizadas" value={done} />
        <Stat label="Pack" value={pack ? `${pack.remainingSessions}/${pack.totalSessions}` : '—'} hint={pack ? 'sessões disponíveis' : 'sem pack ativo'} />
        <Stat label="Por liquidar" value={formatMoney(due)} hint={due ? 'ver pagamentos' : 'tudo em dia'} />
      </div>
      {due > 0 && <button className="button button-primary button-block" type="button" onClick={() => go('pagamentos')}>Pagar {formatMoney(due)}</button>}
    </>
  );
}

export function ClientProfile() {
  const { db, user, actions } = useStore();
  const notify = useNotify();
  const scope = clientScope(db, user!);
  const { patient } = scope;
  const erasurePending = scope.rgpdRequests.some((item) => item.status === 'pending');

  function download() {
    const data = actions.exportPatientData(patient.id);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `fisiospot-${patient.patientCode}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Exportação concluída.');
  }

  return (
    <>
      <Panel title="Os meus dados" action={<Badge tone={patient.validated ? 'mint' : 'warn'}>{patient.validated ? 'Ficha validada' : 'Em validação'}</Badge>}>
        <dl className="details">
          <div><dt>Nº de cliente</dt><dd>{patient.patientCode}</dd></div>
          <div><dt>Nome</dt><dd>{patient.name}</dd></div>
          <div><dt>Email</dt><dd>{patient.email}</dd></div>
          <div><dt>Telemóvel</dt><dd>{patient.phone || '—'}</dd></div>
          <div><dt>NIF</dt><dd>{patient.nif || '—'}</dd></div>
          <div><dt>Data de nascimento</dt><dd>{patient.birthDate ? formatDate(patient.birthDate) : '—'}</dd></div>
          <div><dt>Morada</dt><dd>{patient.address || '—'}</dd></div>
          <div><dt>Contacto de emergência</dt><dd>{patient.emergencyContact || '—'}</dd></div>
        </dl>
      </Panel>

      <Panel title="Registos clínicos">
        <Locked title="Disponível numa fase futura">A consulta dos seus registos clínicos pelo próprio cliente chega numa próxima versão.</Locked>
      </Panel>

      <Panel title="Privacidade · RGPD">
        <Row title="Consentimento de tratamento de dados" detail={patient.consentDate ? `Atualizado a ${formatDate(patient.consentDate)}` : 'Sem registo'}>
          <label className="switch">
            <input type="checkbox" checked={patient.consentRgpd} onChange={(event) => { actions.setConsent(patient.id, event.target.checked); notify('Consentimento atualizado.'); }} />
            <span aria-hidden="true" />
            <span className="sr-only">Consentimento RGPD</span>
          </label>
        </Row>
        <Row title="Exportar os meus dados" detail="Descarregar os dados pessoais, as marcações e os pagamentos (JSON).">
          <button className="button button-ghost" type="button" onClick={download}>Exportar</button>
        </Row>
        <Row title="Direito ao esquecimento" detail={erasurePending ? 'Pedido enviado. Aguarda tratamento pelo administrador.' : 'Pedir a anonimização dos seus dados pessoais.'}>
          <button className="button button-danger" type="button" disabled={erasurePending} onClick={() => { actions.requestErasure(patient.id); notify('Pedido de esquecimento registado.'); }}>
            {erasurePending ? 'Pedido enviado' : 'Pedir'}
          </button>
        </Row>
      </Panel>
    </>
  );
}
