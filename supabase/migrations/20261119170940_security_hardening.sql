-- Harden the existing clinic schema without replacing its current data model.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.current_user_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.clinic_id
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
    AND p.is_active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_user_role_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role_id
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
    AND p.is_active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.has_permission(permission_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active
      AND (
        p.role_id = 'superadmin'
        OR EXISTS (
          SELECT 1
          FROM public.role_permissions AS rp
          WHERE rp.role_id = p.role_id
            AND rp.permission_id = $1
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.patient_assigned_to_user(patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments AS a
    JOIN public.professionals AS pr ON pr.id = a.professional_id
    WHERE a.patient_id = $1
      AND pr.profile_id = (SELECT auth.uid())
      AND a.clinic_id = (SELECT private.current_user_clinic_id())
      AND a.status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_assigned_professional(professional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals AS p
    WHERE p.id = $1
      AND p.profile_id = (SELECT auth.uid())
      AND p.clinic_id = (SELECT private.current_user_clinic_id())
  );
$$;

REVOKE ALL ON FUNCTION private.current_user_clinic_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_user_role_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_permission(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.patient_assigned_to_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_assigned_professional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.patient_assigned_to_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_assigned_professional(uuid) TO authenticated;

-- Add only permissions required to express the existing roles in RLS.
INSERT INTO public.permissions (id, module, action, description) VALUES
  ('clinics:manage', 'clinics', 'manage', 'Administrar datos de la clínica'),
  ('users:read', 'users', 'read', 'Consultar perfiles del personal'),
  ('users:manage', 'users', 'manage', 'Administrar perfiles del personal'),
  ('roles:manage', 'roles', 'manage', 'Administrar roles y permisos'),
  ('professionals:manage', 'professionals', 'manage', 'Administrar profesionales'),
  ('services:manage', 'services', 'manage', 'Administrar servicios'),
  ('schedules:manage', 'schedules', 'manage', 'Administrar horarios y bloqueos'),
  ('patients:documents_read', 'patients', 'documents_read', 'Consultar documentos de pacientes'),
  ('patients:documents_manage', 'patients', 'documents_manage', 'Administrar documentos de pacientes'),
  ('appointments:delete', 'appointments', 'delete', 'Eliminar citas'),
  ('appointments:manage_others', 'appointments', 'manage_others', 'Gestionar citas de otros profesionales'),
  ('whatsapp:manage_templates', 'whatsapp', 'manage_templates', 'Administrar plantillas de WhatsApp'),
  ('settings:read', 'settings', 'read', 'Consultar configuración'),
  ('audit:read', 'audit', 'read', 'Consultar registros de auditoría'),
  ('documents:manage', 'documents', 'manage', 'Administrar documentos internos')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'admin', p.id
FROM public.permissions AS p
WHERE p.id IN (
  'clinics:manage', 'users:read', 'users:manage', 'roles:manage',
  'professionals:manage', 'services:manage', 'schedules:manage',
  'patients:documents_read', 'patients:documents_manage',
  'appointments:delete', 'appointments:manage_others',
  'whatsapp:manage_templates', 'settings:read', 'audit:read', 'documents:manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('professional', 'patients:documents_read'),
  ('professional', 'settings:read'),
  ('receptionist', 'settings:read')
ON CONFLICT DO NOTHING;

-- Every application table is protected, including tables omitted by the first migration.
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove the original public-write and clinic-wide USING (true) policies.
DROP POLICY IF EXISTS "Public read active clinics" ON public.clinics;
DROP POLICY IF EXISTS "Authenticated staff full access clinics" ON public.clinics;
DROP POLICY IF EXISTS "Authenticated staff full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public read active services" ON public.services;
DROP POLICY IF EXISTS "Authenticated staff full access services" ON public.services;
DROP POLICY IF EXISTS "Public read active professionals" ON public.professionals;
DROP POLICY IF EXISTS "Authenticated staff full access professionals" ON public.professionals;
DROP POLICY IF EXISTS "Public read active operatories" ON public.operatories;
DROP POLICY IF EXISTS "Authenticated staff full access operatories" ON public.operatories;
DROP POLICY IF EXISTS "Public read clinic schedules" ON public.clinic_schedules;
DROP POLICY IF EXISTS "Authenticated staff full access clinic_schedules" ON public.clinic_schedules;
DROP POLICY IF EXISTS "Public read professional schedules" ON public.professional_schedules;
DROP POLICY IF EXISTS "Authenticated staff full access professional_schedules" ON public.professional_schedules;
DROP POLICY IF EXISTS "Public read blocked slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Authenticated staff full access blocked_slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Public create patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated staff full access patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated staff full access medical_records" ON public.patient_medical_records;
DROP POLICY IF EXISTS "Public create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated staff full access appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public create consent" ON public.patient_consents;
DROP POLICY IF EXISTS "Authenticated staff full access whatsapp_conv" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Authenticated staff full access whatsapp_msg" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated staff full access settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated staff full access audit" ON public.audit_logs;

-- RLS helpers read only the authenticated caller's own profile and permission mapping.
CREATE POLICY "Clinic members read their clinic"
  ON public.clinics FOR SELECT TO authenticated
  USING (id = (SELECT private.current_user_clinic_id()));
CREATE POLICY "Clinic admins update their clinic"
  ON public.clinics FOR UPDATE TO authenticated
  USING (id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('clinics:manage')))
  WITH CHECK (id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('clinics:manage')));

CREATE POLICY "Authenticated users read role catalog"
  ON public.roles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users read permission catalog"
  ON public.permissions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users read role permission catalog"
  ON public.role_permissions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Users read own or authorized clinic profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('users:read')))
  );

CREATE POLICY "Clinic members read operatories"
  ON public.operatories FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()));
CREATE POLICY "Schedule managers create operatories"
  ON public.operatories FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));
CREATE POLICY "Schedule managers update operatories"
  ON public.operatories FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));
CREATE POLICY "Schedule managers delete operatories"
  ON public.operatories FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));

CREATE POLICY "Clinic members read services"
  ON public.services FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()));
CREATE POLICY "Service managers create services"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('services:manage')));
CREATE POLICY "Service managers update services"
  ON public.services FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('services:manage')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('services:manage')));
CREATE POLICY "Service managers delete services"
  ON public.services FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('services:manage')));

CREATE POLICY "Clinic members read professionals"
  ON public.professionals FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()));
CREATE POLICY "Professional managers create professionals"
  ON public.professionals FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('professionals:manage')));
CREATE POLICY "Professional managers update professionals"
  ON public.professionals FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('professionals:manage')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('professionals:manage')));
CREATE POLICY "Professional managers delete professionals"
  ON public.professionals FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('professionals:manage')));

CREATE POLICY "Clinic members read professional services"
  ON public.professional_services FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.professionals AS pr
    JOIN public.services AS s ON s.clinic_id = pr.clinic_id
    WHERE pr.id = professional_id AND s.id = service_id
      AND pr.clinic_id = (SELECT private.current_user_clinic_id())
  ));
CREATE POLICY "Managers create professional services"
  ON public.professional_services FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.has_permission('professionals:manage'))
    AND EXISTS (
      SELECT 1 FROM public.professionals AS pr
      JOIN public.services AS s ON s.clinic_id = pr.clinic_id
      WHERE pr.id = professional_id AND s.id = service_id
        AND pr.clinic_id = (SELECT private.current_user_clinic_id())
    )
  );
CREATE POLICY "Managers update professional services"
  ON public.professional_services FOR UPDATE TO authenticated
  USING (
    (SELECT private.has_permission('professionals:manage'))
    AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id()))
  )
  WITH CHECK (
    (SELECT private.has_permission('professionals:manage'))
    AND EXISTS (
      SELECT 1 FROM public.professionals AS pr
      JOIN public.services AS s ON s.clinic_id = pr.clinic_id
      WHERE pr.id = professional_id AND s.id = service_id
        AND pr.clinic_id = (SELECT private.current_user_clinic_id())
    )
  );
CREATE POLICY "Managers delete professional services"
  ON public.professional_services FOR DELETE TO authenticated
  USING (
    (SELECT private.has_permission('professionals:manage'))
    AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id()))
  );

CREATE POLICY "Clinic members read clinic schedules"
  ON public.clinic_schedules FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()));
CREATE POLICY "Schedule managers create clinic schedules"
  ON public.clinic_schedules FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));
CREATE POLICY "Schedule managers update clinic schedules"
  ON public.clinic_schedules FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));
CREATE POLICY "Schedule managers delete clinic schedules"
  ON public.clinic_schedules FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));

CREATE POLICY "Clinic members read professional schedules"
  ON public.professional_schedules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Schedule managers create professional schedules"
  ON public.professional_schedules FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Schedule managers update professional schedules"
  ON public.professional_schedules FOR UPDATE TO authenticated
  USING ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())))
  WITH CHECK ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Schedule managers delete professional schedules"
  ON public.professional_schedules FOR DELETE TO authenticated
  USING ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));

CREATE POLICY "Clinic members read professional time off"
  ON public.professional_time_off FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Schedule managers create professional time off"
  ON public.professional_time_off FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Schedule managers update professional time off"
  ON public.professional_time_off FOR UPDATE TO authenticated
  USING ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())))
  WITH CHECK ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Schedule managers delete professional time off"
  ON public.professional_time_off FOR DELETE TO authenticated
  USING ((SELECT private.has_permission('schedules:manage')) AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id())));

CREATE POLICY "Clinic members read blocked slots"
  ON public.blocked_slots FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()));
CREATE POLICY "Schedule managers create blocked slots"
  ON public.blocked_slots FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));
CREATE POLICY "Schedule managers update blocked slots"
  ON public.blocked_slots FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));
CREATE POLICY "Schedule managers delete blocked slots"
  ON public.blocked_slots FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('schedules:manage')));

CREATE POLICY "Authorized users read patients"
  ON public.patients FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('patients:read'))
    AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(id)))
  );
CREATE POLICY "Authorized users create patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND is_deleted = false
    AND (SELECT private.has_permission('patients:create'))
  );
CREATE POLICY "Authorized users update patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND ((SELECT private.has_permission('patients:update')) OR (SELECT private.has_permission('patients:delete')))
  )
  WITH CHECK (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND ((SELECT private.has_permission('patients:update')) OR (SELECT private.has_permission('patients:delete')))
  );

CREATE OR REPLACE FUNCTION private.guard_patient_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.is_deleted IS DISTINCT FROM OLD.is_deleted OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
     AND (SELECT auth.uid()) IS NOT NULL
     AND NOT (SELECT private.has_permission('patients:delete')) THEN
    RAISE EXCEPTION 'Permission denied to change patient deletion state' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_patient_soft_delete() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_patient_soft_delete
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION private.guard_patient_soft_delete();

CREATE OR REPLACE FUNCTION private.check_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.patients AS p
    WHERE p.id = NEW.patient_id AND p.clinic_id = NEW.clinic_id AND NOT p.is_deleted
  ) OR NOT EXISTS (
    SELECT 1 FROM public.professionals AS p
    WHERE p.id = NEW.professional_id AND p.clinic_id = NEW.clinic_id AND p.is_active
  ) OR NOT EXISTS (
    SELECT 1 FROM public.operatories AS o
    WHERE o.id = NEW.operatory_id AND o.clinic_id = NEW.clinic_id AND o.is_active
  ) OR NOT EXISTS (
    SELECT 1 FROM public.services AS s
    WHERE s.id = NEW.service_id AND s.clinic_id = NEW.clinic_id AND s.is_active
  ) THEN
    RAISE EXCEPTION 'Appointment relations must belong to the same active clinic' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('cancelled_by_patient', 'cancelled_by_clinic') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
     AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
     AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id
     AND NEW.operatory_id IS NOT DISTINCT FROM OLD.operatory_id
     AND OLD.status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic') THEN
    RETURN NEW;
  END IF;

  -- Serialize writes by resource so concurrent requests cannot book the same time twice.
  PERFORM 1 FROM public.professionals WHERE id = NEW.professional_id FOR UPDATE;
  PERFORM 1 FROM public.operatories WHERE id = NEW.operatory_id FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
    FROM public.clinics AS c
    JOIN public.clinic_schedules AS cs ON cs.clinic_id = c.id
    WHERE c.id = NEW.clinic_id
      AND cs.day_of_week = EXTRACT(DOW FROM NEW.start_time AT TIME ZONE c.timezone)::integer
      AND NOT cs.is_closed
      AND (NEW.start_time AT TIME ZONE c.timezone)::time >= cs.open_time
      AND (NEW.end_time AT TIME ZONE c.timezone)::time <= cs.close_time
      AND (cs.lunch_start IS NULL OR cs.lunch_end IS NULL
        OR (NEW.start_time AT TIME ZONE c.timezone)::time >= cs.lunch_end
        OR (NEW.end_time AT TIME ZONE c.timezone)::time <= cs.lunch_start)
      AND (NEW.start_time AT TIME ZONE c.timezone)::date = ((NEW.end_time - interval '1 microsecond') AT TIME ZONE c.timezone)::date
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.professionals AS p
    JOIN public.professional_schedules AS ps ON ps.professional_id = p.id
    JOIN public.clinics AS c ON c.id = p.clinic_id
    WHERE p.id = NEW.professional_id
      AND ps.day_of_week = EXTRACT(DOW FROM NEW.start_time AT TIME ZONE c.timezone)::integer
      AND ps.is_working
      AND (NEW.start_time AT TIME ZONE c.timezone)::time >= ps.start_time
      AND (NEW.end_time AT TIME ZONE c.timezone)::time <= ps.end_time
      AND (ps.break_start IS NULL OR ps.break_end IS NULL
        OR (NEW.start_time AT TIME ZONE c.timezone)::time >= ps.break_end
        OR (NEW.end_time AT TIME ZONE c.timezone)::time <= ps.break_start)
      AND (NEW.start_time AT TIME ZONE c.timezone)::date = ((NEW.end_time - interval '1 microsecond') AT TIME ZONE c.timezone)::date
  ) OR EXISTS (
    SELECT 1
    FROM public.professional_time_off AS t
    JOIN public.professionals AS p ON p.id = t.professional_id
    JOIN public.clinics AS c ON c.id = p.clinic_id
    WHERE t.professional_id = NEW.professional_id
      AND t.approved
      AND t.start_date <= ((NEW.end_time - interval '1 microsecond') AT TIME ZONE c.timezone)::date
      AND t.end_date >= (NEW.start_time AT TIME ZONE c.timezone)::date
  ) THEN
    RAISE EXCEPTION 'CONFLICT_SCHEDULE: La cita queda fuera del horario de la clínica o del profesional, o coincide con una ausencia.' USING ERRCODE = '23P01';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments AS a
    WHERE a.clinic_id = NEW.clinic_id
      AND a.professional_id = NEW.professional_id
      AND a.id IS DISTINCT FROM NEW.id
      AND a.status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic')
      AND tstzrange(a.start_time, a.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
  ) THEN
    RAISE EXCEPTION 'CONFLICT_PROFESSIONAL: El profesional ya tiene una cita asignada en ese rango horario.' USING ERRCODE = '23P01';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments AS a
    WHERE a.clinic_id = NEW.clinic_id
      AND a.operatory_id = NEW.operatory_id
      AND a.id IS DISTINCT FROM NEW.id
      AND a.status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic')
      AND tstzrange(a.start_time, a.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
  ) THEN
    RAISE EXCEPTION 'CONFLICT_OPERATORY: El consultorio/gabinete ya está ocupado en ese rango horario.' USING ERRCODE = '23P01';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_slots AS b
    WHERE b.clinic_id = NEW.clinic_id
      AND (b.professional_id IS NULL OR b.professional_id = NEW.professional_id)
      AND (b.operatory_id IS NULL OR b.operatory_id = NEW.operatory_id)
      AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange(NEW.start_time, NEW.end_time, '[)')
  ) THEN
    RAISE EXCEPTION 'CONFLICT_BLOCKED_SLOT: El horario seleccionado coincide con un bloqueo de agenda o festivo.' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.record_appointment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.appointment_status_history (
      appointment_id, previous_status, new_status, changed_by, reason
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      COALESCE((SELECT auth.uid()), NEW.updated_by),
      COALESCE(NEW.cancellation_reason, NEW.reschedule_reason, 'Cambio de estado del sistema')
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.check_appointment_overlap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_appointment_status_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_check_appointment_overlap ON public.appointments;
DROP TRIGGER IF EXISTS trg_record_appointment_status ON public.appointments;
DROP FUNCTION IF EXISTS public.check_appointment_overlap();
DROP FUNCTION IF EXISTS public.record_appointment_status_change();
CREATE TRIGGER trg_check_appointment_overlap
  BEFORE INSERT OR UPDATE OF start_time, end_time, professional_id, operatory_id, status
  ON public.appointments FOR EACH ROW EXECUTE FUNCTION private.check_appointment_overlap();
CREATE TRIGGER trg_record_appointment_status
  AFTER INSERT OR UPDATE OF status
  ON public.appointments FOR EACH ROW EXECUTE FUNCTION private.record_appointment_status_change();

CREATE OR REPLACE FUNCTION private.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old jsonb := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  v_new jsonb := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  v_row jsonb;
  v_changed_fields text[];
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN v_old ELSE v_new END;
  SELECT COALESCE(array_agg(k.key ORDER BY k.key), ARRAY[]::text[])
  INTO v_changed_fields
  FROM jsonb_object_keys(v_old || v_new) AS k(key)
  WHERE v_old -> k.key IS DISTINCT FROM v_new -> k.key;

  INSERT INTO public.audit_logs (clinic_id, user_id, user_role, action, entity_type, entity_id, new_values)
  VALUES (
    COALESCE(NULLIF(v_row ->> 'clinic_id', '')::uuid, (SELECT private.current_user_clinic_id())),
    (SELECT auth.uid()),
    (SELECT private.current_user_role_id()),
    TG_TABLE_NAME || '_' || TG_OP,
    TG_TABLE_NAME,
    COALESCE(v_row ->> 'id', v_row ->> 'patient_id', v_row ->> 'appointment_id'),
    jsonb_build_object('changed_fields', v_changed_fields)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.write_audit_log() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_professionals AFTER INSERT OR UPDATE OR DELETE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_schedules AFTER INSERT OR UPDATE OR DELETE ON public.clinic_schedules
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_blocked_slots AFTER INSERT OR UPDATE OR DELETE ON public.blocked_slots
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_templates AFTER INSERT OR UPDATE OR DELETE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();
CREATE TRIGGER audit_settings AFTER INSERT OR UPDATE OR DELETE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE POLICY "Authorized users read medical records"
  ON public.patient_medical_records FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('medical_records:read'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
    AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(patient_id)))
  );
CREATE POLICY "Authorized users create medical records"
  ON public.patient_medical_records FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.has_permission('medical_records:update'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users update medical records"
  ON public.patient_medical_records FOR UPDATE TO authenticated
  USING (
    (SELECT private.has_permission('medical_records:update'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  )
  WITH CHECK (
    (SELECT private.has_permission('medical_records:update'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );

CREATE POLICY "Authorized users read patient consents"
  ON public.patient_consents FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('patients:read'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users create patient consents"
  ON public.patient_consents FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.has_permission('patients:create'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );

CREATE POLICY "Authorized users read patient documents"
  ON public.patient_documents FOR SELECT TO authenticated
  USING (
    (SELECT private.has_permission('patients:documents_read'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users create patient documents"
  ON public.patient_documents FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.has_permission('patients:documents_manage'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users update patient documents"
  ON public.patient_documents FOR UPDATE TO authenticated
  USING (
    (SELECT private.has_permission('patients:documents_manage'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  )
  WITH CHECK (
    (SELECT private.has_permission('patients:documents_manage'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users delete patient documents"
  ON public.patient_documents FOR DELETE TO authenticated
  USING (
    (SELECT private.has_permission('patients:documents_manage'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );

CREATE POLICY "Authorized users read appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('appointments:read'))
    AND (
      (SELECT private.current_user_role_id()) <> 'professional'
      OR (SELECT private.is_assigned_professional(professional_id))
      OR (SELECT private.has_permission('appointments:manage_others'))
    )
  );
CREATE POLICY "Authorized users create appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('appointments:create'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()) AND p.is_deleted = false)
    AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id()) AND pr.is_active)
    AND EXISTS (SELECT 1 FROM public.operatories AS o WHERE o.id = operatory_id AND o.clinic_id = (SELECT private.current_user_clinic_id()) AND o.is_active)
    AND EXISTS (SELECT 1 FROM public.services AS s WHERE s.id = service_id AND s.clinic_id = (SELECT private.current_user_clinic_id()) AND s.is_active)
  );
CREATE POLICY "Authorized users update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('appointments:update'))
    AND (
      (SELECT private.current_user_role_id()) <> 'professional'
      OR (SELECT private.is_assigned_professional(professional_id))
      OR (SELECT private.has_permission('appointments:manage_others'))
    )
  )
  WITH CHECK (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('appointments:update'))
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id()))
    AND EXISTS (SELECT 1 FROM public.professionals AS pr WHERE pr.id = professional_id AND pr.clinic_id = (SELECT private.current_user_clinic_id()))
    AND EXISTS (SELECT 1 FROM public.operatories AS o WHERE o.id = operatory_id AND o.clinic_id = (SELECT private.current_user_clinic_id()))
    AND EXISTS (SELECT 1 FROM public.services AS s WHERE s.id = service_id AND s.clinic_id = (SELECT private.current_user_clinic_id()))
    AND (
      (SELECT private.current_user_role_id()) <> 'professional'
      OR (SELECT private.is_assigned_professional(professional_id))
      OR (SELECT private.has_permission('appointments:manage_others'))
    )
  );
CREATE POLICY "Authorized users delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('appointments:delete')));

CREATE POLICY "Clinic members read appointment history"
  ON public.appointment_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments AS a
    WHERE a.id = appointment_id
      AND a.clinic_id = (SELECT private.current_user_clinic_id())
      AND (SELECT private.has_permission('appointments:read'))
      AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.is_assigned_professional(a.professional_id)))
  ));

CREATE POLICY "Clinic members read WhatsApp contacts"
  ON public.whatsapp_contacts FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('whatsapp:read'))
    AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(patient_id)))
  );
CREATE POLICY "Clinic members read WhatsApp conversations"
  ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('whatsapp:read'))
    AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(patient_id)))
  );
CREATE POLICY "WhatsApp managers update conversations"
  ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('whatsapp:read'))
    AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(patient_id)))
  )
  WITH CHECK (
    clinic_id = (SELECT private.current_user_clinic_id())
    AND (SELECT private.has_permission('whatsapp:read'))
    AND EXISTS (SELECT 1 FROM public.whatsapp_contacts AS c WHERE c.id = contact_id AND c.clinic_id = (SELECT private.current_user_clinic_id()))
    AND (patient_id IS NULL OR EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id = patient_id AND p.clinic_id = (SELECT private.current_user_clinic_id())))
  );
CREATE POLICY "Clinic members read WhatsApp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations AS c
    WHERE c.id = conversation_id AND c.clinic_id = (SELECT private.current_user_clinic_id())
      AND (SELECT private.has_permission('whatsapp:read'))
  ));
CREATE POLICY "Clinic members read message templates"
  ON public.message_templates FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:read')));
CREATE POLICY "WhatsApp managers create message templates"
  ON public.message_templates FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "WhatsApp managers update message templates"
  ON public.message_templates FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "WhatsApp managers delete message templates"
  ON public.message_templates FOR DELETE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "WhatsApp managers read message campaigns"
  ON public.message_campaigns FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "WhatsApp managers create message campaigns"
  ON public.message_campaigns FOR INSERT TO authenticated
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "WhatsApp managers update message campaigns"
  ON public.message_campaigns FOR UPDATE TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')))
  WITH CHECK (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "Clinic members read message logs"
  ON public.message_logs FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('whatsapp:manage_templates')));
CREATE POLICY "Clinic admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (clinic_id = (SELECT private.current_user_clinic_id()) AND (SELECT private.has_permission('audit:read')));

-- Reminders, webhook payloads, configuration secrets, role assignments and writes to logs
-- remain server-only. The backend uses service_role and must authorize requests itself.
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT ON public.clinics, public.roles, public.permissions, public.role_permissions,
  public.profiles, public.operatories, public.services, public.professionals,
  public.professional_services, public.clinic_schedules, public.professional_schedules,
  public.professional_time_off, public.blocked_slots, public.patients,
  public.patient_medical_records, public.patient_consents, public.patient_documents,
  public.appointments, public.appointment_status_history, public.whatsapp_contacts,
  public.whatsapp_conversations, public.whatsapp_messages, public.message_templates,
  public.message_campaigns, public.message_logs, public.audit_logs
TO authenticated;

GRANT INSERT ON public.operatories, public.services, public.professionals,
  public.professional_services, public.clinic_schedules, public.professional_schedules,
  public.professional_time_off, public.blocked_slots, public.patients,
  public.patient_medical_records, public.patient_consents, public.patient_documents,
  public.appointments, public.message_templates, public.message_campaigns
TO authenticated;
GRANT UPDATE, DELETE ON public.operatories, public.services, public.professionals,
  public.professional_services, public.clinic_schedules, public.professional_schedules,
  public.professional_time_off, public.blocked_slots,
  public.patient_documents, public.appointments, public.message_templates,
  public.message_campaigns
TO authenticated;
GRANT UPDATE ON public.clinics, public.whatsapp_conversations TO authenticated;
GRANT UPDATE (blood_type, allergies, medical_conditions, current_medications, clinical_notes, habits, updated_at)
  ON public.patient_medical_records TO authenticated;
GRANT UPDATE (
  first_name, last_name, dni_nie, birth_date, gender, phone, email, address,
  postal_code, city, emergency_contact_name, emergency_contact_phone, notes,
  tags, acquisition_source, status, is_deleted, deleted_at, updated_at
) ON public.patients TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_clinic_role_active ON public.profiles (clinic_id, role_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_professionals_clinic_profile ON public.professionals (clinic_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_operatories_clinic ON public.operatories (clinic_id);
CREATE INDEX IF NOT EXISTS idx_services_clinic ON public.services (clinic_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_service ON public.professional_services (service_id, professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_schedules_professional ON public.professional_schedules (professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_time_off_professional_dates ON public.professional_time_off (professional_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients (clinic_id, id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON public.patients (clinic_id, created_at DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON public.patient_consents (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON public.patient_documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_patient ON public.appointments (clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_start ON public.appointments (clinic_id, start_time);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_clinic_range ON public.blocked_slots (clinic_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment ON public.appointment_status_history (appointment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment ON public.appointment_reminders (appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_clinic_patient ON public.whatsapp_contacts (clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_clinic ON public.whatsapp_conversations (clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_clinic ON public.message_templates (clinic_id);
CREATE INDEX IF NOT EXISTS idx_message_campaigns_clinic ON public.message_campaigns (clinic_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_clinic_created ON public.message_logs (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_created ON public.audit_logs (clinic_id, created_at DESC);

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- Keep public assets public, but all patient and messaging media private.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('clinic-public-assets', 'clinic-public-assets', true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('patient-documents', 'patient-documents', false, 20971520, ARRAY['application/pdf','image/png','image/jpeg','image/webp']),
  ('patient-avatars', 'patient-avatars', false, 5242880, ARRAY['image/png','image/jpeg','image/webp']),
  ('professional-avatars', 'professional-avatars', true, 5242880, ARRAY['image/png','image/jpeg','image/webp']),
  ('whatsapp-media', 'whatsapp-media', false, 20971520, ARRAY['application/pdf','image/png','image/jpeg','image/webp','audio/mpeg','audio/ogg','video/mp4']),
  ('internal-documents', 'internal-documents', false, 20971520, ARRAY['application/pdf','image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public can read clinic assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'clinic-public-assets');
CREATE POLICY "Authorized users manage clinic assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-public-assets' AND (SELECT private.has_permission('clinics:manage')));
CREATE POLICY "Authorized users update clinic assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-public-assets' AND (SELECT private.has_permission('clinics:manage')))
  WITH CHECK (bucket_id = 'clinic-public-assets' AND (SELECT private.has_permission('clinics:manage')));
CREATE POLICY "Authorized users delete clinic assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-public-assets' AND (SELECT private.has_permission('clinics:manage')));

CREATE POLICY "Public can read professional avatars"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'professional-avatars');
CREATE POLICY "Professional managers upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'professional-avatars'
    AND (SELECT private.has_permission('professionals:manage'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
  );
CREATE POLICY "Professional managers update avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'professional-avatars' AND (SELECT private.has_permission('professionals:manage')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text)
  WITH CHECK (bucket_id = 'professional-avatars' AND (SELECT private.has_permission('professionals:manage')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text);
CREATE POLICY "Professional managers delete avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'professional-avatars' AND (SELECT private.has_permission('professionals:manage')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text);

CREATE POLICY "Authorized users read patient documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (SELECT private.has_permission('patients:documents_read'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (
      SELECT 1 FROM public.patient_documents AS d
      JOIN public.patients AS p ON p.id = d.patient_id
      WHERE d.file_path = name AND p.clinic_id = (SELECT private.current_user_clinic_id())
    )
  );
CREATE POLICY "Authorized users upload patient documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (SELECT private.has_permission('patients:documents_manage'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (
      SELECT 1 FROM public.patients AS p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.clinic_id = (SELECT private.current_user_clinic_id())
        AND p.is_deleted = false
    )
  );
CREATE POLICY "Authorized users update patient documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (SELECT private.has_permission('patients:documents_manage'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (
      SELECT 1 FROM public.patient_documents AS d
      JOIN public.patients AS p ON p.id = d.patient_id
      WHERE d.file_path = name AND p.clinic_id = (SELECT private.current_user_clinic_id())
    )
  )
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND (SELECT private.has_permission('patients:documents_manage'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (
      SELECT 1 FROM public.patient_documents AS d
      JOIN public.patients AS p ON p.id = d.patient_id
      WHERE d.file_path = name AND p.clinic_id = (SELECT private.current_user_clinic_id())
    )
  );
CREATE POLICY "Authorized users delete patient documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'patient-documents'
    AND (SELECT private.has_permission('patients:documents_manage'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (
      SELECT 1 FROM public.patient_documents AS d
      JOIN public.patients AS p ON p.id = d.patient_id
      WHERE d.file_path = name AND p.clinic_id = (SELECT private.current_user_clinic_id())
    )
  );

CREATE POLICY "Authorized users read patient avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-avatars'
    AND (SELECT private.has_permission('patients:read'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id::text = (storage.foldername(name))[2] AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users upload patient avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'patient-avatars'
    AND (SELECT private.has_permission('patients:update'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id::text = (storage.foldername(name))[2] AND p.clinic_id = (SELECT private.current_user_clinic_id()))
  );
CREATE POLICY "Authorized users update patient avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-avatars' AND (SELECT private.has_permission('patients:update')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id::text = (storage.foldername(name))[2] AND p.clinic_id = (SELECT private.current_user_clinic_id())))
  WITH CHECK (bucket_id = 'patient-avatars' AND (SELECT private.has_permission('patients:update')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id::text = (storage.foldername(name))[2] AND p.clinic_id = (SELECT private.current_user_clinic_id())));
CREATE POLICY "Authorized users delete patient avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-avatars' AND (SELECT private.has_permission('patients:update')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.patients AS p WHERE p.id::text = (storage.foldername(name))[2] AND p.clinic_id = (SELECT private.current_user_clinic_id())));

CREATE POLICY "Authorized users read WhatsApp media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND (SELECT private.has_permission('whatsapp:read'))
    AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text
    AND EXISTS (SELECT 1 FROM public.whatsapp_conversations AS c WHERE c.id::text = (storage.foldername(name))[2] AND c.clinic_id = (SELECT private.current_user_clinic_id()) AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(c.patient_id))))
  );
CREATE POLICY "Authorized users upload WhatsApp media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media' AND (SELECT private.has_permission('whatsapp:send')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.whatsapp_conversations AS c WHERE c.id::text = (storage.foldername(name))[2] AND c.clinic_id = (SELECT private.current_user_clinic_id()) AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(c.patient_id)))));
CREATE POLICY "Authorized users update WhatsApp media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND (SELECT private.has_permission('whatsapp:send')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.whatsapp_conversations AS c WHERE c.id::text = (storage.foldername(name))[2] AND c.clinic_id = (SELECT private.current_user_clinic_id()) AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(c.patient_id)))))
  WITH CHECK (bucket_id = 'whatsapp-media' AND (SELECT private.has_permission('whatsapp:send')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.whatsapp_conversations AS c WHERE c.id::text = (storage.foldername(name))[2] AND c.clinic_id = (SELECT private.current_user_clinic_id()) AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(c.patient_id)))));
CREATE POLICY "Authorized users delete WhatsApp media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND (SELECT private.has_permission('whatsapp:send')) AND (storage.foldername(name))[1] = (SELECT private.current_user_clinic_id())::text AND EXISTS (SELECT 1 FROM public.whatsapp_conversations AS c WHERE c.id::text = (storage.foldername(name))[2] AND c.clinic_id = (SELECT private.current_user_clinic_id()) AND ((SELECT private.current_user_role_id()) <> 'professional' OR (SELECT private.patient_assigned_to_user(c.patient_id)))));

CREATE POLICY "Clinic users read internal documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'internal-documents' AND (SELECT private.current_user_clinic_id())::text = (storage.foldername(name))[1] AND ((SELECT private.has_permission('documents:manage')) OR (SELECT private.has_permission('settings:read'))));
CREATE POLICY "Managers upload internal documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'internal-documents' AND (SELECT private.current_user_clinic_id())::text = (storage.foldername(name))[1] AND (SELECT private.has_permission('documents:manage')));
CREATE POLICY "Managers update internal documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'internal-documents' AND (SELECT private.current_user_clinic_id())::text = (storage.foldername(name))[1] AND (SELECT private.has_permission('documents:manage')))
  WITH CHECK (bucket_id = 'internal-documents' AND (SELECT private.current_user_clinic_id())::text = (storage.foldername(name))[1] AND (SELECT private.has_permission('documents:manage')));
CREATE POLICY "Managers delete internal documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'internal-documents' AND (SELECT private.current_user_clinic_id())::text = (storage.foldername(name))[1] AND (SELECT private.has_permission('documents:manage')));
