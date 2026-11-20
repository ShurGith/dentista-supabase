# 📱 Guía de Integración WhatsApp con Wawp (https://wawp.net/en)

Guía completa para la configuración y operación de la pasarela de WhatsApp **Wawp** en **Clínica Dental Eugenia**.

---

## 🌐 1. ¿Qué es Wawp?
Wawp ([https://wawp.net/en](https://wawp.net/en)) es una plataforma de mensajería API para WhatsApp que permite conectar un número de teléfono mediante código QR (multi-dispositivo) para:
- Enviar mensajes y notificaciones transaccionales automáticas.
- Recibir mensajes entrantes de pacientes vía Webhook.
- Enviar plantillas con variables dinámicas.
- Sincronizar estados de entrega (`sent`, `delivered`, `read`).

---

## ⚙️ 2. Variables de Entorno en el Backend (`apps/api/.env`)

```env
# Configuración oficial de Wawp
WAWP_BASE_URL=https://api.wawp.net/v1
WAWP_INSTANCE_ID=tu_instance_id_en_wawp
WAWP_API_TOKEN=tu_api_token_secreto
WAWP_PHONE_NUMBER=+34600112233
WAWP_WEBHOOK_SECRET=tu_clave_secreta_para_firmar_webhooks

# Modo Sandbox: pon en 'true' para desarrollo local sin consumir saldo real
WAWP_SANDBOX_MODE=true
```

---

## 🧪 3. Modo Sandbox (Simulador Local)

Cuando `WAWP_SANDBOX_MODE=true`:
1. El backend **no realiza peticiones externas a Wawp** ni consume saldo.
2. Cada envío se imprime en la consola del servidor con formato visual a color:
   ```
   ════════════════════════════════════════════════════════════
   📱 [WAWP SIMULATOR - MODO SANDBOX ACTIVO]
   Destinatario: +34611223344
   Mensaje:
   👋 Hola Laura, confirmamos tu cita en Clínica Dental Eugenia...
   Plantilla: cita_confirmada
   ════════════════════════════════════════════════════════════
   ```
3. El mensaje se almacena en la tabla `message_logs` y `whatsapp_messages` como `sent`.
4. En el panel CRM puedes usar el botón **"Simular Mensaje Entrante"** para simular la respuesta de un paciente (por ejemplo respondiendo "SÍ").

---

## 🔗 4. Configuración del Webhook en Wawp (Producción)

En el panel de control de Wawp:
1. Dirígete a tu instancia -> **Webhooks**.
2. Configura la URL del webhook de la clínica:
   ```
   https://api.tudominio.com/api/v1/whatsapp/webhook
   ```
3. Eventos obligatorios a activar:
   - `message.incoming` (o `messages.upsert`): Mensajes enviados por pacientes.
   - `message.status` (o `messages.update`): Estados de lectura y entrega.
4. Cabecera de autenticación / firma: Configura tu `WAWP_WEBHOOK_SECRET`.

---

## 📝 5. Plantillas de WhatsApp Oficiales de la Clínica

| Código | Título | Variables Soportadas |
|---|---|---|
| `cita_confirmada` | Confirmación de nueva cita | `{{nombre}}`, `{{fecha}}`, `{{hora}}`, `{{profesional}}`, `{{servicio}}`, `{{enlace_gestion}}` |
| `recordatorio_24h` | Recordatorio 24 horas antes | `{{nombre}}`, `{{fecha}}`, `{{hora}}`, `{{profesional}}`, `{{servicio}}`, `{{enlace_confirmar}}` |
| `recordatorio_2h` | Recordatorio 2 horas antes | `{{nombre}}`, `{{hora}}` |
| `cita_reprogramada` | Notificación de cambio de hora | `{{nombre}}`, `{{fecha}}`, `{{hora}}`, `{{profesional}}` |
| `cita_cancelada` | Confirmación de cancelación | `{{nombre}}`, `{{fecha}}`, `{{hora}}` |
| `seguimiento_post` | Seguimiento post-tratamiento | `{{nombre}}` |

---

## ⚡ 6. Lógica de Confirmación Automática de Citas

Cuando el Webhook recibe un mensaje de un paciente cuyo contenido es:
- `SÍ`, `SI`, `CONFIRMAR` o `OK`

El servicio `wawp.service.ts`:
1. Identifica al paciente por su número de teléfono.
2. Localiza su cita más próxima en estado `pending`.
3. Actualiza el estado a `confirmed`.
4. El cambio se refleja en tiempo real en el calendario visual y en el CRM.

