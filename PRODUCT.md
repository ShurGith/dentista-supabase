# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

La web pública y el panel CRM son web responsive (`apps/web`). La app móvil (`apps/mobile`) es React Native con Expo, pero comparte producto y lenguaje con la web; no hay requisito de seguir convenciones nativas de iOS/Android por separado.

## Users

- **Personal de la clínica (usuario principal del CRM).** Trabaja con el panel en el escritorio de recepción y en consulta, durante toda la jornada. Roles existentes: `superadmin`, `admin`, `professional` (odontólogo) y `receptionist`. Su trabajo: gestionar la agenda del día, confirmar y mover citas, atender la bandeja de WhatsApp, mantener fichas de pacientes y configurar horarios y bloqueos.
  - Recepción gestiona citas, agenda, pacientes y WhatsApp, con acceso limitado o nulo al historial clínico.
  - El odontólogo ve su propia agenda, sus pacientes vinculados y las conversaciones relacionadas.
- **Pacientes y futuros pacientes.** Llegan a la web pública (o a la app móvil) para conocer la clínica, ver horarios y reservar una cita en pocos pasos, normalmente desde el móvil. Después reciben confirmaciones y recordatorios por WhatsApp y responden por ahí.

En toda la interfaz, base de datos, API y documentación se usa el término **«Paciente»** (nunca «cliente»).

## Product Purpose

Sistema integral de citas, CRM de pacientes y mensajería WhatsApp para la **Clínica Dental Eugenia**, una clínica odontológica real en Madrid. Digitaliza la captación de pacientes, la reserva de citas, la agenda de los profesionales y la comunicación por WhatsApp.

Éxito significa: menos absentismo (confirmaciones y recordatorios automáticos por WhatsApp), reservas online sin llamadas, una agenda sin solapamientos y cumplimiento estricto del RGPD con datos de salud.

## Positioning

La clínica gestiona citas y comunicación desde un único sistema propio: la agenda, la ficha del paciente y su conversación de WhatsApp están conectadas. Un «SÍ» del paciente por WhatsApp confirma la cita automáticamente en la agenda. Es una herramienta clínica y operativa, deliberadamente **sin ningún módulo económico**.

## Operating Context

- **Reserva pública en 4 pasos:** servicio → profesional y fecha con disponibilidad real → datos de contacto y aceptación RGPD → confirmación y envío de WhatsApp.
- **Agenda FullCalendar** con vistas día, semana, mes, lista y por profesional; arrastrar para mover, redimensionar para cambiar duración, clic en hueco para crear. La base de datos impide solapamientos de profesional, gabinete y bloqueos.
- **Estados de cita:** `pending`, `confirmed`, `in_waiting_room`, `completed`, `cancelled_by_patient`, `cancelled_by_clinic`, `no_show`.
- **WhatsApp vía Wawp** (pasarela no oficial, multi-dispositivo, número conectado por QR): bandeja estilo WhatsApp Web, envío manual, plantillas con variables (`{{nombre}}`, `{{fecha}}`, `{{hora}}`, `{{profesional}}`, `{{servicio}}`), recordatorios a 24 h y 2 h, webhooks de entrada y estados de entrega/lectura. Modo sandbox con simulador de mensajes entrantes para desarrollo.
- **Recursos físicos:** tres gabinetes (General, Ortodoncia, Cirugía) y un buffer de desinfección entre citas.
- **Zona horaria:** Europe/Madrid.

## Capabilities and Constraints

- **Alcance excluido (garantía estricta):** sin pasarelas de pago, prepagos, cobros, suscripciones, facturas, presupuestos, precios, tarifas, importes, descuentos, cupones, carritos, pedidos ni reembolsos. Ninguna pantalla, tabla ni texto puede mostrar precios.
- **Datos de salud y RGPD:** fichas con alergias, patologías y medicación; consentimientos versionados (tratamiento, WhatsApp, recordatorios); anonimización por derecho al olvido; auditoría. Los datos clínicos solo se muestran a quien tiene permiso.
- **Roles y permisos (RBAC)** con RLS en PostgreSQL/Supabase. La eliminación de pacientes debe ser lógica por defecto, con confirmación explícita.
- **Idioma:** español como idioma principal; arquitectura preparada para añadir más idiomas.
- **Identidad editable desde Configuración:** logo, colores, textos, horarios, teléfono, dirección y redes sociales.
- **Stack:** monorepo con React + Vite + Tailwind + FullCalendar (web), Express + TypeScript (API), Expo (móvil), Supabase/PostgreSQL 17.
- **Pendiente para producción (no está hecho):** login con Supabase Auth en web y móvil, protección de las rutas del CRM, URLs firmadas para documentos. Ver `supabase/SEGURIDAD_Y_DESPLIEGUE.md`.

## Brand Commitments

- Nombre: **Clínica Dental Eugenia**, Madrid. Dirección publicada en la web: Calle Mayor 45.
- Tono de la web pública: cercano y familiar («Cuidado dental integral para toda la familia»), con credibilidad médica.
- Ocho especialidades públicas: Limpieza y Profilaxis, Empastes y Reconstrucción, Ortodoncia Invisible, Implantes y Cirugía, Endodoncia, Odontopediatría, Estética Dental y Urgencias. Se muestran con duración estimada y beneficios, nunca con precio.

## Evidence on Hand

- Servicios, profesionales, horarios y gabinetes viven en la base de datos (`supabase/migrations/*seed*`) y la web los lee de la API.
- **Testimonios:** los tres de `apps/web/src/components/public/TestimonialsSection.tsx` (Carmen Martínez, Javier Domínguez, Beatriz Salazar) son **inventados**. No deben presentarse como reseñas reales: hay que sustituirlos por reseñas verificadas con permiso o retirarlos. No se deben inventar más.
- No hay logotipo definitivo en el repositorio; la identidad visual es editable desde Configuración.
- No hay métricas, premios, prensa ni casos reales registrados; no deben inventarse cifras («+18 años», número de pacientes, valoraciones) sin confirmarlas con la clínica.

## Product Principles

1. **Lo clínico antes que lo comercial.** Nada en el producto empuja a vender: no hay precios ni lenguaje de oferta.
2. **La agenda es la verdad.** Cualquier acción (WhatsApp, reserva pública, arrastrar en el calendario) termina en una cita válida y sin solapamientos, o falla con un motivo claro.
3. **WhatsApp es el canal del paciente.** Confirmar, recordar y responder deben poder hacerse por WhatsApp sin que el paciente instale nada.
4. **Privacidad por defecto.** Cada rol ve lo mínimo necesario; las acciones destructivas o sobre datos sensibles piden confirmación y quedan auditadas.
5. **Rápido para recepción.** Las tareas repetidas del día (confirmar, mover, contestar) se hacen en pocos clics y sin ambigüedad.

## Accessibility & Inclusion

Objetivo **WCAG 2.1 AA** en la web pública y en el panel (requisito de proyecto). Pacientes de todas las edades, incluidos mayores y familias con niños (odontopediatría).
