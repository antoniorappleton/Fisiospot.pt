// Modelo de dados do Caderno de Encargos (secções 5–8), na forma usada pela app.

export type Role = 'ADMIN' | 'THERAPIST' | 'RECEPTION' | 'CLIENT';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'MBWay' | 'Transferência' | 'Cartão' | 'Dinheiro';
export type PaymentStatus = 'pending' | 'paid';
export type EpisodeStatus = 'open' | 'closed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  /** Só para contas criadas na demo; as contas base usam a password demo. */
  password?: string;
  lastLogin?: string;
  createdAt: string;
  therapistId?: string;
  patientId?: string;
}

export interface Patient {
  id: string;
  patientCode: string;
  name: string;
  birthDate: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  consentRgpd: boolean;
  consentDate?: string;
  /** Fluxo 1: cliente novo aguarda validação administrativa. */
  validated: boolean;
  createdAt: string;
  anonymized?: boolean;
}

export interface Therapist {
  id: string;
  name: string;
  speciality: string;
  professionalLicense: string;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  therapistId: string;
  serviceId: string;
  externalBookingId?: string;
  dateStart: string;
  dateEnd: string;
  status: AppointmentStatus;
  /** Fluxo 3: cancelamento com menos de 2 dias úteis perde a sessão. */
  lateCancellation?: boolean;
}

/** Marcação recebida do Calendly via webhook, antes de ser processada. */
export interface BookingRequest {
  id: string;
  externalBookingId: string;
  name: string;
  email: string;
  phone: string;
  nif: string;
  serviceId: string;
  therapistId: string;
  dateStart: string;
  receivedAt: string;
  status: 'pending' | 'processed' | 'rejected';
  matchedPatientId?: string;
  matchedBy?: 'email' | 'telefone' | 'NIF';
}

export interface ClinicalEpisode {
  id: string;
  patientId: string;
  therapistId: string;
  title: string;
  clinicalReason: string;
  openedAt: string;
  closedAt?: string;
  status: EpisodeStatus;
}

export interface Assessment {
  id: string;
  episodeId: string;
  therapistId: string;
  subjective: string;
  objective: string;
  diagnosis: string;
  goals: string;
  treatmentPlan: string;
  createdAt: string;
}

export interface ClinicalSession {
  id: string;
  episodeId: string;
  appointmentId?: string;
  sessionNumber: number;
  performedAt: string;
}

export interface SessionNote {
  id: string;
  sessionId: string;
  therapistId: string;
  notes: string;
  painScale: number;
  evolution: string;
  nextSession: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  patientId: string;
  appointmentId?: string;
  description: string;
  amount: number;
  method?: PaymentMethod;
  status: PaymentStatus;
  /** Fluxo 5: pagamento manual declarado pelo cliente, à espera da receção. */
  awaitingValidation?: boolean;
  reference: string;
  paidAt?: string;
}

export interface Pack {
  id: string;
  patientId: string;
  serviceId: string;
  totalSessions: number;
  remainingSessions: number;
  purchaseDate: string;
  expirationDate: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  /** Integração prevista com o Primavera. */
  syncedToPrimavera: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT';
  tableName: string;
  recordId: string;
  metadata: string;
  createdAt: string;
}

export interface RgpdRequest {
  id: string;
  patientId: string;
  type: 'esquecimento';
  status: 'pending' | 'done';
  createdAt: string;
}

export interface Database {
  version: number;
  users: User[];
  patients: Patient[];
  therapists: Therapist[];
  services: Service[];
  appointments: Appointment[];
  bookingRequests: BookingRequest[];
  episodes: ClinicalEpisode[];
  assessments: Assessment[];
  sessions: ClinicalSession[];
  sessionNotes: SessionNote[];
  payments: PaymentTransaction[];
  packs: Pack[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  rgpdRequests: RgpdRequest[];
  /** Associação fisioterapeuta ↔ paciente (RLS: apenas pacientes autorizados). */
  careTeam: Array<{ therapistId: string; patientId: string }>;
}
