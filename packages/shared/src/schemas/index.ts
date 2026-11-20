import { z } from 'zod';

// ====================================================================
// SCHEMAS ZOD - VALIDACIONES DE NEGOCIO
// ====================================================================

// 1. Esquema de Paciente
export const patientSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  last_name: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres').max(100),
  dni_nie: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  phone: z.string().min(9, 'El teléfono debe ser válido').regex(/^\+?[0-9\s\-]{9,18}$/, 'Formato de teléfono no válido'),
  email: z.string().email('Email no válido').optional().or(z.literal('')),
  address: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  acquisition_source: z.string().optional().default('Web'),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

// 2. Esquema de Reserva Pública de Cita (Landing Web)
export const publicBookingSchema = z.object({
  service_id: z.string().uuid('Servicio no válido'),
  professional_id: z.string().uuid('Profesional no válido').optional().nullable(),
  start_time: z.string().datetime({ message: 'Fecha y hora de inicio no válida' }),
  first_name: z.string().min(2, 'El nombre es obligatorio'),
  last_name: z.string().min(2, 'Los apellidos son obligatorios'),
  phone: z.string().min(9, 'Introduce un número de teléfono válido'),
  email: z.string().email('Introduce un email válido').optional().or(z.literal('')),
  patient_notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').optional(),
  rgpd_consent: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad y protección de datos' }),
  }),
  whatsapp_consent: z.boolean().default(true),
});

// 3. Esquema de Creación de Cita (Panel CRM)
export const createAppointmentSchema = z.object({
  clinic_id: z.string().uuid().optional(),
  patient_id: z.string().uuid('Debe seleccionar un paciente'),
  professional_id: z.string().uuid('Debe seleccionar un odontólogo'),
  operatory_id: z.string().uuid().optional(),
  service_id: z.string().uuid('Debe seleccionar un tratamiento'),
  start_time: z.string().datetime('Fecha de inicio inválida'),
  end_time: z.string().datetime('Fecha de fin inválida').optional(),
  duration_minutes: z.number().int().min(10).max(240).optional(),
  status: z.enum([
    'pending',
    'confirmed',
    'in_waiting_room',
    'in_progress',
    'completed',
    'cancelled_by_patient',
    'cancelled_by_clinic',
    'no_show',
  ]).default('pending'),
  patient_notes: z.string().optional(),
  clinical_notes: z.string().optional(),
});

// 4. Esquema de Movimiento/Drop en FullCalendar
export const moveAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  professional_id: z.string().uuid().optional(),
  operatory_id: z.string().uuid().optional(),
  reason: z.string().optional().default('Reprogramación por arrastre en calendario'),
});

// 5. Esquema de Redimensionamiento (Resize) en FullCalendar
export const resizeAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  duration_minutes: z.number().int().min(10).max(360),
});

// 6. Esquema de Cancelación de Cita
export const cancelAppointmentSchema = z.object({
  reason: z.string().min(3, 'Debes indicar el motivo de la cancelación'),
  cancelled_by: z.enum(['patient', 'clinic']).default('clinic'),
  notify_whatsapp: z.boolean().default(true),
});

// 7. Esquema de Consulta de Disponibilidad
export const availabilityQuerySchema = z.object({
  clinic_id: z.string().uuid().optional(),
  service_id: z.string().uuid(),
  professional_id: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha AAAA-MM-DD'),
  duration_minutes: z.coerce.number().int().min(10).max(240).optional(),
});

// 8. Integración WAWP: Enviar Mensaje de Texto o Plantilla
export const wawpSendMessageSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  phone_number: z.string().min(9),
  content: z.string().min(1, 'El mensaje no puede estar vacío'),
  template_code: z.string().optional(),
  template_variables: z.record(z.string()).optional(),
  appointment_id: z.string().uuid().optional(),
});

// 9. Integración WAWP: Webhook entrante
export const wawpWebhookPayloadSchema = z.object({
  event: z.string(), // 'message.incoming', 'message.status', 'instance.state'
  instance_id: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    body: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    timestamp: z.number().or(z.string()).optional(),
    sender_name: z.string().optional(),
  }),
});

// 10. Actualización de Configuración de la Clínica
export const updateSettingsSchema = z.object({
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  hero_title: z.string().min(5).optional(),
  hero_subtitle: z.string().min(10).optional(),
  min_notice_hours: z.number().int().min(0).max(72).optional(),
  max_advance_days: z.number().int().min(1).max(365).optional(),
  buffer_between_appointments_minutes: z.number().int().min(0).max(60).optional(),
  default_calendar_slot_minutes: z.number().int().min(5).max(60).optional(),
  wawp_enabled: z.boolean().optional(),
  wawp_instance_id: z.string().optional(),
  wawp_api_token: z.string().optional(),
  wawp_phone_number: z.string().optional(),
  wawp_sandbox_mode: z.boolean().optional(),
  reminder_24h_enabled: z.boolean().optional(),
  reminder_2h_enabled: z.boolean().optional(),
  reminder_post_enabled: z.boolean().optional(),
});

