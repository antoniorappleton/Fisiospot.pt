export type UserRole = 'ADMIN' | 'THERAPIST' | 'RECEPTION' | 'CLIENT';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentMethod = 'MBWay' | 'Transferência' | 'Cartão' | 'Dinheiro';

export interface Profile {
  id: string;
  userId: string;
  name: string;
  role: UserRole;
  active: boolean;
}
