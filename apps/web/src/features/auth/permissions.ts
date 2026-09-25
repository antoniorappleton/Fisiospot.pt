import type { Role } from '../../types/domain';

// Perfis e permissões do Caderno de Encargos (secção 3), com menor privilégio.
export type Permission =
  | 'own.read'
  | 'booking.create'
  | 'agenda.read'
  | 'agenda.manage'
  | 'patients.manage'
  | 'patients.readAssigned'
  | 'clinical.write'
  | 'payments.confirm'
  | 'billing.read'
  | 'users.manage'
  | 'settings.manage'
  | 'audit.read';

const matrix: Record<Role, Permission[]> = {
  CLIENT: ['own.read', 'booking.create'],
  THERAPIST: ['agenda.read', 'patients.readAssigned', 'clinical.write'],
  RECEPTION: ['agenda.read', 'agenda.manage', 'patients.manage', 'payments.confirm', 'billing.read'],
  ADMIN: ['users.manage', 'settings.manage', 'audit.read', 'billing.read'],
};

export const can = (role: Role, permission: Permission) => matrix[role].includes(permission);

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Administrativo',
  THERAPIST: 'Fisioterapeuta',
  CLIENT: 'Cliente',
};

export const roleRestrictions: Record<Role, string> = {
  ADMIN: 'Sem acesso clínico direto',
  RECEPTION: 'Sem acesso a conteúdo clínico',
  THERAPIST: 'Sem acesso a faturação e utilizadores',
  CLIENT: 'Acesso apenas aos seus dados',
};
