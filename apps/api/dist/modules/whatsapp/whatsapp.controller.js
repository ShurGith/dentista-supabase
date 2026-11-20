import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin, config } from '../../config/index.js';
import { wawpService } from '../wawp/wawp.service.js';
import { wawpSendMessageSchema } from '@clinica-eugenia/shared';
const router = Router();
const wawpWebhookRouter = Router();
function verifyWawpWebhook(req, res, next) {
    const expected = config.wawp.webhookSecret;
    const received = String(req.get('x-wawp-signature') || req.get('x-wawp-secret') || req.query.secret || '');
    if (!expected)
        return res.status(503).json({ success: false, error: 'WEBHOOK_NOT_CONFIGURED' });
    const expectedBytes = Buffer.from(expected);
    const receivedBytes = Buffer.from(received);
    if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }
    next();
}
async function receiveWawpWebhook(req, res, next) {
    try {
        const idempotencyKey = String(req.body?.id || req.headers['x-idempotency-key'] || req.body?.data?.id || '');
        const result = await wawpService.handleWebhook(req.body, idempotencyKey || undefined);
        res.status(200).json({ success: true, result });
    }
    catch (err) {
        next(err);
    }
}
wawpWebhookRouter.post('/webhook', verifyWawpWebhook, receiveWawpWebhook);
router.post('/webhook', verifyWawpWebhook, receiveWawpWebhook);
router.get('/status', async (_req, res, next) => {
    try {
        res.json({ success: true, data: await wawpService.getSessionStatus() });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/whatsapp/conversations - Listado de conversaciones abiertas/pendientes
router.get('/conversations', async (req, res, next) => {
    try {
        const { status } = req.query;
        let query = supabaseAdmin
            .from('whatsapp_conversations')
            .select(`
        *,
        contact:whatsapp_contacts (id, phone_number, display_name),
        patient:patients (id, first_name, last_name, phone, email)
      `)
            .eq('clinic_id', config.clinicId)
            .order('last_message_at', { ascending: false });
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query;
        if (error)
            throw error;
        res.json({ success: true, data: data || [] });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/whatsapp/conversations/:id/messages - Historial de mensajes de un chat
router.get('/conversations/:id/messages', async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('whatsapp_messages')
            .select('*')
            .eq('conversation_id', req.params.id)
            .order('sent_at', { ascending: true });
        if (error)
            throw error;
        // Marcar conversación como leída
        await supabaseAdmin
            .from('whatsapp_conversations')
            .update({ unread_count: 0 })
            .eq('id', req.params.id);
        res.json({ success: true, data: data || [] });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/v1/whatsapp/conversations/:id - Elimina la conversación y sus mensajes (ON DELETE CASCADE).
// Solo borra en la base: el chat sigue existiendo en WhatsApp. El contacto se conserva.
router.delete('/conversations/:id', async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('whatsapp_conversations')
            .delete()
            .eq('id', req.params.id)
            .eq('clinic_id', config.clinicId)
            .select('id');
        if (error)
            throw error;
        if (!data?.length) {
            return res.status(404).json({ success: false, error: 'CONVERSATION_NOT_FOUND', message: 'La conversación no existe o ya se eliminó.' });
        }
        res.json({ success: true, data: { id: data[0].id } });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/whatsapp/messages/send - Enviar mensaje manual o plantilla a través de Wawp
router.post('/messages/send', async (req, res, next) => {
    try {
        const validated = wawpSendMessageSchema.parse(req.body);
        if (validated.content.length > 4096) {
            return res.status(400).json({ success: false, error: 'MESSAGE_TOO_LONG', message: 'WhatsApp admite hasta 4096 caracteres por mensaje.' });
        }
        let result;
        if (validated.template_code && validated.template_variables) {
            result = await wawpService.sendTemplate(validated.phone_number, validated.template_code, validated.template_variables, validated.appointment_id);
        }
        else {
            result = await wawpService.sendMessage({
                phoneNumber: validated.phone_number,
                text: validated.content,
                appointmentId: validated.appointment_id,
            });
        }
        if (result.status === 'blocked_dev') {
            return res.status(403).json({ success: false, error: 'BLOCKED_BY_DEV_MODE', message: result.error });
        }
        if (!result.success) {
            return res.status(502).json({ success: false, error: 'WAWP_SEND_FAILED', message: result.error || 'Wawp no pudo aceptar el mensaje.' });
        }
        res.json({ success: result.success, data: result });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/whatsapp/templates - Obtener plantillas disponibles
router.get('/templates', async (req, res, next) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('message_templates')
            .select('*')
            .eq('clinic_id', config.clinicId)
            .eq('is_active', true)
            .order('title', { ascending: true });
        if (error)
            throw error;
        res.json({ success: true, data: data || [] });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/whatsapp/simulator/simulate-incoming - Simulador local para pruebas
router.post('/simulator/simulate-incoming', async (req, res, next) => {
    try {
        if (config.nodeEnv === 'production')
            return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const { phone_number, message } = req.body;
        const mockPayload = {
            event: 'message.incoming',
            data: {
                id: `mock_wawp_${Date.now()}`,
                from: phone_number || '+34611223344',
                to: config.wawp.phoneNumber,
                body: message || 'Hola, me gustaría confirmar mi cita para mañana.',
                type: 'text',
            },
        };
        const result = await wawpService.handleWebhook(mockPayload);
        res.json({ success: true, message: 'Mensaje simulado procesado.', result });
    }
    catch (err) {
        next(err);
    }
});
export const whatsappRouter = router;
export { wawpWebhookRouter };
