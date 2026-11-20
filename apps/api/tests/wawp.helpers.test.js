import test from 'node:test';
import assert from 'node:assert/strict';
import { getWawpAckStatus, getWawpMessageId, isBeforeHistoryCutoff, isBlockedByDevMode, normalizeWawpPhone, renderTemplate } from '../dist/modules/wawp/wawp.helpers.js';

test('normalizes international phone numbers for Wawp chat IDs', () => {
  assert.equal(normalizeWawpPhone('+34 600 112 233'), '34600112233');
  assert.throws(() => normalizeWawpPhone('600 11'), /prefijo internacional/);
});

test('reads documented message IDs and acknowledgement states', () => {
  assert.equal(getWawpMessageId({ _serialized: 'true_123@c.us_abcd' }), 'true_123@c.us_abcd');
  assert.equal(getWawpMessageId({ id: 'message-1' }), 'message-1');
  assert.equal(getWawpAckStatus(1), 'sent');
  assert.equal(getWawpAckStatus(2), 'delivered');
  assert.equal(getWawpAckStatus(3), 'read');
  assert.equal(getWawpAckStatus(0), undefined);
});

test('substitutes template values without interpreting unknown keys as patterns', () => {
  assert.equal(renderTemplate('Hola {{nombre}}: {{fecha}}', { nombre: 'Ana', fecha: 'mañana', '.*': 'ignored' }), 'Hola Ana: mañana');
  assert.equal(renderTemplate('Hola {{nombre}}', { nombre: '$&' }), 'Hola $&');
});

test('skips Wawp history older than the configured cutoff', () => {
  const since = '2026-11-19T00:00:00+01:00';
  assert.equal(isBeforeHistoryCutoff('2026-11-18T22:59:59.000Z', since), true);
  assert.equal(isBeforeHistoryCutoff('2026-11-18T23:00:00.000Z', since), false);
  assert.equal(isBeforeHistoryCutoff('2026-11-19T10:00:00.000Z', since), false);
  assert.equal(isBeforeHistoryCutoff('2020-01-01T00:00:00.000Z', undefined), false);
});

test('MODO_DEV only lets messages through to the dev phone', () => {
  assert.equal(isBlockedByDevMode('34611223344', false, ''), false);
  assert.equal(isBlockedByDevMode('34611223344', true, '34611223344'), false);
  assert.equal(isBlockedByDevMode('34699999999', true, '34611223344'), true);
  assert.equal(isBlockedByDevMode('34611223344', true, ''), true);
});
