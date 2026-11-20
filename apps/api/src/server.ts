import { app } from './app.js';
import { config } from './config/index.js';
import { remindersService } from './modules/reminders/reminders.service.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`
  ══════════════════════════════════════════════════════════
  🏥 CLÍNICA DENTAL EUGENIA - BACKEND API MODULAR
  ══════════════════════════════════════════════════════════
  🚀 Servidor activo en: http://localhost:${config.port}
  📡 Endpoints base:    http://localhost:${config.port}/api/v1/health
  💬 WhatsApp Wawp:     ${config.wawp.sandboxMode ? 'MODO SANDBOX (Simulador local)' : 'PRODUCCIÓN CONECTADA'}
  🧪 MODO_DEV:          ${config.wawp.devMode ? `ACTIVO · solo se envía al número terminado en ${config.wawp.devPhoneNumber.slice(-4) || '— (ninguno: todo bloqueado)'}` : 'desactivado'}
  🔒 Restricción:       CERO PAGOS / CERO TRANSACCIONES ECONÓMICAS
  ══════════════════════════════════════════════════════════
  `);

  // Programar verificación periódica de recordatorios de citas cada 10 minutos
  setInterval(async () => {
    try {
      console.log('[Cron Job] Ejecutando comprobación periódica de recordatorios WhatsApp...');
      await remindersService.runDueReminders();
    } catch (e) {
      console.error('[Cron Job Error]', e);
    }
  }, 10 * 60 * 1000);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor HTTP con elegancia...');
  server.close(() => process.exit(0));
});

