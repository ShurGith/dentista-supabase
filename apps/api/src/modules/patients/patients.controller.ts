import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin, config } from '../../config/index.js';
import { patientSchema } from '@clinica-eugenia/shared';

const router = Router();

// GET /api/v1/patients - Listado con búsqueda avanzada
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, tag, status = 'active', limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('patients')
      .select('*, medical_record:patient_medical_records(allergies, medical_conditions)')
      .eq('clinic_id', config.clinicId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) query = query.eq('status', status as string);
    if (tag) query = query.contains('tags', [tag as string]);

    if (search && typeof search === 'string') {
      const s = search.trim();
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,phone.ilike.%${s}%,dni_nie.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/patients/:id - Ficha completa del paciente
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select(`
        *,
        medical_record:patient_medical_records (*),
        consents:patient_consents (*),
        documents:patient_documents (*),
        appointments:appointments (
          id, start_time, end_time, status,
          service:services(name),
          professional:professionals(first_name, last_name)
        )
      `)
      .eq('id', req.params.id)
      .eq('clinic_id', config.clinicId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/patients - Alta de paciente
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = patientSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('patients')
      .insert({
        ...validated,
        clinic_id: config.clinicId,
      })
      .select()
      .single();

    if (error) throw error;

    // Crear expediente médico vacío inicial
    await supabaseAdmin.from('patient_medical_records').insert({
      patient_id: data.id,
      allergies: req.body.allergies || null,
      medical_conditions: req.body.medical_conditions || null,
      current_medications: req.body.current_medications || null,
      clinical_notes: req.body.clinical_notes || null,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/patients/:id - Actualizar datos del paciente
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = patientSchema.partial().parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('patients')
      .update(validated)
      .eq('id', req.params.id)
      .eq('clinic_id', config.clinicId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/patients/:id - Ocultar paciente sin borrar su historial
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('clinic_id', config.clinicId)
      .eq('is_deleted', false)
      .select('id')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/patients/:id/medical-record - Actualizar historia clínica médica
router.put('/:id/medical-record', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { allergies, medical_conditions, current_medications, clinical_notes, blood_type, habits } = req.body;

    const { data, error } = await supabaseAdmin
      .from('patient_medical_records')
      .upsert({
        patient_id: req.params.id,
        allergies,
        medical_conditions,
        current_medications,
        clinical_notes,
        blood_type,
        habits,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'patient_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/patients/:id/anonymize - Derecho al olvido y anonimización RGPD
router.post('/:id/anonymize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const anonSuffix = Math.random().toString(36).substring(7);

    // Anonimizar datos identificativos
    const { error } = await supabaseAdmin
      .from('patients')
      .update({
        first_name: 'Paciente',
        last_name: `Anonimizado ${anonSuffix}`,
        phone: '+34000000000',
        email: `anonimizado_${anonSuffix}@anon.local`,
        dni_nie: null,
        address: null,
        notes: '[Expediente anonimizado por ejercicio de derecho RGPD]',
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', patientId);

    if (error) throw error;

    // Registrar en auditoría
    await supabaseAdmin.from('audit_logs').insert({
      clinic_id: config.clinicId,
      action: 'RGPD_PATIENT_ANONYMIZED',
      entity_type: 'patients',
      entity_id: patientId,
      new_values: { anonymized_at: new Date().toISOString() },
    });

    res.json({ success: true, message: 'Datos personales del paciente anonimizados conforme al RGPD.' });
  } catch (err) {
    next(err);
  }
});

export const patientsRouter = router;

