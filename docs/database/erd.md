# ERD inicial

```mermaid
erDiagram
  PROFILES ||--o| THERAPISTS : "pode ser"
  PATIENTS ||--o{ APPOINTMENTS : marca
  THERAPISTS ||--o{ APPOINTMENTS : atende
  SERVICES ||--o{ APPOINTMENTS : inclui
  PATIENTS ||--o{ CLINICAL_EPISODES : possui
  THERAPISTS ||--o{ CLINICAL_EPISODES : acompanha
  CLINICAL_EPISODES ||--o{ ASSESSMENTS : tem
  CLINICAL_EPISODES ||--o{ SESSIONS : inclui
  APPOINTMENTS ||--o| SESSIONS : origina
  SESSIONS ||--o| SESSION_NOTES : documenta
  PATIENTS ||--o{ PAYMENT_TRANSACTIONS : realiza
  APPOINTMENTS ||--o{ PAYMENT_TRANSACTIONS : gera
  PATIENTS ||--o{ PACKS : compra
  SERVICES ||--o{ PACKS : referencia
  PATIENTS ||--o{ INVOICES : recebe
  PROFILES ||--o{ AUDIT_LOGS : executa
```

A migração correspondente está em `supabase/migrations/202609220001_initial_schema.sql`.

## Decisões iniciais

- A autenticação fica no `auth.users` do Supabase; `profiles` guarda o papel operacional.
- Dados clínicos têm tabelas próprias e políticas RLS restritas a administradores e fisioterapeutas.
- Pacientes usam `deleted_at` para permitir soft delete e preservar auditoria.
- Integrações externas usam `external_booking_id` e `reference` como identificadores idempotentes.
