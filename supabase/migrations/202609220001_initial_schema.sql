create type public.user_role as enum ('ADMIN', 'THERAPIST', 'RECEPTION', 'CLIENT');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.payment_method as enum ('MBWay', 'Transferência', 'Cartão', 'Dinheiro');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.episode_status as enum ('open', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.user_role not null default 'CLIENT',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text not null unique,
  name text not null,
  birth_date date,
  nif text unique,
  phone text,
  email text,
  address text,
  emergency_contact text,
  consent_rgpd boolean not null default false,
  consent_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.therapists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  speciality text,
  professional_license text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  therapist_id uuid not null references public.therapists(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  external_booking_id text unique,
  date_start timestamptz not null,
  date_end timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  check (date_end > date_start)
);

create table public.clinical_episodes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  therapist_id uuid not null references public.therapists(id) on delete restrict,
  title text not null,
  clinical_reason text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status public.episode_status not null default 'open',
  created_at timestamptz not null default now(),
  check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null))
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.clinical_episodes(id) on delete cascade,
  therapist_id uuid not null references public.therapists(id) on delete restrict,
  subjective text,
  objective text,
  diagnosis text,
  goals text,
  treatment_plan text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.clinical_episodes(id) on delete cascade,
  appointment_id uuid unique references public.appointments(id) on delete restrict,
  session_number integer not null check (session_number > 0),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  therapist_id uuid not null references public.therapists(id) on delete restrict,
  notes text not null,
  pain_scale integer check (pain_scale between 0 and 10),
  evolution text,
  next_session text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  total_sessions integer not null check (total_sessions > 0),
  remaining_sessions integer not null check (remaining_sessions between 0 and total_sessions),
  purchase_date date not null default current_date,
  expiration_date date,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  invoice_number text not null unique,
  amount numeric(10, 2) not null check (amount >= 0),
  issue_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointments_patient_date_idx on public.appointments(patient_id, date_start);
create index appointments_therapist_date_idx on public.appointments(therapist_id, date_start);
create index clinical_episodes_patient_idx on public.clinical_episodes(patient_id, status);
create index audit_logs_record_idx on public.audit_logs(table_name, record_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.therapists enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_episodes enable row level security;
alter table public.assessments enable row level security;
alter table public.sessions enable row level security;
alter table public.session_notes enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.packs enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy profiles_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'ADMIN');

create policy patients_staff_access on public.patients
  for all using (public.current_user_role() in ('ADMIN', 'RECEPTION', 'THERAPIST'))
  with check (public.current_user_role() in ('ADMIN', 'RECEPTION', 'THERAPIST'));

create policy appointments_staff_access on public.appointments
  for all using (public.current_user_role() in ('ADMIN', 'RECEPTION', 'THERAPIST'))
  with check (public.current_user_role() in ('ADMIN', 'RECEPTION', 'THERAPIST'));

create policy clinical_therapist_or_admin on public.clinical_episodes
  for all using (public.current_user_role() in ('ADMIN', 'THERAPIST'))
  with check (public.current_user_role() in ('ADMIN', 'THERAPIST'));

create policy assessments_therapist_or_admin on public.assessments
  for all using (public.current_user_role() in ('ADMIN', 'THERAPIST'))
  with check (public.current_user_role() in ('ADMIN', 'THERAPIST'));

create policy sessions_therapist_or_admin on public.sessions
  for all using (public.current_user_role() in ('ADMIN', 'THERAPIST'))
  with check (public.current_user_role() in ('ADMIN', 'THERAPIST'));

create policy session_notes_therapist_or_admin on public.session_notes
  for all using (public.current_user_role() in ('ADMIN', 'THERAPIST'))
  with check (public.current_user_role() in ('ADMIN', 'THERAPIST'));

create policy billing_staff_access on public.payment_transactions
  for all using (public.current_user_role() in ('ADMIN', 'RECEPTION'))
  with check (public.current_user_role() in ('ADMIN', 'RECEPTION'));

create policy invoices_staff_access on public.invoices
  for all using (public.current_user_role() in ('ADMIN', 'RECEPTION'))
  with check (public.current_user_role() in ('ADMIN', 'RECEPTION'));

create policy audit_admin_read on public.audit_logs
  for select using (public.current_user_role() = 'ADMIN');
