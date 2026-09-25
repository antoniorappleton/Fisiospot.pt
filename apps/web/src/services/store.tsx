import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Appointment,
  AuditLog,
  Database,
  PaymentMethod,
  Role,
  Service,
  User,
} from '../types/domain';
import { businessDaysUntil, uid } from '../utils/format';
import { createSeed, DEMO_PASSWORD } from './demoData';

const DB_KEY = 'fisiospot-demo-db';
const SESSION_KEY = 'fisiospot-demo-session';

type AuditEntry = Pick<AuditLog, 'action' | 'tableName' | 'recordId' | 'metadata'> & { actor?: { id: string; name: string } };

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível (modo privado): a demo continua em memória.
  }
}

function loadDb(): Database {
  const stored = readStorage<Database>(DB_KEY);
  return stored?.version === 1 ? stored : createSeed();
}

const normalize = {
  email: (value: string) => value.trim().toLowerCase(),
  phone: (value: string) => value.replace(/\D/g, ''),
};

/** Fluxo 2: validação por email, telefone ou NIF. */
export function matchPatient(db: Database, data: { email: string; phone: string; nif: string }) {
  for (const patient of db.patients.filter((item) => !item.anonymized)) {
    if (data.email && normalize.email(patient.email) === normalize.email(data.email)) return { patient, by: 'email' as const };
    if (data.phone && normalize.phone(patient.phone) === normalize.phone(data.phone)) return { patient, by: 'telefone' as const };
    if (data.nif && patient.nif === data.nif.trim()) return { patient, by: 'NIF' as const };
  }
  return null;
}

function nextPatientCode(db: Database) {
  return `FS-${String(db.patients.length + 1).padStart(4, '0')}`;
}

function ensureCareTeam(db: Database, therapistId: string, patientId: string) {
  if (!db.careTeam.some((link) => link.therapistId === therapistId && link.patientId === patientId)) {
    db.careTeam.push({ therapistId, patientId });
  }
}

/** Consome uma sessão do pack ativo ou gera um pagamento pendente. */
function chargeSession(db: Database, appointment: Appointment, service: Service, description: string) {
  const pack = db.packs.find((item) => item.patientId === appointment.patientId && item.serviceId === appointment.serviceId && item.remainingSessions > 0);
  if (pack) {
    pack.remainingSessions -= 1;
    return `Sessão descontada do pack (${pack.remainingSessions} restantes).`;
  }
  db.payments.push({
    id: uid('pay'),
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    description,
    amount: service.price,
    status: 'pending',
    reference: `REF-${Math.floor(100000 + Math.random() * 899999)}`,
  });
  return 'Foi gerado um pagamento pendente.';
}

function issueInvoice(db: Database, paymentId: string, synced: boolean) {
  const payment = db.payments.find((item) => item.id === paymentId)!;
  const number = 141 + db.invoices.length;
  const invoice = {
    id: uid('inv'),
    patientId: payment.patientId,
    paymentId,
    invoiceNumber: `FT ${new Date().getFullYear()}/${String(number).padStart(4, '0')}`,
    amount: payment.amount,
    issueDate: new Date().toISOString(),
    syncedToPrimavera: synced,
  };
  db.invoices.push(invoice);
  return invoice;
}

function useDemoStore() {
  const [db, setDb] = useState<Database>(loadDb);
  const [userId, setUserId] = useState<string | null>(() => readStorage<string>(SESSION_KEY));

  useEffect(() => writeStorage(DB_KEY, db), [db]);
  useEffect(() => writeStorage(SESSION_KEY, userId), [userId]);

  const user = useMemo(() => db.users.find((item) => item.id === userId && item.active) ?? null, [db.users, userId]);

  const dbRef = useRef(db);

  /** Aplica uma alteração e regista-a na auditoria (Princípio 4). */
  const mutate = useCallback(
    <T,>(recipe: (draft: Database) => T, audit?: (result: T) => AuditEntry | AuditEntry[] | null) => {
      const draft = structuredClone(dbRef.current);
      const result = recipe(draft);
      const entries = audit?.(result);
      const list = entries ? (Array.isArray(entries) ? entries : [entries]) : [];
      const actingUser = draft.users.find((item) => item.id === userId);
      for (const entry of list) {
        draft.auditLogs.unshift({
          id: uid('al'),
          userId: entry.actor?.id ?? actingUser?.id ?? 'system',
          userName: entry.actor?.name ?? actingUser?.name ?? 'Sistema',
          action: entry.action,
          tableName: entry.tableName,
          recordId: entry.recordId,
          metadata: entry.metadata,
          createdAt: new Date().toISOString(),
        });
      }
      dbRef.current = draft;
      setDb(draft);
      return result;
    },
    [userId],
  );

  const actions = useMemo(() => {
    const findService = (draft: Database, id: string) => draft.services.find((item) => item.id === id)!;
    const currentTherapistId = () => dbRef.current.users.find((item) => item.id === userId)?.therapistId;

    return {
      // --- Autenticação -------------------------------------------------
      async login(email: string, password: string): Promise<string | null> {
        const account = dbRef.current.users.find((item) => normalize.email(item.email) === normalize.email(email));
        const validPassword = account && password === (account.password ?? DEMO_PASSWORD);

        if (!validPassword && supabase) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return error.message;
        }
        if (!account || !validPassword) return 'Email ou palavra-passe incorretos.';
        if (!account.active) return 'Esta conta está desativada. Contacte a clínica.';

        mutate(
          (draft) => {
            draft.users.find((item) => item.id === account.id)!.lastLogin = new Date().toISOString();
          },
          () => ({ action: 'LOGIN', tableName: 'users', recordId: account.id, metadata: 'Início de sessão', actor: account }),
        );
        setUserId(account.id);
        return null;
      },

      register(data: { name: string; email: string; password: string; phone: string; nif: string; consent: boolean }): string | null {
        if (dbRef.current.users.some((item) => normalize.email(item.email) === normalize.email(data.email))) return 'Já existe uma conta com este email.';
        const id = uid('u');
        mutate(
          (draft) => {
            const existing = matchPatient(draft, data)?.patient;
            const patientId = existing?.id ?? uid('p');
            if (!existing) {
              draft.patients.push({
                id: patientId,
                patientCode: nextPatientCode(draft),
                name: data.name,
                birthDate: '',
                nif: data.nif,
                phone: data.phone,
                email: data.email,
                address: '',
                emergencyContact: '',
                consentRgpd: data.consent,
                consentDate: data.consent ? new Date().toISOString() : undefined,
                validated: false,
                createdAt: new Date().toISOString(),
              });
            }
            draft.users.push({ id, email: data.email, name: data.name, role: 'CLIENT', active: true, password: data.password, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(), patientId });
            return patientId;
          },
          (patientId) => ({ action: 'CREATE', tableName: 'users', recordId: id, metadata: `Registo de cliente (${patientId})`, actor: { id, name: data.name } }),
        );
        setUserId(id);
        return null;
      },

      async logout() {
        if (supabase) await supabase.auth.signOut();
        setUserId(null);
      },

      resetDemo() {
        dbRef.current = createSeed();
        setDb(dbRef.current);
        setUserId(null);
      },

      // --- Cliente ------------------------------------------------------
      /** Marcação feita no Calendly: chega à clínica como pedido via webhook. */
      requestBooking(patientId: string, serviceId: string, therapistId: string, dateStart: string) {
        mutate(
          (draft) => {
            const patient = draft.patients.find((item) => item.id === patientId)!;
            const request = {
              id: uid('br'),
              externalBookingId: `cal_${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
              name: patient.name,
              email: patient.email,
              phone: patient.phone,
              nif: patient.nif,
              serviceId,
              therapistId,
              dateStart,
              receivedAt: new Date().toISOString(),
              status: 'pending' as const,
            };
            draft.bookingRequests.unshift(request);
            return request.id;
          },
          (id) => ({ action: 'CREATE', tableName: 'booking_requests', recordId: id, metadata: 'Marcação recebida via Calendly', actor: { id: 'system', name: 'Calendly (webhook)' } }),
        );
      },

      /** Fluxo 3: cancelamento com regra dos 2 dias úteis. */
      cancelAppointment(appointmentId: string) {
        const appointment = dbRef.current.appointments.find((item) => item.id === appointmentId)!;
        const withoutPenalty = businessDaysUntil(appointment.dateStart) >= 2;
        let outcome = '';
        mutate(
          (draft) => {
            const target = draft.appointments.find((item) => item.id === appointmentId)!;
            target.status = 'cancelled';
            if (withoutPenalty) {
              outcome = 'Consulta cancelada sem penalização.';
            } else {
              target.lateCancellation = true;
              outcome = `Cancelamento com menos de 2 dias úteis: perde a sessão. ${chargeSession(draft, target, findService(draft, target.serviceId), 'Cancelamento tardio')}`;
            }
          },
          () => ({ action: 'UPDATE', tableName: 'appointments', recordId: appointmentId, metadata: withoutPenalty ? 'Cancelada sem penalização' : 'Cancelada com perda de sessão' }),
        );
        return outcome;
      },

      /** Fluxo 4: MB Way → callback → PAGO → Financeira → Primavera. */
      payWithMbway(paymentId: string, phone: string) {
        mutate(
          (draft) => {
            const payment = draft.payments.find((item) => item.id === paymentId)!;
            payment.method = 'MBWay';
            payment.reference = `MBW-${normalize.phone(phone).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
          },
          () => ({ action: 'UPDATE', tableName: 'payment_transactions', recordId: paymentId, metadata: 'Pedido MB Way enviado' }),
        );
        return new Promise<void>((resolve) => {
          window.setTimeout(() => {
            mutate(
              (draft) => {
                const payment = draft.payments.find((item) => item.id === paymentId)!;
                payment.status = 'paid';
                payment.paidAt = new Date().toISOString();
                return issueInvoice(draft, paymentId, true);
              },
              (invoice) => [
                { action: 'UPDATE', tableName: 'payment_transactions', recordId: paymentId, metadata: 'Callback MB Way: estado PAGO', actor: { id: 'system', name: 'MB Way (callback)' } },
                { action: 'CREATE', tableName: 'invoices', recordId: invoice.id, metadata: `${invoice.invoiceNumber} sincronizada com Primavera`, actor: { id: 'system', name: 'Financeira' } },
              ],
            );
            resolve();
          }, 2200);
        });
      },

      /** Fluxo 5: pagamento manual fica PENDENTE até validação administrativa. */
      declareManualPayment(paymentId: string, method: PaymentMethod) {
        mutate(
          (draft) => {
            const payment = draft.payments.find((item) => item.id === paymentId)!;
            payment.method = method;
            payment.awaitingValidation = true;
          },
          () => ({ action: 'UPDATE', tableName: 'payment_transactions', recordId: paymentId, metadata: `Pagamento por ${method} declarado` }),
        );
      },

      setConsent(patientId: string, consent: boolean) {
        mutate(
          (draft) => {
            const patient = draft.patients.find((item) => item.id === patientId)!;
            patient.consentRgpd = consent;
            patient.consentDate = new Date().toISOString();
          },
          () => ({ action: 'UPDATE', tableName: 'patients', recordId: patientId, metadata: consent ? 'Consentimento RGPD concedido' : 'Consentimento RGPD retirado' }),
        );
      },

      /** RGPD: exportação dos dados do próprio cliente. */
      exportPatientData(patientId: string) {
        const payload = {
          exportadoEm: new Date().toISOString(),
          dadosPessoais: dbRef.current.patients.find((item) => item.id === patientId),
          marcacoes: dbRef.current.appointments.filter((item) => item.patientId === patientId),
          pagamentos: dbRef.current.payments.filter((item) => item.patientId === patientId),
          packs: dbRef.current.packs.filter((item) => item.patientId === patientId),
          faturas: dbRef.current.invoices.filter((item) => item.patientId === patientId),
        };
        mutate(() => null, () => ({ action: 'EXPORT', tableName: 'patients', recordId: patientId, metadata: 'Exportação de dados (RGPD)' }));
        return payload;
      },

      requestErasure(patientId: string) {
        mutate(
          (draft) => {
            const request = { id: uid('rgpd'), patientId, type: 'esquecimento' as const, status: 'pending' as const, createdAt: new Date().toISOString() };
            draft.rgpdRequests.unshift(request);
            return request.id;
          },
          (id) => ({ action: 'CREATE', tableName: 'rgpd_requests', recordId: id, metadata: 'Pedido de direito ao esquecimento' }),
        );
      },

      // --- Administrativo -----------------------------------------------
      /** Fluxos 1 e 2: associa a marcação a um cliente existente ou cria um novo. */
      processBooking(requestId: string) {
        let outcome = '';
        mutate(
          (draft) => {
            const request = draft.bookingRequests.find((item) => item.id === requestId)!;
            const match = matchPatient(draft, request);
            let patientId: string;
            if (match) {
              patientId = match.patient.id;
              request.matchedPatientId = patientId;
              request.matchedBy = match.by;
              outcome = `Associada a ${match.patient.name} (validação por ${match.by}).`;
            } else {
              patientId = uid('p');
              draft.patients.push({
                id: patientId,
                patientCode: nextPatientCode(draft),
                name: request.name,
                birthDate: '',
                nif: request.nif,
                phone: request.phone,
                email: request.email,
                address: '',
                emergencyContact: '',
                consentRgpd: true,
                consentDate: request.receivedAt,
                validated: false,
                createdAt: new Date().toISOString(),
              });
              request.matchedPatientId = patientId;
              outcome = `Cliente novo criado (${request.name}). Falta a validação administrativa.`;
            }
            const service = findService(draft, request.serviceId);
            draft.appointments.push({
              id: uid('a'),
              patientId,
              therapistId: request.therapistId,
              serviceId: request.serviceId,
              externalBookingId: request.externalBookingId,
              dateStart: request.dateStart,
              dateEnd: new Date(new Date(request.dateStart).getTime() + service.durationMinutes * 60_000).toISOString(),
              status: 'scheduled',
            });
            ensureCareTeam(draft, request.therapistId, patientId);
            request.status = 'processed';
            return { patientId, isNew: !match };
          },
          ({ patientId, isNew }) => [
            ...(isNew ? [{ action: 'CREATE' as const, tableName: 'patients', recordId: patientId, metadata: 'Cliente criado a partir do Calendly' }] : []),
            { action: 'CREATE', tableName: 'appointments', recordId: requestId, metadata: isNew ? 'Consulta de cliente novo' : 'Nova consulta de cliente existente' },
          ],
        );
        return outcome;
      },

      rejectBooking(requestId: string) {
        mutate(
          (draft) => {
            draft.bookingRequests.find((item) => item.id === requestId)!.status = 'rejected';
          },
          () => ({ action: 'UPDATE', tableName: 'booking_requests', recordId: requestId, metadata: 'Marcação rejeitada' }),
        );
      },

      validatePatient(patientId: string) {
        mutate(
          (draft) => {
            draft.patients.find((item) => item.id === patientId)!.validated = true;
          },
          () => ({ action: 'UPDATE', tableName: 'patients', recordId: patientId, metadata: 'Validação administrativa concluída' }),
        );
      },

      setAppointmentStatus(appointmentId: string, status: Appointment['status']) {
        mutate(
          (draft) => {
            const appointment = draft.appointments.find((item) => item.id === appointmentId)!;
            appointment.status = status;
            if (status === 'no_show') chargeSession(draft, appointment, findService(draft, appointment.serviceId), 'Falta sem aviso');
          },
          () => ({ action: 'UPDATE', tableName: 'appointments', recordId: appointmentId, metadata: `Estado alterado para ${status}` }),
        );
      },

      confirmPayment(paymentId: string, method: PaymentMethod) {
        mutate(
          (draft) => {
            const payment = draft.payments.find((item) => item.id === paymentId)!;
            payment.method = payment.method ?? method;
            payment.status = 'paid';
            payment.awaitingValidation = false;
            payment.paidAt = new Date().toISOString();
            return issueInvoice(draft, paymentId, false);
          },
          (invoice) => [
            { action: 'UPDATE', tableName: 'payment_transactions', recordId: paymentId, metadata: 'Validação administrativa: estado PAGO' },
            { action: 'CREATE', tableName: 'invoices', recordId: invoice.id, metadata: `Fatura ${invoice.invoiceNumber} emitida` },
          ],
        );
      },

      syncInvoice(invoiceId: string) {
        mutate(
          (draft) => {
            draft.invoices.find((item) => item.id === invoiceId)!.syncedToPrimavera = true;
          },
          () => ({ action: 'UPDATE', tableName: 'invoices', recordId: invoiceId, metadata: 'Enviada para Primavera' }),
        );
      },

      // --- Fisioterapeuta -----------------------------------------------
      /** Consulta de processo clínico: fica auditada. */
      viewEpisode(episodeId: string) {
        mutate(() => null, () => ({ action: 'READ', tableName: 'clinical_episodes', recordId: episodeId, metadata: 'Consulta de processo clínico' }));
      },

      openEpisode(patientId: string, title: string, clinicalReason: string) {
        const therapistId = currentTherapistId()!;
        const id = uid('e');
        mutate(
          (draft) => {
            draft.episodes.unshift({ id, patientId, therapistId, title, clinicalReason, openedAt: new Date().toISOString(), status: 'open' });
          },
          () => ({ action: 'CREATE', tableName: 'clinical_episodes', recordId: id, metadata: `Episódio aberto: ${title}` }),
        );
        return id;
      },

      saveAssessment(episodeId: string, fields: { subjective: string; objective: string; diagnosis: string; goals: string; treatmentPlan: string }) {
        const therapistId = currentTherapistId()!;
        mutate(
          (draft) => {
            const existing = draft.assessments.find((item) => item.episodeId === episodeId);
            if (existing) {
              Object.assign(existing, fields);
              return existing.id;
            }
            const id = uid('as');
            draft.assessments.push({ id, episodeId, therapistId, ...fields, createdAt: new Date().toISOString() });
            return id;
          },
          (id) => ({ action: 'UPDATE', tableName: 'assessments', recordId: id, metadata: 'Avaliação inicial guardada' }),
        );
      },

      registerSession(episodeId: string, appointmentId: string | undefined, note: { notes: string; painScale: number; evolution: string; nextSession: string }) {
        const therapistId = currentTherapistId()!;
        let billing = '';
        mutate(
          (draft) => {
            const sessionId = uid('se');
            const sessionNumber = draft.sessions.filter((item) => item.episodeId === episodeId).length + 1;
            draft.sessions.push({ id: sessionId, episodeId, appointmentId, sessionNumber, performedAt: new Date().toISOString() });
            const noteId = uid('sn');
            draft.sessionNotes.push({ id: noteId, sessionId, therapistId, ...note, createdAt: new Date().toISOString() });
            if (appointmentId) {
              const appointment = draft.appointments.find((item) => item.id === appointmentId)!;
              appointment.status = 'completed';
              billing = chargeSession(draft, appointment, findService(draft, appointment.serviceId), findService(draft, appointment.serviceId).name);
            }
            return { sessionId, noteId, sessionNumber };
          },
          ({ sessionId, noteId, sessionNumber }) => [
            { action: 'CREATE', tableName: 'sessions', recordId: sessionId, metadata: `Sessão nº ${sessionNumber} registada` },
            { action: 'CREATE', tableName: 'session_notes', recordId: noteId, metadata: 'Evolução clínica registada' },
          ],
        );
        return billing;
      },

      closeEpisode(episodeId: string) {
        mutate(
          (draft) => {
            const episode = draft.episodes.find((item) => item.id === episodeId)!;
            episode.status = 'closed';
            episode.closedAt = new Date().toISOString();
          },
          () => ({ action: 'UPDATE', tableName: 'clinical_episodes', recordId: episodeId, metadata: 'Episódio encerrado' }),
        );
      },

      // --- Administrador ------------------------------------------------
      toggleUser(targetId: string) {
        mutate(
          (draft) => {
            const target = draft.users.find((item) => item.id === targetId)!;
            target.active = !target.active;
            return target.active;
          },
          (active) => ({ action: 'UPDATE', tableName: 'users', recordId: targetId, metadata: active ? 'Utilizador reativado' : 'Utilizador desativado' }),
        );
      },

      inviteUser(data: { name: string; email: string; role: Role; speciality: string }): string | null {
        if (dbRef.current.users.some((item) => normalize.email(item.email) === normalize.email(data.email))) return 'Já existe um utilizador com este email.';
        const id = uid('u');
        mutate(
          (draft) => {
            let therapistId: string | undefined;
            if (data.role === 'THERAPIST') {
              therapistId = uid('t');
              draft.therapists.push({ id: therapistId, name: data.name, speciality: data.speciality || 'Fisioterapia geral', professionalLicense: '—', active: true });
            }
            draft.users.push({ id, email: data.email, name: data.name, role: data.role, active: true, createdAt: new Date().toISOString(), therapistId });
          },
          () => ({ action: 'CREATE', tableName: 'users', recordId: id, metadata: `Convite enviado (${data.role})` }),
        );
        return null;
      },

      updateService(serviceId: string, patch: Partial<Service>) {
        mutate(
          (draft) => {
            Object.assign(draft.services.find((item) => item.id === serviceId)!, patch);
          },
          () => ({ action: 'UPDATE', tableName: 'services', recordId: serviceId, metadata: `Serviço atualizado: ${Object.keys(patch).join(', ')}` }),
        );
      },

      addService(data: { name: string; durationMinutes: number; price: number }) {
        const id = uid('s');
        mutate(
          (draft) => {
            draft.services.push({ id, ...data, active: true });
          },
          () => ({ action: 'CREATE', tableName: 'services', recordId: id, metadata: `Serviço criado: ${data.name}` }),
        );
      },

      /** RGPD: anonimiza dados pessoais; registos clínicos ficam retidos por obrigação legal. */
      executeErasure(requestId: string) {
        mutate(
          (draft) => {
            const request = draft.rgpdRequests.find((item) => item.id === requestId)!;
            const patient = draft.patients.find((item) => item.id === request.patientId)!;
            Object.assign(patient, { name: `Cliente ${patient.patientCode}`, email: '', phone: '', nif: '', address: '', emergencyContact: '', birthDate: '', anonymized: true });
            draft.users.filter((item) => item.patientId === patient.id).forEach((item) => { item.active = false; });
            request.status = 'done';
            return patient.id;
          },
          (patientId) => ({ action: 'DELETE', tableName: 'patients', recordId: patientId, metadata: 'Dados pessoais anonimizados (RGPD)' }),
        );
      },
    };
  }, [mutate, userId]);

  return { db, user, actions };
}

type Store = ReturnType<typeof useDemoStore>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useDemoStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore fora do StoreProvider');
  return store;
}

export type { User };
