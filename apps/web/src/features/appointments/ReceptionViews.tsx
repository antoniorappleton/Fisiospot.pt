import { useState } from 'react';
import { Badge, Empty, Panel, Row, Stat, StatusBadge } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { patientName, serviceName, therapistName } from '../../services/selectors';
import { matchPatient, useStore } from '../../services/store';
import type { Appointment } from '../../types/domain';
import { formatDateTime, formatMoney, formatTime, isSameDay } from '../../utils/format';

export function ReceptionToday({ go }: { go: (view: string) => void }) {
  const { db, actions } = useStore();
  const notify = useNotify();
  const inbox = db.bookingRequests.filter((item) => item.status === 'pending');
  const today = db.appointments.filter((item) => isSameDay(item.dateStart, new Date()));
  const toValidate = db.patients.filter((item) => !item.validated && !item.anonymized);
  const paymentsToValidate = db.payments.filter((item) => item.awaitingValidation);

  return (
    <>
      <div className="stats">
        <Stat label="Consultas hoje" value={today.length} />
        <Stat label="Marcações novas" value={inbox.length} hint="via Calendly" />
        <Stat label="Pagamentos a validar" value={paymentsToValidate.length} hint={formatMoney(paymentsToValidate.reduce((sum, item) => sum + item.amount, 0))} />
      </div>

      <Panel title="Marcações recebidas · Calendly" action={<Badge tone={inbox.length ? 'warn' : 'mint'}>{inbox.length} por tratar</Badge>}>
        <p className="muted small">Cada marcação é validada por email, telefone ou NIF. Se o cliente já existir, a consulta fica associada à ficha dele; se não, é criado um cliente novo.</p>
        {inbox.length === 0 && <Empty>Sem marcações por tratar.</Empty>}
        {inbox.map((item) => {
          const match = matchPatient(db, item);
          return (
            <Row
              key={item.id}
              title={item.name}
              detail={`${serviceName(db, item.serviceId)} · ${therapistName(db, item.therapistId)} · ${formatDateTime(item.dateStart)}`}
              meta={match ? <Badge tone="mint">Cliente existente · {match.by}</Badge> : <Badge tone="warn">Cliente novo</Badge>}
            >
              <button className="button button-primary" type="button" onClick={() => notify(actions.processBooking(item.id))}>{match ? 'Associar' : 'Criar cliente'}</button>
              <button className="button button-ghost" type="button" onClick={() => { actions.rejectBooking(item.id); notify('Marcação rejeitada.'); }}>Rejeitar</button>
            </Row>
          );
        })}
      </Panel>

      <Panel title="Validação administrativa" action={toValidate.length > 0 && <button className="button button-ghost" type="button" onClick={() => go('clientes')}>Ver clientes</button>}>
        {toValidate.length === 0 && <Empty>Todas as fichas estão validadas.</Empty>}
        {toValidate.map((patient) => (
          <Row key={patient.id} title={patient.name} detail={`${patient.patientCode} · ${patient.email} · NIF ${patient.nif || '—'}`}>
            <button className="button button-primary" type="button" onClick={() => { actions.validatePatient(patient.id); notify(`${patient.name} validado.`); }}>Validar ficha</button>
          </Row>
        ))}
      </Panel>
    </>
  );
}

export function ReceptionAgenda() {
  const { db, actions } = useStore();
  const notify = useNotify();
  const [dayOffset, setDayOffset] = useState(0);
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  const list = db.appointments.filter((item) => isSameDay(item.dateStart, day)).sort((a, b) => a.dateStart.localeCompare(b.dateStart));
  const set = (item: Appointment, status: Appointment['status'], message: string) => {
    actions.setAppointmentStatus(item.id, status);
    notify(message);
  };

  return (
    <Panel
      title={day.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
      action={
        <div className="pager">
          <button className="icon-button" type="button" aria-label="Dia anterior" onClick={() => setDayOffset(dayOffset - 1)}>‹</button>
          <button className="button button-ghost" type="button" onClick={() => setDayOffset(0)}>Hoje</button>
          <button className="icon-button" type="button" aria-label="Dia seguinte" onClick={() => setDayOffset(dayOffset + 1)}>›</button>
        </div>
      }
    >
      {list.length === 0 && <Empty>Sem consultas neste dia.</Empty>}
      {list.map((item) => (
        <Row key={item.id} title={`${formatTime(item.dateStart)} · ${patientName(db, item.patientId)}`} detail={`${serviceName(db, item.serviceId)} · ${therapistName(db, item.therapistId)}${item.externalBookingId ? ` · ${item.externalBookingId}` : ''}`} meta={<StatusBadge status={item.status} late={item.lateCancellation} />}>
          {item.status === 'scheduled' && <button className="button button-primary" type="button" onClick={() => set(item, 'confirmed', 'Consulta confirmada.')}>Confirmar</button>}
          {(item.status === 'scheduled' || item.status === 'confirmed') && new Date(item.dateStart) < new Date() && (
            <button className="button button-ghost" type="button" onClick={() => set(item, 'no_show', 'Falta registada. A sessão foi descontada ou cobrada.')}>Faltou</button>
          )}
          {(item.status === 'scheduled' || item.status === 'confirmed') && <button className="button button-ghost" type="button" onClick={() => set(item, 'cancelled', 'Consulta cancelada pela clínica.')}>Cancelar</button>}
        </Row>
      ))}
    </Panel>
  );
}
