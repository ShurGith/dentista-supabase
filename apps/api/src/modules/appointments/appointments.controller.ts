import { Router, Request, Response, NextFunction } from 'express';
import { appointmentsService } from './appointments.service.js';
import { supabaseAdmin, config } from '../../config/index.js';
import {
  createAppointmentSchema,
  publicBookingSchema,
  moveAppointmentSchema,
  resizeAppointmentSchema,
  cancelAppointmentSchema,
} from '@clinica-eugenia/shared';

const router = Router();

// GET /api/v1/appointments - Listar citas con filtros
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, professionalId, operatoryId, status, patientId } = req.query;
    const appointments = await appointmentsService.listAppointments({
      startDate: startDate as string,
      endDate: endDate as string,
      professionalId: professionalId as string,
      operatoryId: operatoryId as string,
      status: status as string,
      patientId: patientId as string,
    });
    res.json({ success: true, data: appointments });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/appointments/:id - Detalle de cita
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointment = await appointmentsService.getAppointmentById(req.params.id as string);
    res.json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/appointments - Crear cita desde el panel CRM
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createAppointmentSchema.parse(req.body);
    const appointment = await appointmentsService.createAppointment({
      ...validated,
      startTime: validated.start_time,
      endTime: validated.end_time,
      patientId: validated.patient_id,
      professionalId: validated.professional_id,
      operatoryId: validated.operatory_id,
      serviceId: validated.service_id,
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/appointments/public-book - Reserva pública de cita desde la landing web
router.post('/public-book', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = publicBookingSchema.parse(req.body);

    // 1. Buscar si el paciente ya existe por teléfono o email
    let { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, phone')
      .or(`phone.eq.${validated.phone},email.eq.${validated.email || 'non_existent@mail.com'}`)
      .maybeSingle();

    // 2. Si no existe, crear el registro del paciente
    if (!patient) {
      const { data: newPatient, error: pErr } = await supabaseAdmin
        .from('patients')
        .insert({
          clinic_id: config.clinicId,
          first_name: validated.first_name,
          last_name: validated.last_name,
          phone: validated.phone,
          email: validated.email || null,
          acquisition_source: 'Web Pública',
        })
        .select('id, phone')
        .single();

      if (pErr) throw pErr;
      patient = newPatient;
    }

    // 3. Registrar consentimiento RGPD
    await supabaseAdmin.from('patient_consents').insert({
      patient_id: patient!.id,
      consent_type: 'rgpd',
      granted: true,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    if (validated.whatsapp_consent) {
      await supabaseAdmin.from('patient_consents').insert({
        patient_id: patient!.id,
        consent_type: 'whatsapp_communication',
        granted: true,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });
    }

    // 4. Si no se eligió profesional, asignar uno idóneo para este servicio
    let chosenProfId = validated.professional_id;
    if (!chosenProfId) {
      const { data: profServ } = await supabaseAdmin
        .from('professional_services')
        .select('professional_id')
        .eq('service_id', validated.service_id)
        .limit(1)
        .single();
      chosenProfId = profServ?.professional_id;
    }

    if (!chosenProfId) {
      const { data: anyProf } = await supabaseAdmin
        .from('professionals')
        .select('id')
        .eq('clinic_id', config.clinicId)
        .limit(1)
        .single();
      chosenProfId = anyProf?.id;
    }

    // 5. Crear la cita
    const appointment = await appointmentsService.createAppointment({
      clinicId: config.clinicId,
      patientId: patient!.id,
      professionalId: chosenProfId!,
      serviceId: validated.service_id,
      startTime: validated.start_time,
      status: 'pending',
      patientNotes: validated.patient_notes,
    });

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Cita reservada con éxito. Hemos enviado un mensaje de confirmación por WhatsApp.',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/appointments/move - Arrastrar y soltar en FullCalendar (eventDrop)
router.patch('/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = moveAppointmentSchema.parse(req.body);
    const updated = await appointmentsService.moveAppointment({
      appointmentId: validated.appointment_id,
      startTime: validated.start_time,
      endTime: validated.end_time,
      professionalId: validated.professional_id,
      operatoryId: validated.operatory_id,
      reason: validated.reason,
      notifyWhatsApp: validated.notify_whatsapp,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/appointments/resize - Redimensionar duración en FullCalendar (eventResize)
router.patch('/resize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = resizeAppointmentSchema.parse(req.body);
    const updated = await appointmentsService.resizeAppointment({
      appointmentId: validated.appointment_id,
      startTime: validated.start_time,
      endTime: validated.end_time,
      durationMinutes: validated.duration_minutes,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/appointments/:id/status - Cambiar estado
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason, notifyWhatsApp } = req.body;
    const updated = await appointmentsService.updateStatus(
      req.params.id as string,
      status,
      reason,
      notifyWhatsApp !== false
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/appointments/:id?notify=true|false - Eliminar cita y, opcionalmente, avisar por WhatsApp
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notify = String(req.query.notify || '').toLowerCase() === 'true';
    const result = await appointmentsService.deleteAppointment(req.params.id as string, notify);
    if (!result) {
      return res.status(404).json({ success: false, error: 'APPOINTMENT_NOT_FOUND', message: 'La cita no existe o ya se eliminó.' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export const appointmentsRouter = router;
