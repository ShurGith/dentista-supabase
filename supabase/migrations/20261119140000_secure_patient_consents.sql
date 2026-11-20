alter table public.patient_consents enable row level security;

revoke all on table public.patient_consents from anon, authenticated;
