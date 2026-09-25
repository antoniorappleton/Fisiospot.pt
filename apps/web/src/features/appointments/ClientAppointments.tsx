import { FormEvent, useState } from 'react';
import { Badge, Empty, Panel, Row, Sheet, StatusBadge } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { clientScope, serviceName, therapistName } from '../../services/selectors';
import { useStore } from '../../services/store';
import type { Appointment } from '../../types/domain';
import { businessDaysUntil, formatDateTime } from '../../utils/format';

const isUpcoming = (item: Appointment) => (item.status === 'scheduled' || item.status === 'confirmed') && new Date(item.dateEnd) > new Date();

export function ClientAppointments() {
  const { db, user } = useStore();
  const scope = clientScope(db, user!);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const upcoming = scope.appointments.filter(isUpcoming);
  const history = scope.appointments.filter((item) => !isUpcoming(item)).reverse();

  return (
    <>
      <Panel title="Próximas consultas" action={<button className="button button-primary" type="button" onClick={() => setBooking(true)}>Nova marcação</button>}>
        {scope.pendingBookings.map((item) => (
          <Row key={item.id} title={serviceName(db, item.serviceId)} detail={`${therapistName(db, item.therapistId)} · ${formatDateTime(item.dateStart)}`} meta={<Badge tone="warn">A aguardar clínica</Badge>} />
        ))}
        {upcoming.length === 0 && scope.pendingBookings.length === 0 && <Empty>Não tem consultas marcadas.</Empty>}
        {upcoming.map((item) => (
          <Row key={item.id} title={serviceName(db, item.serviceId)} detail={`${therapistName(db, item.therapistId)} · ${formatDateTime(item.dateStart)}`} meta={<StatusBadge status={item.status} />}>
            <button className="button button-ghost" type="button" onClick={() => setCancelling(item)}>Cancelar</button>
          </Row>
        ))}
      </Panel>

      <Panel title="Histórico">
        {history.length === 0 && <Empty>Ainda sem histórico.</Empty>}
        {history.map((item) => (
          <Row key={item.id} title={serviceName(db, item.serviceId)} detail={`${therapistName(db, item.therapistId)} · ${formatDateTime(item.dateStart)}`} meta={<StatusBadge status={item.status} late={item.lateCancellation} />} />
        ))}
      </Panel>

      {booking && <BookingSheet onClose={() => setBooking(false)} />}
      {cancelling && <CancelSheet appointment={cancelling} onClose={() => setCancelling(null)} />}
    </>
  );
}

function BookingSheet({ onClose }: { onClose: () => void }) {
  const { db, user, actions } = useStore();
  const notify = useNotify();
  const services = db.services.filter((item) => item.active);
  const therapists = db.therapists.filter((item) => item.active);
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setHours(10, 0, 0, 0);
  const [form, setForm] = useState({
    serviceId: services[0]?.id ?? '',
    therapistId: therapists[0]?.id ?? '',
    date: new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    actions.requestBooking(user!.patientId!, form.serviceId, form.therapistId, new Date(form.date).toISOString());
    notify('Marcação enviada pelo Calendly. A clínica vai confirmar.');
    onClose();
  }

  return (
    <Sheet title="Nova marcação" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="muted small">As marcações são feitas através do Calendly. A clínica recebe o pedido e associa-o à sua ficha.</p>
        <label>Serviço
          <select value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
            {services.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.durationMinutes} min · {item.price} €</option>)}
          </select>
        </label>
        <label>Fisioterapeuta
          <select value={form.therapistId} onChange={(event) => setForm({ ...form, therapistId: event.target.value })}>
            {therapists.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.speciality}</option>)}
          </select>
        </label>
        <label>Data e hora<input required type="datetime-local" value={form.date} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <button className="button button-primary button-block" type="submit">Marcar no Calendly</button>
      </form>
    </Sheet>
  );
}

function CancelSheet({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { db, actions } = useStore();
  const notify = useNotify();
  const days = businessDaysUntil(appointment.dateStart);
  const free = days >= 2;

  return (
    <Sheet title="Cancelar consulta" onClose={onClose}>
      <div className="stack">
        <Row title={serviceName(db, appointment.serviceId)} detail={formatDateTime(appointment.dateStart)} />
        <div className={free ? 'notice notice-mint' : 'notice notice-danger'}>
          <strong>{free ? 'Sem penalização' : 'Perde a sessão'}</strong>
          <p>
            {free
              ? `Faltam ${days} dias úteis. Os cancelamentos com pelo menos 2 dias úteis de antecedência não têm custo.`
              : `Faltam ${days} dia${days === 1 ? '' : 's'} úte${days === 1 ? 'il' : 'is'}. Com menos de 2 dias úteis de antecedência, a sessão é descontada do pack ou cobrada.`}
          </p>
        </div>
        <button className={free ? 'button button-primary button-block' : 'button button-danger button-block'} type="button" onClick={() => { notify(actions.cancelAppointment(appointment.id)); onClose(); }}>
          Confirmar cancelamento
        </button>
        <button className="button button-ghost button-block" type="button" onClick={onClose}>Manter consulta</button>
      </div>
    </Sheet>
  );
}
