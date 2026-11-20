BEGIN;
SELECT plan(11);

SELECT ok(
  (SELECT count(*) = 29 AND bool_and(c.relrowsecurity)
   FROM pg_catalog.pg_class AS c
   JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relname = ANY (ARRAY[
       'clinics','roles','permissions','role_permissions','profiles','operatories',
       'services','professionals','professional_services','clinic_schedules',
       'professional_schedules','professional_time_off','blocked_slots','patients',
       'patient_medical_records','patient_consents','patient_documents','appointments',
       'appointment_status_history','appointment_reminders','whatsapp_contacts',
       'whatsapp_conversations','whatsapp_messages','message_templates','message_campaigns',
       'message_logs','webhook_events','settings','audit_logs'
     ])),
  'RLS is enabled on every application table'
);

SELECT ok(NOT has_schema_privilege('anon', 'public', 'USAGE'), 'anon cannot access the public schema');
SELECT ok(NOT has_table_privilege('anon', 'public.patients', 'SELECT'), 'anon cannot read patient records');
SELECT ok(NOT has_table_privilege('anon', 'public.settings', 'SELECT'), 'anon cannot read clinic settings');
SELECT ok(NOT has_table_privilege('authenticated', 'public.settings', 'SELECT'), 'client roles cannot read Wawp secrets directly');
SELECT ok(has_table_privilege('authenticated', 'public.patients', 'SELECT'), 'authenticated users can use permission-scoped patient reads');
SELECT ok(NOT has_function_privilege('anon', 'private.has_permission(text)', 'EXECUTE'), 'anon cannot execute permission helpers');
SELECT ok(
  (SELECT count(*) = 4 FROM storage.buckets
   WHERE id IN ('patient-documents','patient-avatars','whatsapp-media','internal-documents')
     AND public = false),
  'all clinical and messaging buckets are private'
);
SELECT ok(
  (SELECT count(*) = 2 FROM storage.buckets
   WHERE id IN ('clinic-public-assets','professional-avatars')
     AND public = true),
  'only the explicitly public asset buckets are public'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND pg_catalog.pg_get_expr(p.polqual, p.polrelid) IN ('true', '(true)')
  ),
  'no public table policy grants unconditional row access'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.whatsapp_messages', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.webhook_events', 'SELECT'),
  'anon cannot read WhatsApp or webhook payloads'
);

SELECT * FROM finish();
ROLLBACK;
