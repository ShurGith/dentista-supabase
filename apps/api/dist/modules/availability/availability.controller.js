import { Router } from 'express';
import { availabilityService } from './availability.service.js';
import { availabilityQuerySchema } from '@clinica-eugenia/shared';
const router = Router();
// GET /api/v1/availability?service_id=...&date=YYYY-MM-DD&professional_id=...
router.get('/', async (req, res, next) => {
    try {
        const validated = availabilityQuerySchema.parse(req.query);
        const slots = await availabilityService.getAvailableSlots({
            clinicId: validated.clinic_id,
            serviceId: validated.service_id,
            professionalId: validated.professional_id,
            date: validated.date,
            durationMinutes: validated.duration_minutes,
        });
        res.json({
            success: true,
            data: slots,
            count: slots.length,
            date: validated.date,
        });
    }
    catch (err) {
        next(err);
    }
});
export const availabilityRouter = router;
