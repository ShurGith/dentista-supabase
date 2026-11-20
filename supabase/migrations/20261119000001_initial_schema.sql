-- ====================================================================
-- CLÍNICA DENTAL EUGENIA - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ====================================================================
-- MIGRACIÓN 001: Estructura inicial del sistema de citas y pacientes
-- RESTRICCIÓN DE ALCANCE: CERO CAMPOS/TABLAS ECONÓMICAS O DE PAGO.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (ENUMS)
-- --------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE appointment_status_enum AS ENUM (
    'pending',               -- Pendiente de confirmación
    'confirmed',             -- Confirmada por paciente o clínica
    'in_waiting_room',       -- Paciente en sala de espera
    'in_progress',           -- En gabinete / consulta
    'completed',             -- Cita completada
    'cancelled_by_patient',  -- Cancelada por el paciente
    'cancelled_by_clinic',   -- Cancelada por la clínica
    'no_show'                -- Paciente no compareció / ausente
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'superadmin',
    'admin',
    'professional',
    'receptionist'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status_enum AS ENUM (
    'pending',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_direction_enum AS ENUM (
    'inbound',
    'outbound'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_message_status_enum AS ENUM (
    'queued',
    'sent',
    'delivered',
    'read',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status_enum AS ENUM (
    'open',
    'pending',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_type_enum AS ENUM (
    'rgpd',
    'whatsapp_communication',
    'clinical_treatment',
    'reminders'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------
-- 2. TABLAS BASE Y CONFIGURACIÓN DE CLÍNICA
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL DEFAULT 'Clínica Dental Eugenia',
  legal_name VARCHAR(255) NOT NULL DEFAULT 'Clínica Dental Eugenia S.L.P.',
  cif_nif VARCHAR(50) NOT NULL DEFAULT 'B12345678',
  phone VARCHAR(50) NOT NULL DEFAULT '+34 912 345 678',
  emergency_phone VARCHAR(50) DEFAULT '+34 600 112 233',
  email VARCHAR(255) NOT NULL DEFAULT 'contacto@clinicadentaleugenia.es',
  address VARCHAR(255) NOT NULL DEFAULT 'Calle Mayor 45, Planta 1',
  postal_code VARCHAR(20) NOT NULL DEFAULT '28013',
  city VARCHAR(100) NOT NULL DEFAULT 'Madrid',
  province VARCHAR(100) NOT NULL DEFAULT 'Madrid',
  country VARCHAR(50) NOT NULL DEFAULT 'España',
  website_url VARCHAR(255) DEFAULT 'https://clinicadentaleugenia.es',
  google_maps_url TEXT DEFAULT 'https://maps.google.com/?q=Clinica+Dental+Eugenia',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Madrid',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 3. GESTIÓN DE ROLES, PERMISOS Y PERFILES DE USUARIOS
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id VARCHAR(100) PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id VARCHAR(50) REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(100) REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE RESTRICT,
  role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) DEFAULT 'receptionist',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 4. CONSULTORIOS / SALAS (GABINETES)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.operatories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- Ej: "Gabinete 1", "Gabinete Quirúrgico"
  description TEXT,
  color VARCHAR(20) DEFAULT '#0d9488',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 5. SERVICIOS DENTALES (SIN PRECIOS NI CAMPOS ECONÓMICOS)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL, -- Odontología General, Ortodoncia, Implantología, Estética, etc.
  description TEXT NOT NULL,
  benefits TEXT, -- Viñetas de beneficios clínicos
  duration_minutes INT NOT NULL DEFAULT 45,
  color VARCHAR(20) NOT NULL DEFAULT '#14b8a6',
  icon VARCHAR(50) DEFAULT 'Sparkles',
  requires_consultation_first BOOLEAN NOT NULL DEFAULT false,
  is_public_bookable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 6. PROFESIONALES (DENTISTAS Y ESPECIALISTAS)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  collegiated_number VARCHAR(50), -- Número de colegiado odontológico
  specialty VARCHAR(150) NOT NULL,
  biography TEXT,
  languages VARCHAR(100) DEFAULT 'Español, Inglés',
  color VARCHAR(20) NOT NULL DEFAULT '#0284c7',
  photo_url TEXT,
  default_operatory_id UUID REFERENCES public.operatories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.professional_services (
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  custom_duration_minutes INT,
  PRIMARY KEY (professional_id, service_id)
);

-- --------------------------------------------------------------------
-- 7. HORARIOS Y GESTIÓN DE DISPONIBILIDAD
-- --------------------------------------------------------------------

-- Horario general de la clínica
CREATE TABLE IF NOT EXISTS public.clinic_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes... 6=Sábado
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  lunch_start TIME,
  lunch_end TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_clinic_times CHECK (open_time < close_time),
  UNIQUE (clinic_id, day_of_week)
);

-- Horario de cada profesional
CREATE TABLE IF NOT EXISTS public.professional_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  is_working BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_prof_times CHECK (start_time < end_time),
  UNIQUE (professional_id, day_of_week)
);

-- Vacaciones, bajas y ausencias de profesionales
CREATE TABLE IF NOT EXISTS public.professional_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL, -- Vacaciones, Asuntos propios, Baja médica, Congreso
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_time_off_dates CHECK (start_date <= end_date)
);

-- Bloqueos de agenda (festivos de la clínica, mantenimiento, pausas de gabinete)
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  operatory_id UUID REFERENCES public.operatories(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason VARCHAR(255) NOT NULL, -- Festivo local, Mantenimiento sillón, Reunión clínica
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_blocked_times CHECK (start_time < end_time)
);

-- --------------------------------------------------------------------
-- 8. PACIENTES Y EXPEDIENTES (CUMPLIMIENTO RGPD)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  dni_nie VARCHAR(30),
  birth_date DATE,
  gender VARCHAR(20),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  postal_code VARCHAR(20),
  city VARCHAR(100) DEFAULT 'Madrid',
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(50),
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  acquisition_source VARCHAR(100) DEFAULT 'Web',
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, archived
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historial médico/clínico estrictamente médico (alergias, patologías, antecedentes)
CREATE TABLE IF NOT EXISTS public.patient_medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE,
  blood_type VARCHAR(10),
  allergies TEXT, -- Alergia a penicilina, látex, anestésicos locales, etc.
  medical_conditions TEXT, -- Diabetes, hipertensión, cardiopatías, anticoagulados
  current_medications TEXT,
  clinical_notes TEXT,
  habits TEXT, -- Tabaquismo, bruxismo, etc.
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consentimientos informados y RGPD
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_type consent_type_enum NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  ip_address VARCHAR(45),
  user_agent TEXT,
  signature_reference TEXT,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Documentos clínicos (radiografías, ortopantomografías, consentimientos firmados en PDF)
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- Radiografía, Consentimiento, Informe, Foto Intraoral
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 9. CITAS DENTALES Y CONTROL DE SOLAPAMIENTOS
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  operatory_id UUID NOT NULL REFERENCES public.operatories(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  status appointment_status_enum NOT NULL DEFAULT 'pending',
  patient_notes TEXT,
  clinical_notes TEXT,
  cancellation_reason TEXT,
  reschedule_reason TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_appointment_times CHECK (start_time < end_time)
);

-- Histórico de cambios de estado para trazabilidad y auditoría médica
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  previous_status appointment_status_enum,
  new_status appointment_status_enum NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recordatorios automáticos programados
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL, -- 'confirmation', '24h_before', '2h_before', 'post_treatment'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status reminder_status_enum NOT NULL DEFAULT 'pending',
  wawp_message_id VARCHAR(100),
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 10. WHATSAPP & INTEGRACIÓN WAWP (MENSAJERÍA, BANDEJA, PLANTILLAS)
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(150),
  opt_in_confirmed BOOLEAN NOT NULL DEFAULT true,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  status conversation_status_enum NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  internal_notes TEXT,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction whatsapp_direction_enum NOT NULL,
  sender_phone VARCHAR(50) NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, template, image, document, location
  content TEXT NOT NULL,
  media_url TEXT,
  wawp_message_id VARCHAR(150),
  status whatsapp_message_status_enum NOT NULL DEFAULT 'sent',
  error_message TEXT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL UNIQUE, -- 'cita_confirmada', 'recordatorio_24h', 'recordatorio_2h', 'cita_reprogramada', 'cita_cancelada', 'seguimiento_post'
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'citas',
  body_text TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[], -- {{nombre}}, {{fecha}}, {{hora}}, {{profesional}}, {{servicio}}, {{enlace_confirmar}}, {{enlace_cancelar}}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  template_id UUID REFERENCES public.message_templates(id),
  body_text TEXT NOT NULL,
  target_filter JSONB DEFAULT '{}'::JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL,
  message_content TEXT NOT NULL,
  template_code VARCHAR(100),
  direction VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'wawp',
  provider_id VARCHAR(150),
  status VARCHAR(50) NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL DEFAULT 'wawp',
  event_type VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(150) UNIQUE,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 11. CONFIGURACIÓN GENERAL Y AUDITORÍA
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE UNIQUE,
  
  -- Identidad visual
  primary_color VARCHAR(20) NOT NULL DEFAULT '#0d9488', -- Teal médico
  secondary_color VARCHAR(20) NOT NULL DEFAULT '#0f766e',
  accent_color VARCHAR(20) NOT NULL DEFAULT '#38bdf8',
  logo_url TEXT,
  hero_title VARCHAR(255) DEFAULT 'Cuidado dental integral para toda la familia',
  hero_subtitle TEXT DEFAULT 'En Clínica Dental Eugenia combinamos tecnología de vanguardia y un trato humano y cercano para cuidar de tu sonrisa.',
  
  -- Reglas de reserva
  min_notice_hours INT NOT NULL DEFAULT 2,     -- Margen mínimo antes de la cita para reservar
  max_advance_days INT NOT NULL DEFAULT 60,   -- Máxima antelación permitida
  buffer_between_appointments_minutes INT NOT NULL DEFAULT 10, -- Limpieza/desinfección gabinete
  default_calendar_slot_minutes INT NOT NULL DEFAULT 15,
  allow_public_booking BOOLEAN NOT NULL DEFAULT true,
  require_phone_verification BOOLEAN NOT NULL DEFAULT false,
  
  -- Configuración de Wawp
  wawp_enabled BOOLEAN NOT NULL DEFAULT true,
  wawp_instance_id VARCHAR(100),
  wawp_api_token TEXT,
  wawp_phone_number VARCHAR(50) DEFAULT '+34600112233',
  wawp_webhook_secret VARCHAR(100),
  wawp_sandbox_mode BOOLEAN NOT NULL DEFAULT true,
  
  -- Configuración de Recordatorios
  reminder_24h_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_2h_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_post_enabled BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL, -- 'APPOINTMENT_CREATE', 'PATIENT_RGPD_ACCESS', 'SCHEDULE_UPDATE'
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  previous_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------------
-- 12. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_dni ON public.patients(dni_nie);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_end ON public.appointments(end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON public.appointments(professional_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_operatory ON public.appointments(operatory_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msgs_conv ON public.whatsapp_messages(conversation_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- --------------------------------------------------------------------
-- 13. FUNCIÓN Y TRIGGER: PREVENCIÓN DE SOLAPAMIENTOS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict_count INT;
BEGIN
  -- Si la cita está cancelada, no genera solapamiento
  IF NEW.status IN ('cancelled_by_patient', 'cancelled_by_clinic') THEN
    RETURN NEW;
  END IF;

  -- 1. Verificar conflicto de profesional (el profesional no puede estar en dos citas a la vez)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.appointments
  WHERE professional_id = NEW.professional_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic')
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_PROFESSIONAL: El profesional ya tiene una cita asignada en ese rango horario.'
      USING ERRCODE = '23P01';
  END IF;

  -- 2. Verificar conflicto de consultorio/gabinete (dos profesionales no pueden usar el mismo gabinete a la vez)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.appointments
  WHERE operatory_id = NEW.operatory_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic')
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_OPERATORY: El consultorio/gabinete ya está ocupado en ese rango horario.'
      USING ERRCODE = '23P01';
  END IF;

  -- 3. Verificar bloqueos de agenda (vacaciones, festivos, mantenimiento)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.blocked_slots
  WHERE (
      (professional_id IS NULL AND operatory_id IS NULL) OR -- Cierre total clínica
      (professional_id = NEW.professional_id) OR
      (operatory_id = NEW.operatory_id)
    )
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'CONFLICT_BLOCKED_SLOT: El horario seleccionado coincide con un bloqueo de agenda o festivo.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_appointment_overlap ON public.appointments;
CREATE TRIGGER trg_check_appointment_overlap
  BEFORE INSERT OR UPDATE OF start_time, end_time, professional_id, operatory_id, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_overlap();

-- --------------------------------------------------------------------
-- 14. FUNCIÓN Y TRIGGER: HISTORIAL DE ESTADOS DE CITAS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.appointment_status_history (
      appointment_id,
      previous_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      NEW.updated_by,
      COALESCE(NEW.cancellation_reason, NEW.reschedule_reason, 'Cambio de estado del sistema')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_record_appointment_status ON public.appointments;
CREATE TRIGGER trg_record_appointment_status
  AFTER INSERT OR UPDATE OF status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.record_appointment_status_change();

-- --------------------------------------------------------------------
-- 15. HABILITAR REALTIME EN TABLAS CLAVE
-- --------------------------------------------------------------------

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_slots;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------
-- 16. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para la Web Landing y motor de reservas
CREATE POLICY "Public read active clinics" ON public.clinics FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active professionals" ON public.professionals FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active operatories" ON public.operatories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read clinic schedules" ON public.clinic_schedules FOR SELECT USING (true);
CREATE POLICY "Public read professional schedules" ON public.professional_schedules FOR SELECT USING (true);
CREATE POLICY "Public read blocked slots" ON public.blocked_slots FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);

-- Pacientes y reservas anónimas (reserva pública de cita)
CREATE POLICY "Public create patients" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public create appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public create consent" ON public.patient_consents FOR INSERT WITH CHECK (true);

-- Acceso completo para usuarios autenticados del equipo de la clínica
CREATE POLICY "Authenticated staff full access clinics" ON public.clinics FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access services" ON public.services FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access professionals" ON public.professionals FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access operatories" ON public.operatories FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access clinic_schedules" ON public.clinic_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access professional_schedules" ON public.professional_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access blocked_slots" ON public.blocked_slots FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access patients" ON public.patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access medical_records" ON public.patient_medical_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access appointments" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access whatsapp_conv" ON public.whatsapp_conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access whatsapp_msg" ON public.whatsapp_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access settings" ON public.settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated staff full access audit" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- Permisos al rol anon y authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.clinics, public.services, public.professionals, public.operatories, public.clinic_schedules, public.professional_schedules, public.blocked_slots, public.settings TO anon;
GRANT INSERT ON public.patients, public.appointments, public.patient_consents TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

