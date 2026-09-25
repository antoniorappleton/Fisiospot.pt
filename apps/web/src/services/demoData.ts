import type { Database } from '../types/domain';

export const DEMO_PASSWORD = 'Demo123!';

export const demoLogins = [
  { email: 'filipe.db@fisiospot.pt', label: 'Administrador' },
  { email: 'sofia.costa@fisiospot.pt', label: 'Administrativo' },
  { email: 'ana.martins@fisiospot.pt', label: 'Fisioterapeuta' },
  { email: 'joao.pereira@fisiospot.pt', label: 'Paciente' },
];

/** Data relativa a hoje, para a demo estar sempre atual. */
function at(dayOffset: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const plus = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

export function createSeed(): Database {
  const created = at(-60, 9);

  const appointments: Database['appointments'] = [
    { id: 'a-06', patientId: 'p-joao', therapistId: 't-ana', serviceId: 's-aval', dateStart: at(-14, 10, 30), dateEnd: plus(at(-14, 10, 30), 60), status: 'completed', externalBookingId: 'cal_7H2K9' },
    { id: 'a-07', patientId: 'p-joao', therapistId: 't-ana', serviceId: 's-fisio', dateStart: at(-7, 10, 30), dateEnd: plus(at(-7, 10, 30), 45), status: 'completed' },
    { id: 'a-08', patientId: 'p-marta', therapistId: 't-ana', serviceId: 's-fisio', dateStart: at(-4, 16), dateEnd: plus(at(-4, 16), 45), status: 'completed' },
    { id: 'a-01', patientId: 'p-joao', therapistId: 't-ana', serviceId: 's-fisio', dateStart: at(0, 10, 30), dateEnd: plus(at(0, 10, 30), 45), status: 'confirmed' },
    { id: 'a-03', patientId: 'p-carlos', therapistId: 't-rui', serviceId: 's-desp', dateStart: at(0, 11), dateEnd: plus(at(0, 11), 45), status: 'confirmed' },
    { id: 'a-02', patientId: 'p-marta', therapistId: 't-ana', serviceId: 's-fisio', dateStart: at(0, 14), dateEnd: plus(at(0, 14), 45), status: 'scheduled' },
    { id: 'a-04', patientId: 'p-joao', therapistId: 't-ana', serviceId: 's-fisio', dateStart: at(1, 10, 30), dateEnd: plus(at(1, 10, 30), 45), status: 'scheduled' },
    { id: 'a-09', patientId: 'p-ines', therapistId: 't-rui', serviceId: 's-aval', dateStart: at(3, 9), dateEnd: plus(at(3, 9), 60), status: 'scheduled', externalBookingId: 'cal_Q81LM' },
    { id: 'a-05', patientId: 'p-joao', therapistId: 't-ana', serviceId: 's-fisio', dateStart: at(7, 10, 30), dateEnd: plus(at(7, 10, 30), 45), status: 'scheduled' },
  ];

  return {
    version: 1,
    users: [
      { id: 'u-filipe', email: 'filipe.db@fisiospot.pt', name: 'Filipe D. Borges', role: 'ADMIN', active: true, createdAt: created },
      { id: 'u-sofia', email: 'sofia.costa@fisiospot.pt', name: 'Sofia Costa', role: 'RECEPTION', active: true, createdAt: created },
      { id: 'u-ana', email: 'ana.martins@fisiospot.pt', name: 'Ana Martins', role: 'THERAPIST', active: true, createdAt: created, therapistId: 't-ana' },
      { id: 'u-rui', email: 'rui.santos@fisiospot.pt', name: 'Rui Santos', role: 'THERAPIST', active: true, createdAt: created, therapistId: 't-rui' },
      { id: 'u-joao', email: 'joao.pereira@fisiospot.pt', name: 'João Pereira', role: 'CLIENT', active: true, createdAt: at(-15, 18), patientId: 'p-joao' },
      { id: 'u-marta', email: 'marta.oliveira@fisiospot.pt', name: 'Marta Oliveira', role: 'CLIENT', active: true, createdAt: at(-11, 12), patientId: 'p-marta' },
    ],
    patients: [
      { id: 'p-joao', patientCode: 'FS-0001', name: 'João Pereira', birthDate: '1987-03-14', nif: '231456789', phone: '912 345 678', email: 'joao.pereira@fisiospot.pt', address: 'Rua das Flores 12, Lisboa', emergencyContact: 'Rita Pereira · 913 222 111', consentRgpd: true, consentDate: at(-15, 18), validated: true, createdAt: at(-15, 18) },
      { id: 'p-marta', patientCode: 'FS-0002', name: 'Marta Oliveira', birthDate: '1992-11-02', nif: '245781230', phone: '936 110 220', email: 'marta.oliveira@fisiospot.pt', address: 'Av. da República 80, Lisboa', emergencyContact: 'Paulo Oliveira · 917 000 333', consentRgpd: true, consentDate: at(-11, 12), validated: true, createdAt: at(-11, 12) },
      { id: 'p-carlos', patientCode: 'FS-0003', name: 'Carlos Nunes', birthDate: '1979-06-21', nif: '208334551', phone: '965 443 210', email: 'carlos.nunes@mail.pt', address: 'Rua do Sol 5, Oeiras', emergencyContact: 'Joana Nunes · 912 888 000', consentRgpd: true, consentDate: at(-30, 9), validated: true, createdAt: at(-30, 9) },
      { id: 'p-ines', patientCode: 'FS-0004', name: 'Inês Lopes', birthDate: '2001-01-09', nif: '259870112', phone: '927 555 010', email: 'ines.lopes@mail.pt', address: '', emergencyContact: '', consentRgpd: true, consentDate: at(-1, 21), validated: false, createdAt: at(-1, 21) },
    ],
    therapists: [
      { id: 't-ana', name: 'Ana Martins', speciality: 'Ortopedia e reabilitação', professionalLicense: 'C-104 552', active: true },
      { id: 't-rui', name: 'Rui Santos', speciality: 'Fisioterapia desportiva', professionalLicense: 'C-118 097', active: true },
    ],
    services: [
      { id: 's-aval', name: 'Avaliação inicial', durationMinutes: 60, price: 45, active: true },
      { id: 's-fisio', name: 'Sessão de fisioterapia', durationMinutes: 45, price: 35, active: true },
      { id: 's-desp', name: 'Fisioterapia desportiva', durationMinutes: 45, price: 40, active: true },
      { id: 's-pilates', name: 'Pilates clínico', durationMinutes: 50, price: 30, active: true },
    ],
    appointments,
    bookingRequests: [
      { id: 'br-01', externalBookingId: 'cal_P55XA', name: 'Pedro Almeida', email: 'pedro.almeida@mail.pt', phone: '939 101 202', nif: '262118790', serviceId: 's-aval', therapistId: 't-rui', dateStart: at(2, 17), receivedAt: at(0, 8, 12), status: 'pending' },
      { id: 'br-02', externalBookingId: 'cal_M20KD', name: 'Marta O.', email: 'marta.o@hotmail.com', phone: '910 000 999', nif: '245781230', serviceId: 's-fisio', therapistId: 't-ana', dateStart: at(4, 15), receivedAt: at(0, 9, 3), status: 'pending' },
    ],
    episodes: [
      { id: 'e-01', patientId: 'p-joao', therapistId: 't-ana', title: 'Pós-operatório joelho', clinicalReason: 'Reconstrução do LCA direito há 6 semanas.', openedAt: at(-14, 11, 30), status: 'open' },
      { id: 'e-02', patientId: 'p-marta', therapistId: 't-ana', title: 'Lombalgia', clinicalReason: 'Dor lombar mecânica com 3 meses de evolução.', openedAt: at(-4, 16, 45), status: 'open' },
      { id: 'e-03', patientId: 'p-carlos', therapistId: 't-rui', title: 'Entorse tornozelo', clinicalReason: 'Entorse grau II em inversão, tornozelo esquerdo.', openedAt: at(-20, 11), status: 'open' },
    ],
    assessments: [
      { id: 'as-01', episodeId: 'e-01', therapistId: 't-ana', subjective: 'Dor 5/10 ao subir escadas. Rigidez matinal.', objective: 'Flexão 95°, extensão -5°. Edema ligeiro.', diagnosis: 'Défice de mobilidade e força pós-LCA.', goals: 'Flexão 120° e marcha sem claudicação em 6 semanas.', treatmentPlan: '2x/semana: mobilidade, fortalecimento quadricípite, treino proprioceptivo.', createdAt: at(-14, 11, 30) },
      { id: 'as-02', episodeId: 'e-02', therapistId: 't-ana', subjective: 'Dor 6/10 ao fim do dia, pior sentada.', objective: 'Flexão lombar limitada, teste de Lasègue negativo.', diagnosis: 'Lombalgia mecânica inespecífica.', goals: 'Dor < 2/10 e retoma de corrida em 8 semanas.', treatmentPlan: 'Terapia manual, controlo motor e educação postural.', createdAt: at(-4, 16, 45) },
    ],
    sessions: [
      { id: 'se-01', episodeId: 'e-01', appointmentId: 'a-07', sessionNumber: 1, performedAt: at(-7, 11, 15) },
      { id: 'se-02', episodeId: 'e-02', appointmentId: 'a-08', sessionNumber: 1, performedAt: at(-4, 16, 45) },
    ],
    sessionNotes: [
      { id: 'sn-01', sessionId: 'se-01', therapistId: 't-ana', notes: 'Mobilização passiva e exercícios isométricos.', painScale: 4, evolution: 'Flexão 105°. Boa adesão ao plano em casa.', nextSession: 'Introduzir bicicleta estática.', createdAt: at(-7, 11, 20) },
      { id: 'sn-02', sessionId: 'se-02', therapistId: 't-ana', notes: 'Mobilização lombar, ensino de exercícios de core.', painScale: 5, evolution: 'Alívio parcial após sessão.', nextSession: 'Progredir exercícios de estabilização.', createdAt: at(-4, 16, 50) },
    ],
    payments: [
      { id: 'pay-01', patientId: 'p-joao', description: 'Pack 6 sessões de fisioterapia', amount: 180, method: 'MBWay', status: 'paid', reference: 'MBW-883201', paidAt: at(-14, 12) },
      { id: 'pay-02', patientId: 'p-joao', appointmentId: 'a-06', description: 'Avaliação inicial', amount: 45, status: 'pending', reference: 'REF-100045' },
      { id: 'pay-03', patientId: 'p-marta', appointmentId: 'a-08', description: 'Sessão de fisioterapia', amount: 35, status: 'pending', reference: 'REF-100046' },
      { id: 'pay-04', patientId: 'p-carlos', description: 'Fisioterapia desportiva', amount: 40, method: 'Transferência', status: 'pending', awaitingValidation: true, reference: 'TRF-55120' },
    ],
    packs: [
      { id: 'pk-01', patientId: 'p-joao', serviceId: 's-fisio', totalSessions: 6, remainingSessions: 5, purchaseDate: at(-14, 12), expirationDate: at(76, 23) },
    ],
    invoices: [
      { id: 'inv-01', patientId: 'p-joao', paymentId: 'pay-01', invoiceNumber: 'FT 2026/0141', amount: 180, issueDate: at(-14, 12), syncedToPrimavera: true },
    ],
    auditLogs: [
      { id: 'al-01', userId: 'system', userName: 'Calendly (webhook)', action: 'CREATE', tableName: 'booking_requests', recordId: 'br-01', metadata: 'Nova marcação recebida', createdAt: at(0, 8, 12) },
      { id: 'al-02', userId: 'u-ana', userName: 'Ana Martins', action: 'UPDATE', tableName: 'session_notes', recordId: 'sn-02', metadata: 'Evolução clínica registada', createdAt: at(-4, 16, 50) },
      { id: 'al-03', userId: 'system', userName: 'MB Way (callback)', action: 'UPDATE', tableName: 'payment_transactions', recordId: 'pay-01', metadata: 'Estado PAGO', createdAt: at(-14, 12) },
    ],
    rgpdRequests: [],
    careTeam: [
      { therapistId: 't-ana', patientId: 'p-joao' },
      { therapistId: 't-ana', patientId: 'p-marta' },
      { therapistId: 't-rui', patientId: 'p-carlos' },
      { therapistId: 't-rui', patientId: 'p-ines' },
    ],
  };
}
