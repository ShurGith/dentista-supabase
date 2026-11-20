BEGIN;
SELECT plan(5);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('90000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rls-clinic-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('90000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rls-clinic-b@example.invalid', '', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clinics (id, name)
VALUES ('e2222222-2222-2222-2222-222222222222', 'RLS Test Clinic B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, clinic_id, role_id, first_name, last_name, email)
VALUES
  ('90000000-0000-0000-0000-000000000001', 'e1111111-1111-1111-1111-111111111111', 'receptionist', 'Test', 'Reception A', 'rls-clinic-a@example.invalid'),
  ('90000000-0000-0000-0000-000000000002', 'e2222222-2222-2222-2222-222222222222', 'receptionist', 'Test', 'Reception B', 'rls-clinic-b@example.invalid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, clinic_id, first_name, last_name, phone)
VALUES
  ('91000000-0000-0000-0000-000000000001', 'e1111111-1111-1111-1111-111111111111', 'Patient', 'Clinic A', '+34911111111'),
  ('91000000-0000-0000-0000-000000000002', 'e2222222-2222-2222-2222-222222222222', 'Patient', 'Clinic B', '+34912222222')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);

SELECT is((SELECT count(*)::integer FROM public.patients WHERE id = '91000000-0000-0000-0000-000000000001'), 1, 'clinic A receptionist sees its patient');
SELECT is((SELECT count(*)::integer FROM public.patients WHERE clinic_id = 'e2222222-2222-2222-2222-222222222222'), 0, 'clinic A cannot read clinic B patients');
SELECT results_eq(
  $$UPDATE public.patients SET notes = 'updated by clinic A' WHERE id = '91000000-0000-0000-0000-000000000001' RETURNING id$$,
  $$VALUES ('91000000-0000-0000-0000-000000000001'::uuid)$$,
  'clinic A can update its own patient'
);
SELECT results_eq(
  $$UPDATE public.patients SET notes = 'cross-clinic attempt' WHERE id = '91000000-0000-0000-0000-000000000002' RETURNING id$$,
  $$SELECT NULL::uuid WHERE false$$,
  'clinic A cannot update a clinic B patient'
);
SELECT ok(NOT has_table_privilege('authenticated', 'public.settings', 'SELECT'), 'authenticated clients cannot select Wawp secrets');

SELECT * FROM finish();
ROLLBACK;
