import type { Database, User } from '../types/domain';

// Equivalente em memória às políticas RLS do Caderno (secção 10).

export const patientName = (db: Database, id: string) => db.patients.find((item) => item.id === id)?.name ?? '—';
export const therapistName = (db: Database, id: string) => db.therapists.find((item) => item.id === id)?.name ?? '—';
export const serviceName = (db: Database, id: string) => db.services.find((item) => item.id === id)?.name ?? '—';

const byStart = <T extends { dateStart: string }>(a: T, b: T) => a.dateStart.localeCompare(b.dateStart);

/** Cliente: apenas os seus registos. */
export function clientScope(db: Database, user: User) {
  const patientId = user.patientId!;
  return {
    patient: db.patients.find((item) => item.id === patientId)!,
    appointments: db.appointments.filter((item) => item.patientId === patientId).sort(byStart),
    payments: db.payments.filter((item) => item.patientId === patientId),
    packs: db.packs.filter((item) => item.patientId === patientId),
    invoices: db.invoices.filter((item) => item.patientId === patientId),
    pendingBookings: db.bookingRequests.filter((item) => item.status === 'pending' && item.email.toLowerCase() === user.email.toLowerCase()),
    rgpdRequests: db.rgpdRequests.filter((item) => item.patientId === patientId),
  };
}

/** Fisioterapeuta: apenas pacientes autorizados (equipa de cuidados). */
export function therapistScope(db: Database, user: User) {
  const therapistId = user.therapistId!;
  const patientIds = new Set(db.careTeam.filter((link) => link.therapistId === therapistId).map((link) => link.patientId));
  return {
    therapistId,
    patients: db.patients.filter((item) => patientIds.has(item.id)),
    appointments: db.appointments.filter((item) => item.therapistId === therapistId).sort(byStart),
    episodes: db.episodes.filter((item) => item.therapistId === therapistId && patientIds.has(item.patientId)),
  };
}
