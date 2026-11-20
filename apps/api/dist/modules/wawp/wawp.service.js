import { config, supabaseAdmin } from '../../config/index.js';
import { getWawpAckStatus, getWawpMessageId, isBeforeHistoryCutoff, isBlockedByDevMode, normalizeWawpPhone, renderTemplate } from './wawp.helpers.js';
const unwrapArray = (value, key) => Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : Array.isArray(value?.data) ? value.data : [];
const messageTimestamp = (value) => {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0
        ? new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp).toISOString()
        : new Date().toISOString();
};
const participantId = (value) => {
    if (typeof value === 'string')
        return value;
    if (!value || typeof value !== 'object')
        return '';
    const participant = value;
    const id = participant._serialized || participant.id?._serialized || participant.id?.user || participant.id || participant.user;
    return typeof id === 'string' ? id : '';
};
export class WawpService {
    baseUrl;
    instanceId;
    apiToken;
    isSandbox;
    constructor() {
        this.baseUrl = config.wawp.baseUrl;
        this.instanceId = config.wawp.instanceId;
        this.apiToken = config.wawp.accessToken;
        this.isSandbox = config.wawp.sandboxMode;
    }
    async getSessionStatus() {
        if (this.isSandbox)
            return { mode: 'sandbox', connected: null, status: 'SANDBOX' };
        const url = new URL('/v2/session/info', this.baseUrl);
        url.searchParams.set('instance_id', this.instanceId);
        url.searchParams.set('access_token', this.apiToken);
        const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10000) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.warn(JSON.stringify({ event: 'whatsapp.session_check', provider: 'wawp', status: 'failed', httpStatus: response.status }));
            throw Object.assign(new Error(`Wawp rechazó la comprobación de conexión (HTTP ${response.status}).`), { status: 502 });
        }
        const connectedId = String(data?.me?.id || '');
        const phone = connectedId.split('@', 1)[0].replace(/\D/g, '');
        const status = String(data?.status || 'UNKNOWN');
        console.info(JSON.stringify({ event: 'whatsapp.session_check', provider: 'wawp', status }));
        return { mode: 'api', connected: status === 'WORKING', status, phoneSuffix: phone ? phone.slice(-4) : undefined };
    }
    async syncHistory() {
        if (this.isSandbox)
            return { chats: 0, messages: 0 };
        const limit = 50;
        let chatsSynced = 0;
        let messagesSynced = 0;
        const get = async (path, params) => {
            const url = new URL(path, this.baseUrl);
            url.searchParams.set('instance_id', this.instanceId);
            url.searchParams.set('access_token', this.apiToken);
            Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
            const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw Object.assign(new Error(`Wawp rechazó la sincronización del historial (HTTP ${response.status}).`), { status: 502 });
            return payload;
        };
        for (let chatOffset = 0;; chatOffset += limit) {
            const chats = unwrapArray(await get('/v2/chats', { limit: String(limit), offset: String(chatOffset) }), 'chats');
            if (!chats.length)
                break;
            for (const chat of chats) {
                const chatId = String(chat.id || chat.chatId || '');
                if (!/^\+?\d{8,15}(?:@(c\.us|s\.whatsapp\.net))?$/i.test(chatId))
                    continue;
                const phone = normalizeWawpPhone(chatId);
                // La conversación se crea solo si el chat tiene mensajes posteriores a WAWP_HISTORY_SINCE.
                let conversation;
                let latest;
                for (let messageOffset = 0;; messageOffset += limit) {
                    const messages = unwrapArray(await get('/v2/chats/messages', {
                        chatId,
                        limit: String(limit),
                        offset: String(messageOffset),
                        downloadMedia: 'false',
                    }), 'messages');
                    if (!messages.length)
                        break;
                    const recent = messages.filter((message) => !isBeforeHistoryCutoff(messageTimestamp(message.timestamp), config.wawp.historySince));
                    if (recent.length) {
                        conversation ??= (await this.getOrCreateConversation(phone, chat.name)).conversation;
                        const conversationId = conversation.id;
                        const rows = recent.map((message) => this.toConversationMessage(message, conversationId, phone));
                        const { error } = await supabaseAdmin.from('whatsapp_messages').upsert(rows, { onConflict: 'wawp_message_id' });
                        if (error)
                            throw error;
                        messagesSynced += rows.length;
                        for (const row of rows) {
                            if (!latest || row.sent_at > latest.at)
                                latest = { at: row.sent_at, content: row.content };
                        }
                    }
                    if (messages.length < limit)
                        break;
                }
                if (!conversation)
                    continue;
                if (latest && (!conversation.last_message_at || latest.at > conversation.last_message_at)) {
                    const { error } = await supabaseAdmin.from('whatsapp_conversations').update({
                        last_message_text: latest.content,
                        last_message_at: latest.at,
                        updated_at: new Date().toISOString(),
                    }).eq('id', conversation.id);
                    if (error)
                        throw error;
                }
                chatsSynced++;
            }
            if (chats.length < limit)
                break;
        }
        return { chats: chatsSynced, messages: messagesSynced };
    }
    /**
     * Envía un mensaje de texto plano o con contenido dinámico a través de Wawp
     */
    async sendMessage(options) {
        let cleanPhone;
        try {
            cleanPhone = normalizeWawpPhone(options.phoneNumber);
        }
        catch (error) {
            return { success: false, status: 'failed', error: error.message };
        }
        if (!options.text.trim() || options.text.length > 4096)
            return { success: false, status: 'failed', error: 'El mensaje debe tener texto y no superar 4096 caracteres.' };
        // 1. Si está en modo Sandbox o sin API token real, simular envío con éxito
        if (this.isSandbox) {
            console.info(JSON.stringify({ event: 'whatsapp.send', provider: 'wawp', mode: 'sandbox', status: 'sent', templateCode: options.templateCode }));
            const mockMessageId = `wawp_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            // Registrar en message_logs
            await this.logMessage({
                phone: cleanPhone,
                content: options.text,
                templateCode: options.templateCode,
                appointmentId: options.appointmentId,
                direction: 'outbound',
                providerId: mockMessageId,
                status: 'sent',
            });
            return {
                success: true,
                messageId: mockMessageId,
                status: 'sent',
                sandbox: true,
            };
        }
        // 2. MODO_DEV: solo se permite el envío real al número de pruebas (PHONE_NUMBER_DEV).
        if (isBlockedByDevMode(cleanPhone, config.wawp.devMode, config.wawp.devPhoneNumber)) {
            console.warn(JSON.stringify({ event: 'whatsapp.send', provider: 'wawp', status: 'blocked_dev_mode', templateCode: options.templateCode }));
            return {
                success: false,
                status: 'blocked_dev',
                error: config.wawp.devPhoneNumber
                    ? 'El mensaje no se ha enviado porque el modo de pruebas está activo.\n\nSolo puedes enviar mensajes al número configurado para pruebas.\n\nPara enviar a pacientes, desactiva el modo de pruebas en el servidor.'
                    : 'El mensaje no se ha enviado porque el modo de pruebas está activo.\n\nNo hay un número de pruebas configurado, por lo que todos los envíos están bloqueados.',
            };
        }
        // 3. Envío real a la API de Wawp
        try {
            const url = new URL('/v2/send/text', this.baseUrl);
            url.searchParams.set('instance_id', this.instanceId);
            url.searchParams.set('access_token', this.apiToken);
            let response;
            let data;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatId: `${cleanPhone}@c.us`, message: options.text }),
                        signal: AbortSignal.timeout(15000),
                    });
                    data = await response.json().catch(() => ({}));
                    if (response.ok || ![429, 502, 503, 504].includes(response.status) || attempt === 2)
                        break;
                }
                catch (error) {
                    if (attempt === 2)
                        throw error;
                }
                console.warn(JSON.stringify({ event: 'whatsapp.retry', provider: 'wawp', attempt: attempt + 1 }));
                await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt)));
            }
            const messageId = getWawpMessageId(data?.id ?? data?.data?.id ?? data?.message_id ?? data?.messageId);
            const status = response?.ok ? 'sent' : 'failed';
            await this.logMessage({
                phone: cleanPhone,
                content: options.text,
                templateCode: options.templateCode,
                appointmentId: options.appointmentId,
                direction: 'outbound',
                providerId: messageId,
                status,
            });
            console.info(JSON.stringify({ event: 'whatsapp.send', provider: 'wawp', status, httpStatus: response?.status, hasProviderId: Boolean(messageId) }));
            return {
                success: response?.ok || false,
                messageId,
                status,
                error: response?.ok ? undefined : (data?.message || data?.error || `Error en Wawp (${response?.status || 'sin respuesta'})`),
            };
        }
        catch (err) {
            console.error(JSON.stringify({ event: 'whatsapp.send', provider: 'wawp', status: 'failed', error: err?.name || 'network_error' }));
            return {
                success: false,
                status: 'failed',
                error: 'No se pudo conectar con Wawp.',
            };
        }
    }
    /**
     * Envía una plantilla predefinida sustituyendo variables dinámicas
     */
    async sendTemplate(phoneNumber, templateCode, variables, appointmentId) {
        // 1. Obtener plantilla de la base de datos
        const { data: template, error } = await supabaseAdmin
            .from('message_templates')
            .select('*')
            .eq('code', templateCode)
            .eq('is_active', true)
            .single();
        if (error)
            throw error;
        if (!template)
            throw new Error(`Plantilla de WhatsApp no disponible: ${templateCode}`);
        let bodyText = template.body_text;
        // 2. Reemplazar variables {{nombre}}, {{fecha}}, etc.
        bodyText = renderTemplate(bodyText, variables);
        return this.sendMessage({
            phoneNumber,
            text: bodyText,
            templateCode,
            variables,
            appointmentId,
        });
    }
    /**
     * Procesa un webhook entrante emitido por Wawp (mensajes entrantes o cambios de estado)
     */
    async handleWebhook(payload, idempotencyKey) {
        const eventType = payload.event || payload.type || 'message.incoming';
        const data = payload.payload || payload.data || payload;
        // 1. Registrar evento en webhook_events para idempotencia
        if (idempotencyKey) {
            const { error } = await supabaseAdmin.from('webhook_events').insert({
                provider: 'wawp',
                event_type: eventType,
                idempotency_key: idempotencyKey,
                payload,
                processed: false,
            });
            if (error && error.code !== '23505') {
                throw error;
            }
            const { data: claim, error: claimError } = await supabaseAdmin.from('webhook_events')
                .update({ processed: true, error: null })
                .eq('idempotency_key', idempotencyKey)
                .eq('processed', false)
                .select('id')
                .maybeSingle();
            if (claimError)
                throw claimError;
            if (!claim)
                return { status: 'duplicate_ignored' };
        }
        const markProcessed = async () => {
            if (!idempotencyKey)
                return;
            const { error } = await supabaseAdmin.from('webhook_events').update({ processed: true, error: null }).eq('idempotency_key', idempotencyKey);
            if (error)
                throw error;
        };
        try {
            // 2. Archivar mensajes entrantes y salientes para mantener una copia del hilo.
            if (['message', 'message.any', 'message.incoming', 'messages.upsert'].includes(eventType)) {
                const fromMe = data.fromMe === true;
                const externalParticipant = participantId(fromMe ? data.to : data.from) || (fromMe ? String(data.to || '') : String(data.sender || ''));
                const externalPhone = externalParticipant.split('@')[0].replace(/\D/g, '');
                const content = String(data.body || data.text || (typeof data.message === 'string' ? data.message : '') || (data.hasMedia ? '[Archivo multimedia]' : ''));
                if (!externalPhone || !content) {
                    await markProcessed();
                    return { status: 'ignored_empty' };
                }
                // Wawp puede reenviar historial antiguo (p. ej. al reconectar la sesión): no se archiva.
                if (isBeforeHistoryCutoff(messageTimestamp(data.timestamp || payload.timestamp), config.wawp.historySince)) {
                    await markProcessed();
                    return { status: 'ignored_before_history_cutoff' };
                }
                const { contact, conversation } = await this.getOrCreateConversation(externalPhone, data.pushName || data.notifyName);
                const row = this.toConversationMessage({ ...data, fromMe, timestamp: data.timestamp || payload.timestamp }, conversation.id, externalPhone);
                if (row.wawp_message_id) {
                    const { data: saved, error } = await supabaseAdmin.from('whatsapp_messages').upsert(row, { onConflict: 'wawp_message_id', ignoreDuplicates: true }).select('id').maybeSingle();
                    if (error)
                        throw error;
                    if (!saved) {
                        await markProcessed();
                        return { status: 'duplicate_message_ignored' };
                    }
                }
                else {
                    const { error } = await supabaseAdmin.from('whatsapp_messages').insert(row);
                    if (error)
                        throw error;
                }
                const update = {
                    last_message_text: content,
                    last_message_at: row.sent_at,
                    updated_at: new Date().toISOString(),
                    status: 'open',
                };
                if (!fromMe)
                    update.unread_count = (conversation.unread_count || 0) + 1;
                const { error: conversationError } = await supabaseAdmin.from('whatsapp_conversations').update(update).eq('id', conversation.id);
                if (conversationError)
                    throw conversationError;
                const { error: contactError } = await supabaseAdmin.from('whatsapp_contacts').update({ last_activity: row.sent_at }).eq('id', contact.id);
                if (contactError)
                    throw contactError;
                if (!fromMe) {
                    const lower = content.trim().toLowerCase();
                    if (['si', 'sí', 'confirmar', 'ok'].includes(lower) && contact.patient_id) {
                        await this.autoConfirmPendingAppointment(contact.patient_id);
                    }
                }
                await markProcessed();
                return { status: fromMe ? 'processed_outgoing_message' : 'processed_incoming_message' };
            }
            // 3. Si es actualización de estado (delivered, read)
            if (['message.ack', 'message.status', 'messages.update'].includes(eventType)) {
                const messageId = getWawpMessageId(data.id) || data.messageId;
                const newStatus = getWawpAckStatus(data.ack) || data.status;
                if (messageId && newStatus) {
                    let update = supabaseAdmin
                        .from('whatsapp_messages')
                        .update({
                        status: newStatus,
                        delivered_at: newStatus === 'delivered' ? new Date().toISOString() : undefined,
                        read_at: newStatus === 'read' ? new Date().toISOString() : undefined,
                    })
                        .eq('wawp_message_id', messageId);
                    if (newStatus === 'delivered')
                        update = update.neq('status', 'read');
                    if (newStatus === 'sent')
                        update = update.eq('status', 'queued');
                    const { error } = await update;
                    if (error)
                        throw error;
                }
                await markProcessed();
                return { status: 'status_updated' };
            }
            await markProcessed();
            return { status: 'unhandled_event' };
        }
        catch (error) {
            if (idempotencyKey) {
                await supabaseAdmin.from('webhook_events').update({ processed: false, error: 'processing_failed' }).eq('idempotency_key', idempotencyKey);
            }
            throw error;
        }
    }
    /**
     * Confirma automáticamente la cita más próxima si el paciente responde SÍ
     */
    async autoConfirmPendingAppointment(patientId) {
        const now = new Date().toISOString();
        const { data: upcomingAppointment } = await supabaseAdmin
            .from('appointments')
            .select('id, start_time')
            .eq('patient_id', patientId)
            .eq('status', 'pending')
            .gte('start_time', now)
            .order('start_time', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (upcomingAppointment) {
            await supabaseAdmin
                .from('appointments')
                .update({
                status: 'confirmed',
                reschedule_reason: 'Confirmada automáticamente por respuesta de WhatsApp (Wawp)',
            })
                .eq('id', upcomingAppointment.id);
            console.log(`[Auto-Confirm] Cita ${upcomingAppointment.id} confirmada automáticamente vía WhatsApp.`);
        }
    }
    toConversationMessage(message, conversationId, phone) {
        const fromMe = message.fromMe === true;
        const type = String(message.type || (message.hasMedia ? 'media' : 'text'));
        const content = String(message.body || message.caption || (message.hasMedia ? `[${type}]` : 'Mensaje sin texto'));
        return {
            conversation_id: conversationId,
            direction: fromMe ? 'outbound' : 'inbound',
            sender_phone: fromMe ? config.wawp.phoneNumber : `+${phone}`,
            recipient_phone: fromMe ? `+${phone}` : config.wawp.phoneNumber,
            message_type: type === 'chat' ? 'text' : type,
            content,
            media_url: typeof message.media?.url === 'string' ? message.media.url : null,
            wawp_message_id: getWawpMessageId(message.id) || null,
            status: getWawpAckStatus(message.ack) || (fromMe ? 'sent' : 'delivered'),
            sent_at: messageTimestamp(message.timestamp),
        };
    }
    async getOrCreateConversation(phone, displayName) {
        const normalizedPhone = `+${normalizeWawpPhone(phone)}`;
        let { data: contact, error } = await supabaseAdmin
            .from('whatsapp_contacts')
            .select('id, patient_id, display_name')
            .eq('clinic_id', config.clinicId)
            .eq('phone_number', normalizedPhone)
            .maybeSingle();
        if (error)
            throw error;
        if (!contact) {
            const { data: patient, error: patientError } = await supabaseAdmin
                .from('patients')
                .select('id, first_name, last_name')
                .eq('clinic_id', config.clinicId)
                .ilike('phone', `%${normalizedPhone.slice(-9)}`)
                .limit(1)
                .maybeSingle();
            if (patientError)
                throw patientError;
            const inserted = await supabaseAdmin.from('whatsapp_contacts').insert({
                clinic_id: config.clinicId,
                patient_id: patient?.id || null,
                phone_number: normalizedPhone,
                display_name: patient ? `${patient.first_name} ${patient.last_name}` : (displayName || normalizedPhone).slice(0, 150),
            }).select('id, patient_id, display_name').single();
            if (inserted.error?.code === '23505') {
                const existing = await supabaseAdmin.from('whatsapp_contacts').select('id, patient_id, display_name')
                    .eq('clinic_id', config.clinicId).eq('phone_number', normalizedPhone).maybeSingle();
                if (existing.error)
                    throw existing.error;
                contact = existing.data;
            }
            else {
                if (inserted.error)
                    throw inserted.error;
                contact = inserted.data;
            }
        }
        if (!contact)
            throw new Error('WAWP_CONTACT_UPSERT_FAILED');
        const existingConversation = await supabaseAdmin.from('whatsapp_conversations')
            .select('id, unread_count, last_message_at')
            .eq('clinic_id', config.clinicId)
            .eq('contact_id', contact.id)
            .maybeSingle();
        if (existingConversation.error)
            throw existingConversation.error;
        if (existingConversation.data)
            return { contact, conversation: existingConversation.data };
        const createdConversation = await supabaseAdmin.from('whatsapp_conversations').insert({
            clinic_id: config.clinicId,
            contact_id: contact.id,
            patient_id: contact.patient_id,
            status: 'open',
        }).select('id, unread_count, last_message_at').single();
        if (createdConversation.error)
            throw createdConversation.error;
        return { contact, conversation: createdConversation.data };
    }
    async persistConversationMessage(entry) {
        const { contact, conversation } = await this.getOrCreateConversation(entry.phone);
        const row = {
            conversation_id: conversation.id,
            direction: 'outbound',
            sender_phone: config.wawp.phoneNumber,
            recipient_phone: `+${normalizeWawpPhone(entry.phone)}`,
            message_type: entry.templateCode ? 'template' : 'text',
            content: entry.content,
            wawp_message_id: entry.providerId || null,
            appointment_id: entry.appointmentId || null,
            status: entry.status,
            sent_at: new Date().toISOString(),
        };
        const result = entry.providerId
            ? await supabaseAdmin.from('whatsapp_messages').upsert(row, { onConflict: 'wawp_message_id', ignoreDuplicates: true }).select('id').maybeSingle()
            : await supabaseAdmin.from('whatsapp_messages').insert(row).select('id').single();
        if (result.error)
            throw result.error;
        if (!result.data)
            return;
        const { error } = await supabaseAdmin.from('whatsapp_conversations').update({
            last_message_text: entry.content,
            last_message_at: row.sent_at,
            updated_at: row.sent_at,
        }).eq('id', conversation.id);
        if (error)
            throw error;
        await supabaseAdmin.from('whatsapp_contacts').update({ last_activity: row.sent_at }).eq('id', contact.id);
    }
    async logMessage(entry) {
        if (entry.direction === 'outbound') {
            try {
                await this.persistConversationMessage(entry);
            }
            catch (error) {
                console.error(JSON.stringify({ event: 'whatsapp.archive_failed', code: error?.code || 'database_error' }));
            }
        }
        try {
            const { error } = await supabaseAdmin.from('message_logs').insert({
                clinic_id: config.clinicId,
                phone_number: entry.phone,
                message_content: entry.content,
                template_code: entry.templateCode,
                direction: entry.direction,
                provider: 'wawp',
                provider_id: entry.providerId,
                status: entry.status,
            });
            if (error)
                console.error(JSON.stringify({ event: 'whatsapp.log_failed', code: error.code }));
        }
        catch (error) {
            console.error(JSON.stringify({ event: 'whatsapp.log_failed', code: error?.code || 'database_error' }));
        }
    }
}
export const wawpService = new WawpService();
