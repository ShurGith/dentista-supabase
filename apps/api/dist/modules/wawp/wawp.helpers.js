export function normalizeWawpPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(digits))
        throw new Error('El teléfono debe incluir el prefijo internacional.');
    return digits;
}
export function getWawpMessageId(id) {
    if (typeof id === 'string')
        return id;
    if (!id || typeof id !== 'object')
        return undefined;
    const value = id;
    return typeof value._serialized === 'string' ? value._serialized : typeof value.id === 'string' ? value.id : undefined;
}
export function getWawpAckStatus(ack) {
    return ack === 3 ? 'read' : ack === 2 ? 'delivered' : ack === 1 ? 'sent' : undefined;
}
/**
 * true si MODO_DEV impide enviar a este número. Compara solo dígitos con prefijo internacional.
 * Sin número de pruebas válido, en MODO_DEV se bloquea todo (falla cerrado).
 */
export function isBlockedByDevMode(recipientDigits, devMode, devPhoneDigits) {
    if (!devMode)
        return false;
    if (!devPhoneDigits)
        return true;
    return recipientDigits.replace(/\D/g, '') !== devPhoneDigits.replace(/\D/g, '');
}
/** true si el mensaje es anterior a la fecha de corte del historial (WAWP_HISTORY_SINCE). */
export function isBeforeHistoryCutoff(sentAt, historySince) {
    if (!historySince)
        return false;
    return Date.parse(sentAt) < Date.parse(historySince);
}
export function renderTemplate(body, variables) {
    return Object.entries(variables).reduce((text, [key, value]) => {
        if (!/^[a-z][a-z0-9_]*$/i.test(key))
            return text;
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'), () => value);
    }, body);
}
