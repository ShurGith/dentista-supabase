import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
// Routers
import { appointmentsRouter } from './modules/appointments/appointments.controller.js';
import { availabilityRouter } from './modules/availability/availability.controller.js';
import { schedulesRouter } from './modules/schedules/schedules.controller.js';
import { patientsRouter } from './modules/patients/patients.controller.js';
import { servicesRouter } from './modules/services/services.controller.js';
import { professionalsRouter } from './modules/professionals/professionals.controller.js';
import { whatsappRouter, wawpWebhookRouter } from './modules/whatsapp/whatsapp.controller.js';
import { settingsRouter } from './modules/settings/settings.controller.js';
import { remindersService } from './modules/reminders/reminders.service.js';
import { authRouter, requireCrmSession } from './modules/auth/auth.controller.js';
import { clinicRouter } from './modules/clinic/clinic.controller.js';
export const app = express();
// Middlewares globales
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(requestLogger);
// Acceso al CRM: todo /api exige sesión iniciada salvo las rutas públicas (ver PUBLIC_ROUTES).
app.use('/api', requireCrmSession);
app.use('/api/v1/auth', authRouter);
// Endpoint de verificación de estado y salud del backend
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Clinica Dental Eugenia API',
        version: '1.0.0',
        economic_modules_disabled: true, // Certificación estricta de cero pasarelas/pagos
        wawp_sandbox_mode: config.wawp.sandboxMode,
        timestamp: new Date().toISOString(),
    });
});
// Registrar routers de módulos
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/availability', availabilityRouter);
app.use('/api/v1/schedules', schedulesRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/services', servicesRouter);
app.use('/api/v1/professionals', professionalsRouter);
app.use('/api/v1/whatsapp', whatsappRouter);
app.use('/api/wawp', wawpWebhookRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/clinic', clinicRouter);
// Endpoint manual o cron para disparar recordatorios automáticos
app.post('/api/v1/reminders/run', async (req, res, next) => {
    try {
        const results = await remindersService.runDueReminders();
        res.json({ success: true, results });
    }
    catch (err) {
        next(err);
    }
});
// Middleware centralizado de errores
app.use(errorHandler);
