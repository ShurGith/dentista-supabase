-- ====================================================================
-- CLÍNICA DENTAL EUGENIA - MIGRACIÓN 002: DATOS INICIALES (SEED)
-- ====================================================================
-- REGLA DE ORO: SIN PRECIOS, SIN PAGOS, SIN NINGÚN DATO FINANCIERO
-- ====================================================================

-- 1. Roles del sistema
INSERT INTO public.roles (id, name, description) VALUES
  ('superadmin', 'Super Administrador', 'Acceso total y configuración global del sistema y clínicas'),
  ('admin', 'Administrador / Dirección', 'Gestión integral de clínica, personal, agenda, pacientes y WhatsApp'),
  ('professional', 'Dentista / Odontólogo', 'Acceso a su agenda propia, pacientes asignados y notas clínicas'),
  ('receptionist', 'Recepción y Atención al Paciente', 'Gestión de agenda, citas, altas de pacientes y chat de WhatsApp')
ON CONFLICT (id) DO NOTHING;

-- 2. Permisos del sistema
INSERT INTO public.permissions (id, module, action, description) VALUES
  ('appointments:read', 'appointments', 'read', 'Ver agenda y citas'),
  ('appointments:create', 'appointments', 'create', 'Crear nuevas citas'),
  ('appointments:update', 'appointments', 'update', 'Modificar y mover citas'),
  ('appointments:cancel', 'appointments', 'cancel', 'Cancelar citas'),
  ('patients:read', 'patients', 'read', 'Ver listado y fichas de pacientes'),
  ('patients:create', 'patients', 'create', 'Dar de alta nuevos pacientes'),
  ('patients:update', 'patients', 'update', 'Editar datos de pacientes'),
  ('patients:delete', 'patients', 'delete', 'Anonimizar o eliminar pacientes (RGPD)'),
  ('medical_records:read', 'medical_records', 'read', 'Consultar historial médico dental'),
  ('medical_records:update', 'medical_records', 'update', 'Añadir notas clínicas y alergias'),
  ('whatsapp:read', 'whatsapp', 'read', 'Ver conversaciones de WhatsApp'),
  ('whatsapp:send', 'whatsapp', 'send', 'Enviar mensajes y plantillas Wawp'),
  ('schedules:manage', 'schedules', 'manage', 'Configurar horarios, vacaciones y bloqueos'),
  ('settings:manage', 'settings', 'manage', 'Configurar clínica, identidad y Wawp')
ON CONFLICT (id) DO NOTHING;

-- Asignar permisos a roles
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('superadmin', 'appointments:read'), ('superadmin', 'appointments:create'), ('superadmin', 'appointments:update'), ('superadmin', 'appointments:cancel'),
  ('superadmin', 'patients:read'), ('superadmin', 'patients:create'), ('superadmin', 'patients:update'), ('superadmin', 'patients:delete'),
  ('superadmin', 'medical_records:read'), ('superadmin', 'medical_records:update'),
  ('superadmin', 'whatsapp:read'), ('superadmin', 'whatsapp:send'),
  ('superadmin', 'schedules:manage'), ('superadmin', 'settings:manage'),
  
  ('admin', 'appointments:read'), ('admin', 'appointments:create'), ('admin', 'appointments:update'), ('admin', 'appointments:cancel'),
  ('admin', 'patients:read'), ('admin', 'patients:create'), ('admin', 'patients:update'),
  ('admin', 'medical_records:read'),
  ('admin', 'whatsapp:read'), ('admin', 'whatsapp:send'),
  ('admin', 'schedules:manage'), ('admin', 'settings:manage'),

  ('professional', 'appointments:read'), ('professional', 'appointments:update'),
  ('professional', 'patients:read'),
  ('professional', 'medical_records:read'), ('professional', 'medical_records:update'),
  ('professional', 'whatsapp:read'), ('professional', 'whatsapp:send'),

  ('receptionist', 'appointments:read'), ('receptionist', 'appointments:create'), ('receptionist', 'appointments:update'), ('receptionist', 'appointments:cancel'),
  ('receptionist', 'patients:read'), ('receptionist', 'patients:create'), ('receptionist', 'patients:update'),
  ('receptionist', 'whatsapp:read'), ('receptionist', 'whatsapp:send')
ON CONFLICT DO NOTHING;

-- 3. Clínica Dental Eugenia (ID fijo para facilitar seeds vinculados)
DO $$
DECLARE
  v_clinic_id UUID := 'e1111111-1111-1111-1111-111111111111'::uuid;
  v_gab1_id UUID := 'a1111111-1111-1111-1111-111111111111'::uuid;
  v_gab2_id UUID := 'a2222222-2222-2222-2222-222222222222'::uuid;
  v_gab3_id UUID := 'a3333333-3333-3333-3333-333333333333'::uuid;

  v_srv_diag UUID := 'b1111111-1111-1111-1111-111111111111'::uuid;
  v_srv_limp UUID := 'b2222222-2222-2222-2222-222222222222'::uuid;
  v_srv_emp  UUID := 'b3333333-3333-3333-3333-333333333333'::uuid;
  v_srv_orto UUID := 'b4444444-4444-4444-4444-444444444444'::uuid;
  v_srv_impl UUID := 'b5555555-5555-5555-5555-555555555555'::uuid;
  v_srv_endo UUID := 'b6666666-6666-6666-6666-666666666666'::uuid;
  v_srv_pedia UUID := 'b7777777-7777-7777-7777-777777777777'::uuid;
  v_srv_estet UUID := 'b8888888-8888-8888-8888-888888888888'::uuid;
  v_srv_urg  UUID := 'b9999999-9999-9999-9999-999999999999'::uuid;

  v_doc_eugenia UUID := 'c1111111-1111-1111-1111-111111111111'::uuid;
  v_doc_carlos  UUID := 'c2222222-2222-2222-2222-222222222222'::uuid;
  v_doc_sofia   UUID := 'c3333333-3333-3333-3333-333333333333'::uuid;
  v_doc_alberto UUID := 'c4444444-4444-4444-4444-444444444444'::uuid;

  v_pat_1 UUID := 'd1111111-1111-1111-1111-111111111111'::uuid;
  v_pat_2 UUID := 'd2222222-2222-2222-2222-222222222222'::uuid;
  v_pat_3 UUID := 'd3333333-3333-3333-3333-333333333333'::uuid;
  v_pat_4 UUID := 'd4444444-4444-4444-4444-444444444444'::uuid;

  v_conv_1 UUID := 'f1111111-1111-1111-1111-111111111111'::uuid;
  v_contact_1 UUID := 'f2222222-2222-2222-2222-222222222222'::uuid;
BEGIN

  -- Insertar o actualizar la Clínica
  INSERT INTO public.clinics (
    id, name, legal_name, cif_nif, phone, emergency_phone, email,
    address, postal_code, city, province, country, website_url, timezone
  ) VALUES (
    v_clinic_id, 'Clínica Dental Eugenia', 'Clínica Odontológica Eugenia S.L.P.',
    'B-87654321', '+34 915 223 344', '+34 600 112 233', 'info@clinicadentaleugenia.es',
    'Calle Mayor 45, Planta 1', '28013', 'Madrid', 'Madrid', 'España',
    'https://clinicadentaleugenia.es', 'Europe/Madrid'
  ) ON CONFLICT (id) DO NOTHING;

  -- Insertar Configuración y Ajustes de la Clínica
  INSERT INTO public.settings (
    clinic_id, primary_color, secondary_color, accent_color,
    hero_title, hero_subtitle,
    min_notice_hours, max_advance_days, buffer_between_appointments_minutes,
    default_calendar_slot_minutes, allow_public_booking,
    wawp_enabled, wawp_instance_id, wawp_phone_number, wawp_sandbox_mode,
    reminder_24h_enabled, reminder_2h_enabled, reminder_post_enabled
  ) VALUES (
    v_clinic_id, '#0d9488', '#0f766e', '#0284c7',
    'Cuidado dental integral para toda la familia',
    'En Clínica Dental Eugenia aunamos experiencia médica, cercanía humana y tecnología de vanguardia para cuidar de tu salud bucodental en pleno centro de Madrid.',
    2, 60, 10, 15, true,
    true, 'eugenia_wawp_inst_01', '+34600112233', true,
    true, true, true
  ) ON CONFLICT (clinic_id) DO NOTHING;

  -- 4. Consultorios / Gabinetes
  INSERT INTO public.operatories (id, clinic_id, name, description, color) VALUES
    (v_gab1_id, v_clinic_id, 'Gabinete 1 - General y Diagnóstico', 'Equipado con escáner intraoral 3D y radiografía digital', '#0d9488'),
    (v_gab2_id, v_clinic_id, 'Gabinete 2 - Ortodoncia y Estética', 'Diseñado para tratamientos estéticos, alineadores y revisiones', '#0284c7'),
    (v_gab3_id, v_clinic_id, 'Gabinete 3 - Quirófano e Implantes', 'Acondicionado para cirugía guiada, implantología y microcirugía', '#6366f1')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Servicios Odontológicos (COMPLETAMENTE LIBRES DE PRECIOS O TARIFAS)
  INSERT INTO public.services (
    id, clinic_id, name, slug, category, description, benefits, duration_minutes, color, icon, sort_order
  ) VALUES
    (v_srv_diag, v_clinic_id, 'Primera Visita y Diagnóstico Integral', 'diagnostico-integral',
     'Diagnóstico', 'Evaluación bucodental completa con exploración clínica y radiografía digital sin compromiso.',
     'Diagnóstico certero; Plan de tratamiento personalizado; Detección precoz de patologías', 30, '#0d9488', 'Stethoscope', 1),

    (v_srv_limp, v_clinic_id, 'Limpieza Dental y Profilaxis Avanzada', 'limpieza-dental',
     'Prevención', 'Eliminación minuciosa de sarro, placa bacteriana y manchas con tecnología de ultrasonidos y pulido.',
     'Encías sanas y sin sangrado; Aliento fresco duradero; Prevención de caries y periodontitis', 45, '#14b8a6', 'Sparkles', 2),

    (v_srv_emp, v_clinic_id, 'Empaste Dental y Reconstrucción', 'empastes-reconstruccion',
     'Odontología Conservadora', 'Tratamiento de la caries y restauración estética con composite de alta resistencia mimético con el color dental.',
     'Restaura la anatomía natural del diente; Materiales biocompatibles libres de metales; Sin molestias', 45, '#0ea5e9', 'ShieldCheck', 3),

    (v_srv_orto, v_clinic_id, 'Ortodoncia Invisible y Brackets', 'ortodoncia',
     'Ortodoncia', 'Corrección de la posición dental y oclusión mediante alineadores transparentes o brackets de última generación.',
     'Sonrisa armónica y funcional; Mejora la masticación y respiración; Tratamientos discretos y cómodos', 30, '#6366f1', 'Smile', 4),

    (v_srv_impl, v_clinic_id, 'Implantes Dentales y Cirugía Oral', 'implantes-cirugia',
     'Implantología', 'Reposición de piezas ausentes mediante raíces de titanio biocompatible y coronas de circonio de máxima naturalidad.',
     'Recupera la función masticatoria al 100%; Estética idéntica al diente natural; Cirugía mínimamente invasiva', 60, '#8b5cf6', 'Zap', 5),

    (v_srv_endo, v_clinic_id, 'Endodoncia y Tratamiento de Conductos', 'endodoncia',
     'Odontología Conservadora', 'Salvamento de piezas dentales dañadas en el nervio mediante instrumentación rotatoria y sellado tridimensional.',
     'Alivia el dolor dental agudo; Evita la extracción del diente; Procedimiento guiado con anestesia indolora', 60, '#ec4899', 'Activity', 6),

    (v_srv_pedia, v_clinic_id, 'Odontopediatría (Atención Infantil)', 'odontopediatria',
     'Cuidado Infantil', 'Atención odontológica cálida y lúdica adaptada a niños desde el primer año de vida.',
     'Ambiente amigable sin miedo al dentista; Guía de higiene y prevención temprana; Control de crecimiento dental', 30, '#f59e0b', 'Heart', 7),

    (v_srv_estet, v_clinic_id, 'Estética Dental y Blanqueamiento', 'estetica-blanqueamiento',
     'Estética Dental', 'Diseño de sonrisa mediante carillas de porcelana y blanqueamiento dental fotoactivado en clínica.',
     'Dientes más blancos y luminosos; Rejuvenecimiento de la sonrisa; Resultados visibles desde la primera sesión', 60, '#10b981', 'Sun', 8),

    (v_srv_urg, v_clinic_id, 'Urgencia Odontológica', 'urgencia-dental',
     'Urgencias', 'Atención prioritaria e inmediata ante dolor agudo, fracturas dentales, infecciones o traumatismos.',
     'Atención rápida en el mismo día; Alivio inmediato del dolor; Diagnóstico y tratamiento de urgencia', 30, '#ef4444', 'AlertCircle', 9)
  ON CONFLICT (id) DO NOTHING;

  -- 6. Profesionales / Odontólogos
  INSERT INTO public.professionals (
    id, clinic_id, first_name, last_name, collegiated_number, specialty,
    biography, languages, color, default_operatory_id, sort_order
  ) VALUES
    (v_doc_eugenia, v_clinic_id, 'Dra. Eugenia', 'Martínez de la Torre', '28004521',
     'Directora Médica / Cirugía Oral e Implantología',
     'Doctora en Odontología por la Universidad Complutense con más de 18 años de experiencia en cirugía guiada y rehabilitación oral avanzada.',
     'Español, Inglés, Francés', '#0d9488', v_gab3_id, 1),

    (v_doc_carlos, v_clinic_id, 'Dr. Carlos', 'Vega Menéndez', '28006789',
     'Ortodoncia y Ortopedia Dentofacial',
     'Máster de excelencia en Ortodoncia Invisible (Invisalign Diamond Provider). Apasionado de la armonía facial y la función masticatoria.',
     'Español, Inglés', '#0284c7', v_gab2_id, 2),

    (v_doc_sofia, v_clinic_id, 'Dra. Sofía', 'Navarro Gil', '28008123',
     'Odontopediatría y Estética Dental',
     'Especialista en odontología mínimamente invasiva y manejo conductual pediátrico. Experta en conseguir que los más pequeños amen venir a la clínica.',
     'Español, Catalán, Inglés', '#ec4899', v_gab1_id, 3),

    (v_doc_alberto, v_clinic_id, 'Dr. Alberto', 'Sanz Barroso', '28005342',
     'Endodoncia Microscópica y Odontología Restauradora',
     'Especialista en conservación dental compleja mediante microscopio operatorio y técnicas de sellado termoplástico.',
     'Español, Alemán', '#6366f1', v_gab1_id, 4)
  ON CONFLICT (id) DO NOTHING;

  -- Relación Profesional - Servicios
  INSERT INTO public.professional_services (professional_id, service_id) VALUES
    -- Dra. Eugenia: Diagnóstico, Implantes, Cirugía, Urgencias
    (v_doc_eugenia, v_srv_diag), (v_doc_eugenia, v_srv_impl), (v_doc_eugenia, v_srv_urg),
    -- Dr. Carlos: Ortodoncia, Diagnóstico, Urgencias
    (v_doc_carlos, v_srv_orto), (v_doc_carlos, v_srv_diag), (v_doc_carlos, v_srv_urg),
    -- Dra. Sofía: Limpiezas, Empastes, Odontopediatría, Estética, Urgencias
    (v_doc_sofia, v_srv_diag), (v_doc_sofia, v_srv_limp), (v_doc_sofia, v_srv_emp),
    (v_doc_sofia, v_srv_pedia), (v_doc_sofia, v_srv_estet), (v_doc_sofia, v_srv_urg),
    -- Dr. Alberto: Endodoncia, Empastes, Limpiezas, Diagnóstico, Urgencias
    (v_doc_alberto, v_srv_diag), (v_doc_alberto, v_srv_endo), (v_doc_alberto, v_srv_emp),
    (v_doc_alberto, v_srv_limp), (v_doc_alberto, v_srv_urg)
  ON CONFLICT DO NOTHING;

  -- 7. Horario General de la Clínica (Lunes a Sábado)
  -- Lunes a Viernes: 09:00 a 14:00 y 16:00 a 20:00. Sábado: 09:00 a 14:00. Domingo: Cerrado.
  INSERT INTO public.clinic_schedules (clinic_id, day_of_week, open_time, close_time, lunch_start, lunch_end, is_closed) VALUES
    (v_clinic_id, 1, '09:00', '20:00', '14:00', '16:00', false), -- Lunes
    (v_clinic_id, 2, '09:00', '20:00', '14:00', '16:00', false), -- Martes
    (v_clinic_id, 3, '09:00', '20:00', '14:00', '16:00', false), -- Miércoles
    (v_clinic_id, 4, '09:00', '20:00', '14:00', '16:00', false), -- Jueves
    (v_clinic_id, 5, '09:00', '20:00', '14:00', '16:00', false), -- Viernes
    (v_clinic_id, 6, '09:00', '14:00', NULL, NULL, false),       -- Sábado (solo mañana)
    (v_clinic_id, 0, '10:00', '14:00', NULL, NULL, true)         -- Domingo (cerrado)
  ON CONFLICT (clinic_id, day_of_week) DO UPDATE SET
    open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time,
    lunch_start = EXCLUDED.lunch_start, lunch_end = EXCLUDED.lunch_end,
    is_closed = EXCLUDED.is_closed;

  -- Horarios de los profesionales
  -- Dra. Eugenia: Lunes a Jueves mañana y tarde
  INSERT INTO public.professional_schedules (professional_id, day_of_week, start_time, end_time, break_start, break_end, is_working) VALUES
    (v_doc_eugenia, 1, '09:00', '19:00', '14:00', '16:00', true),
    (v_doc_eugenia, 2, '09:00', '19:00', '14:00', '16:00', true),
    (v_doc_eugenia, 3, '09:00', '19:00', '14:00', '16:00', true),
    (v_doc_eugenia, 4, '09:00', '19:00', '14:00', '16:00', true),
    (v_doc_eugenia, 5, '09:00', '14:00', NULL, NULL, true),
    (v_doc_eugenia, 6, '09:00', '14:00', NULL, NULL, false),
    (v_doc_eugenia, 0, '09:00', '14:00', NULL, NULL, false)
  ON CONFLICT (professional_id, day_of_week) DO NOTHING;

  -- Dr. Carlos Vega (Ortodoncia): Martes, Jueves y Viernes
  INSERT INTO public.professional_schedules (professional_id, day_of_week, start_time, end_time, break_start, break_end, is_working) VALUES
    (v_doc_carlos, 1, '10:00', '18:00', '14:00', '15:30', false),
    (v_doc_carlos, 2, '09:30', '19:30', '14:00', '16:00', true),
    (v_doc_carlos, 3, '09:30', '19:30', '14:00', '16:00', false),
    (v_doc_carlos, 4, '09:30', '19:30', '14:00', '16:00', true),
    (v_doc_carlos, 5, '09:00', '14:00', NULL, NULL, true),
    (v_doc_carlos, 6, '09:00', '14:00', NULL, NULL, true),
    (v_doc_carlos, 0, '09:00', '14:00', NULL, NULL, false)
  ON CONFLICT (professional_id, day_of_week) DO NOTHING;

  -- Dra. Sofía Navarro: Lunes, Miércoles, Viernes y Sábado
  INSERT INTO public.professional_schedules (professional_id, day_of_week, start_time, end_time, break_start, break_end, is_working) VALUES
    (v_doc_sofia, 1, '09:00', '18:00', '14:00', '15:30', true),
    (v_doc_sofia, 2, '09:00', '18:00', '14:00', '15:30', false),
    (v_doc_sofia, 3, '09:00', '18:00', '14:00', '15:30', true),
    (v_doc_sofia, 4, '09:00', '18:00', '14:00', '15:30', false),
    (v_doc_sofia, 5, '09:00', '19:00', '14:00', '16:00', true),
    (v_doc_sofia, 6, '09:00', '14:00', NULL, NULL, true),
    (v_doc_sofia, 0, '09:00', '14:00', NULL, NULL, false)
  ON CONFLICT (professional_id, day_of_week) DO NOTHING;

  -- Dr. Alberto Sanz: Lunes a Jueves
  INSERT INTO public.professional_schedules (professional_id, day_of_week, start_time, end_time, break_start, break_end, is_working) VALUES
    (v_doc_alberto, 1, '09:00', '17:00', '13:30', '15:00', true),
    (v_doc_alberto, 2, '09:00', '17:00', '13:30', '15:00', true),
    (v_doc_alberto, 3, '09:00', '17:00', '13:30', '15:00', true),
    (v_doc_alberto, 4, '09:00', '17:00', '13:30', '15:00', true),
    (v_doc_alberto, 5, '09:00', '14:00', NULL, NULL, false),
    (v_doc_alberto, 6, '09:00', '14:00', NULL, NULL, false),
    (v_doc_alberto, 0, '09:00', '14:00', NULL, NULL, false)
  ON CONFLICT (professional_id, day_of_week) DO NOTHING;

  -- 8. Plantillas de WhatsApp para Wawp
  INSERT INTO public.message_templates (clinic_id, code, title, category, body_text, variables) VALUES
    (v_clinic_id, 'cita_confirmada', 'Confirmación de nueva cita', 'citas',
     '👋 Hola {{nombre}}, confirmamos tu cita en *Clínica Dental Eugenia*.
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}
👨‍⚕️ *Profesional:* {{profesional}}
🦷 *Tratamiento:* {{servicio}}
📍 *Dirección:* Calle Mayor 45, Planta 1, Madrid.

Para cualquier duda o reprogramación, responde a este WhatsApp o gestiona tu cita aquí: {{enlace_gestion}}',
     ARRAY['{{nombre}}', '{{fecha}}', '{{hora}}', '{{profesional}}', '{{servicio}}', '{{enlace_gestion}}']),

    (v_clinic_id, 'recordatorio_24h', 'Recordatorio de cita (24 horas antes)', 'recordatorios',
     '🔔 *Recordatorio de cita*: Hola {{nombre}}, te recordamos que mañana tienes cita en *Clínica Dental Eugenia*.
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}} con {{profesional}} ({{servicio}}).

Por favor, confirma tu asistencia respondiendo a este mensaje con un *SÍ* o pulsa en: {{enlace_confirmar}}',
     ARRAY['{{nombre}}', '{{fecha}}', '{{hora}}', '{{profesional}}', '{{servicio}}', '{{enlace_confirmar}}']),

    (v_clinic_id, 'recordatorio_2h', 'Recordatorio el mismo día (2 horas antes)', 'recordatorios',
     '⏰ Hola {{nombre}}, tu cita en *Clínica Dental Eugenia* es hoy a las *{{hora}}*. ¡Te esperamos en Calle Mayor 45!',
     ARRAY['{{nombre}}', '{{hora}}']),

    (v_clinic_id, 'cita_reprogramada', 'Aviso de cita reprogramada', 'citas',
     '🔄 Hola {{nombre}}, tu cita en *Clínica Dental Eugenia* ha sido modificada con éxito.
Nueva fecha: *{{fecha}}* a las *{{hora}}* con {{profesional}}.
Si tienes algún inconveniente, avísanos con antelación.',
     ARRAY['{{nombre}}', '{{fecha}}', '{{hora}}', '{{profesional}}']),

    (v_clinic_id, 'cita_cancelada', 'Confirmación de cancelación de cita', 'citas',
     '❌ Hola {{nombre}}, confirmamos que tu cita del *{{fecha}}* a las *{{hora}}* ha sido cancelada.
Si deseas concertar una nueva cita en otro momento, estaremos encantados de atenderte.',
     ARRAY['{{nombre}}', '{{fecha}}', '{{hora}}']),

    (v_clinic_id, 'seguimiento_post', 'Seguimiento y satisfacción post-tratamiento', 'seguimiento',
     '✨ Hola {{nombre}}, esperamos que te encuentres genial tras tu cita de hoy con el equipo de Clínica Dental Eugenia.
Recuerda seguir las recomendaciones médicas que te indicamos. Si notas cualquier molestia inusual, contáctanos directamente por aquí.',
     ARRAY['{{nombre}}'])
  ON CONFLICT (code) DO NOTHING;

  -- 9. Pacientes de ejemplo (RGPD compliant, sin datos de facturación)
  INSERT INTO public.patients (
    id, clinic_id, first_name, last_name, dni_nie, birth_date, gender,
    phone, email, address, postal_code, city, notes, tags, acquisition_source, status
  ) VALUES
    (v_pat_1, v_clinic_id, 'Laura', 'Gómez Fernández', '51234567A', '1988-04-12', 'Femenino',
     '+34611223344', 'laura.gomez@email.com', 'Paseo de la Castellana 120', '28046', 'Madrid',
     'Paciente en tratamiento de ortodoncia invisible. Muy puntual.', ARRAY['Ortodoncia', 'Puntual'], 'Web', 'active'),

    (v_pat_2, v_clinic_id, 'Marcos', 'Ruiz Santana', '48765432B', '1975-11-23', 'Masculino',
     '+34622334455', 'marcos.ruiz@email.com', 'Calle Alcalá 84', '28009', 'Madrid',
     'Revisión anual y limpieza rutinaria.', ARRAY['Prevención'], 'Recomendación', 'active'),

    (v_pat_3, v_clinic_id, 'Elena', 'Vázquez Soto', '09876543C', '1995-07-08', 'Femenino',
     '+34633445566', 'elena.vazquez@email.com', 'Calle Princesa 14', '28008', 'Madrid',
     'Sensibilidad dental leve en cuadrante superior.', ARRAY['Estética'], 'Web', 'active'),

    (v_pat_4, v_clinic_id, 'Hugo', 'Pérez Moreno', '71239845D', '2016-02-15', 'Masculino',
     '+34644556677', 'padres.hugo@email.com', 'Calle Goya 32', '28001', 'Madrid',
     'Paciente infantil. Primera revisión dental.', ARRAY['Odontopediatría'], 'Google', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Consentimientos RGPD para los pacientes
  INSERT INTO public.patient_consents (patient_id, consent_type, granted, ip_address, user_agent, version) VALUES
    (v_pat_1, 'rgpd', true, '127.0.0.1', 'Mozilla/5.0 Web Registration', '1.0'),
    (v_pat_1, 'whatsapp_communication', true, '127.0.0.1', 'Mozilla/5.0 Web Registration', '1.0'),
    (v_pat_2, 'rgpd', true, '127.0.0.1', 'In-Clinic Reception Pad', '1.0'),
    (v_pat_2, 'whatsapp_communication', true, '127.0.0.1', 'In-Clinic Reception Pad', '1.0')
  ON CONFLICT DO NOTHING;

  -- Historial médico clínico (sin ningún precio ni dato económico)
  INSERT INTO public.patient_medical_records (patient_id, blood_type, allergies, medical_conditions, current_medications, clinical_notes) VALUES
    (v_pat_1, 'A+', 'Alergia al látex (usar guantes de nitrilo)', 'Ninguna patología relevante', 'Ninguna', 'Buena higiene oral. Alineación dental en fase 2.'),
    (v_pat_2, '0+', 'Sin alergias medicamentosas conocidas', 'Hipertensión controlada', 'Enalapril 10mg', 'Presencia de sarro subgingival moderado. Encías sin inflamación grave.')
  ON CONFLICT (patient_id) DO NOTHING;

  -- 10. Citas iniciales para observar el calendario (Hoy y próximos días)
  INSERT INTO public.appointments (
    clinic_id, patient_id, professional_id, operatory_id, service_id,
    start_time, end_time, duration_minutes, status, patient_notes, clinical_notes
  ) VALUES
    (v_clinic_id, v_pat_1, v_doc_carlos, v_gab2_id, v_srv_orto,
     date_trunc('day', now()) + INTERVAL '10 hour',
     date_trunc('day', now()) + INTERVAL '10 hour 30 min',
     30, 'confirmed', 'Revisión y cambio de alineadores', 'Evolución favorable del canino.'),

    (v_clinic_id, v_pat_2, v_doc_sofia, v_gab1_id, v_srv_limp,
     date_trunc('day', now()) + INTERVAL '11 hour',
     date_trunc('day', now()) + INTERVAL '11 hour 45 min',
     45, 'in_waiting_room', 'Limpieza anual', 'Paciente ya en sala de espera.'),

    (v_clinic_id, v_pat_3, v_doc_eugenia, v_gab3_id, v_srv_diag,
     date_trunc('day', now()) + INTERVAL '12 hour 30 min',
     date_trunc('day', now()) + INTERVAL '13 hour',
     30, 'pending', 'Consulta para valoración de implante inferior', 'Realizar ortopantomografía digital.'),

    (v_clinic_id, v_pat_4, v_doc_sofia, v_gab1_id, v_srv_pedia,
     date_trunc('day', now()) + INTERVAL '16 hour',
     date_trunc('day', now()) + INTERVAL '16 hour 30 min',
     30, 'confirmed', 'Revisión general de dientes de leche', 'Explicar técnica de cepillado.'),

    (v_clinic_id, v_pat_1, v_doc_alberto, v_gab1_id, v_srv_emp,
     date_trunc('day', now()) + INTERVAL '1 day 10 hour',
     date_trunc('day', now()) + INTERVAL '1 day 10 hour 45 min',
     45, 'confirmed', 'Obturación pieza 2.4', 'Composite A2.')
  ON CONFLICT DO NOTHING;

  -- 11. Contactos y Conversaciones de WhatsApp para Wawp
  INSERT INTO public.whatsapp_contacts (id, clinic_id, patient_id, phone_number, display_name) VALUES
    (v_contact_1, v_clinic_id, v_pat_1, '+34611223344', 'Laura Gómez')
  ON CONFLICT (phone_number) DO NOTHING;

  INSERT INTO public.whatsapp_conversations (
    id, clinic_id, contact_id, patient_id, status, last_message_text, last_message_at, unread_count
  ) VALUES (
    v_conv_1, v_clinic_id, v_contact_1, v_pat_1, 'open',
    'Perfecto, muchas gracias. Allí estaré mañana.', now() - INTERVAL '10 minute', 0
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.whatsapp_messages (
    conversation_id, direction, sender_phone, recipient_phone, message_type, content, status, wawp_message_id, sent_at
  ) VALUES
    (v_conv_1, 'outbound', '+34600112233', '+34611223344', 'template',
     '👋 Hola Laura, confirmamos tu cita en Clínica Dental Eugenia para hoy a las 10:00 con el Dr. Carlos Vega (Ortodoncia).',
     'read', 'wawp_msg_sample_01', now() - INTERVAL '1 hour'),
    (v_conv_1, 'inbound', '+34611223344', '+34600112233', 'text',
     'Perfecto, muchas gracias. Allí estaré puntual.',
     'read', 'wawp_msg_sample_02', now() - INTERVAL '10 minute')
  ON CONFLICT DO NOTHING;

END $$;

