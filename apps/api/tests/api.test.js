import test from 'node:test';
import assert from 'node:assert/strict';
import { AvailabilityService } from '../dist/modules/availability/availability.service.js';
import { WawpService } from '../dist/modules/wawp/wawp.service.js';
import { publicBookingSchema, patientSchema } from '@clinica-eugenia/shared';

test('Zod Schema: publicBookingSchema valida correctamente citas sin campos de pago', () => {
  const validBooking = {
    service_id: 'b1111111-1111-1111-1111-111111111111',
    start_time: '2026-11-20T10:00:00Z',
    first_name: 'María',
    last_name: 'López',
    phone: '+34612345678',
    email: 'maria.lopez@example.com',
    patient_notes: 'Primera revisión',
    rgpd_consent: true,
    whatsapp_consent: true,
  };

  const parsed = publicBookingSchema.parse(validBooking);
  assert.equal(parsed.first_name, 'María');
  assert.equal(parsed.phone, '+34612345678');
  assert.equal(parsed.rgpd_consent, true);
  // Verificar que no existen propiedades de pago
  assert.equal(parsed.amount, undefined);
  assert.equal(parsed.price, undefined);
});

test('Zod Schema: publicBookingSchema rechaza si no hay consentimiento RGPD', () => {
  const invalidBooking = {
    service_id: 'b1111111-1111-1111-1111-111111111111',
    start_time: '2026-11-20T10:00:00Z',
    first_name: 'María',
    last_name: 'López',
    phone: '+34612345678',
    rgpd_consent: false,
  };

  assert.throws(() => {
    publicBookingSchema.parse(invalidBooking);
  });
});

test('WawpService: En modo sandbox simula envíos correctamente', async () => {
  const service = new WawpService();
  const res = await service.sendMessage({
    phoneNumber: '+34600112233',
    text: 'Test de prueba Clínica Dental Eugenia',
  });

  assert.equal(res.success, true);
  assert.equal(res.status, 'sent');
  assert.equal(res.sandbox, true);
  assert.ok(res.messageId?.startsWith('wawp_sim_'));
});

test('WawpService: Webhook procesa mensajes entrantes y auto-confirma citas', async () => {
  const service = new WawpService();
  const webhookResult = await service.handleWebhook({
    event: 'message.incoming',
    data: {
      id: `wawp_test_${Date.now()}`,
      from: '34611223344',
      body: 'SÍ, confirmo mi asistencia',
      type: 'text',
    },
  });

  assert.equal(webhookResult.status, 'processed_incoming_message');
});
