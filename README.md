# 🏥 Clínica Dental Eugenia — Sistema Integral de Citas, CRM y WhatsApp

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-3ecf8e.svg)](https://supabase.com/)
[![Wawp](https://img.shields.io/badge/WhatsApp-Wawp%20API-25d366.svg)](https://wawp.net/en)
[![Strict Scope](https://img.shields.io/badge/Economía-Cero%20Pagos-red.svg)](#-alcance-excluido-garantía-estricta)

Sistema profesional, seguro y escalable diseñado para la gestión integral de citas odontológicas, expedientes clínicos y comunicación automatizada por WhatsApp para la **Clínica Dental Eugenia** (Madrid).

---

## 🚫 ALCANCE EXCLUIDO (GARANTÍA ESTRICTA)

> **AVISO DE ARQUITECTURA**: Por requerimiento explícito del proyecto, la aplicación **NO INCLUYE** pasarelas de pago (Stripe, Redsys, PayPal), prepagos, cobros, suscripciones, facturas, presupuestos económicos, precios, tarifas, importes, descuentos, cupones, carritos, pedidos ni reembolsos.
> El sistema está enfocado exclusivamente en la **excelencia médica, captación de pacientes, agenda inteligente con FullCalendar, reducción del absentismo con WhatsApp (Wawp) y cumplimiento RGPD**.

---

## 🏗️ Arquitectura del Monorepo

```
.
├── apps/
│   ├── web/           # Frontend Web: Landing Page + Panel CRM (React + Vite + Tailwind + FullCalendar)
│   ├── api/           # Backend API Modular (Node.js + Express + TypeScript)
│   └── mobile/        # App Móvil (React Native con Expo para pacientes y personal)
├── packages/
│   ├── shared/        # DTOs, Schemas Zod, Enums y Tipos comunes en TypeScript
│   └── ui/            # Componentes de diseño compartidos
├── supabase/
│   ├── migrations/    # Migraciones SQL (Tablas, RLS, Triggers de no-solapamiento)
│   │   ├── 20261119000001_initial_schema.sql
│   │   └── 20261119000002_seed_data.sql
│   └── seed/
├── docs/              # Documentación exhaustiva del sistema
│   ├── ARCHITECTURE.md
│   ├── DATABASE_MODEL.md
│   ├── WAWP_INTEGRATION.md
│   └── DEPLOYMENT_GUIDE.md
```

---

## 🚀 Inicio Rápido en Local

### 1. Requisitos Previos
- **Node.js** v20+ o v22+ y **npm**
- **Docker** activo (para el contenedor Supabase PostgreSQL)

### 2. Base de Datos Supabase (PostgreSQL 17)
Si estás usando el entorno Supabase Docker local incluido:
```bash
# Iniciar servicios de base de datos
docker compose up -d

# Aplicar las migraciones del sistema médico:
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/20261119000001_initial_schema.sql
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/20261119000002_seed_data.sql
```

### 3. Compilación del Paquete Compartido
```bash
npm run build:shared
```

### 4. Iniciar el Backend API (`apps/api`)
```bash
cd apps/api
npm run build
npm start
# -> Servidor activo en http://localhost:4000
# -> Endpoints base en http://localhost:4000/api/v1/health
```

### 5. Iniciar la Aplicación Web (`apps/web`)
En una nueva terminal:
```bash
cd apps/web
npm run dev
# -> Aplicación disponible en http://localhost:5173
```

---

## 🖥️ Módulos de la Aplicación

### 🌐 Parte 1 — Web Pública de la Clínica
- **Hero & Propuesta de Valor**: *"Cuidado dental integral para toda la familia"*, botones CTA a Reserva, WhatsApp y Teléfono.
- **Tratamientos (8 Especialidades)**: Limpieza y Profilaxis, Empastes y Reconstrucción, Ortodoncia Invisible, Implantes y Cirugía, Endodoncia, Odontopediatría, Estética Dental y Urgencias. *Duraciones clínicas estimadas y beneficios (estrictamente sin precios).*
- **Equipo Facultativo**: Fichas de odontólogos colegiados, especialidades e idiomas.
- **Horarios Públicos Dinámicos**: Obtenidos en tiempo real del endpoint de la clínica (`/api/v1/schedules/public`) con días de apertura, pausas y festivos próximos.
- **Reserva de Cita en 4 Pasos**:
  1. Elección de servicio.
  2. Elección de especialista y fecha con cálculo de disponibilidad médica en tiempo real.
  3. Datos de contacto y aceptación de políticas RGPD.
  4. Confirmación instantánea y envío de WhatsApp mediante Wawp.
- **Testimonios, Preguntas Frecuentes y Contacto**: Mapa en Calle Mayor 45 (Madrid), horarios de guardia y botón flotante de WhatsApp.

### 📅 Parte 2 — Panel CRM & Agenda Médica
- **Dashboard Operativo**: Citas de hoy, ocupación de sillones dentales, pacientes en sala de espera y alertas clínicas.
- **Agenda Interactiva FullCalendar (Sección 4.1)**:
  - Vistas: Día, Semana, Mes, Lista y Recursos/Profesionales.
  - Bloques con color por estado y especialista.
  - Arrastrar y soltar (`eventDrop`) con validación y revert si hay solapamiento.
  - Redimensionamiento de duración (`eventResize`).
  - Creación rápida de cita con clic en hueco libre (`dateClick`).
  - Modal de detalle: Confirmar, Marcar en Sala de Espera, Completar, Cancelar con motivo y botón directo "Enviar WhatsApp con Wawp".
- **Gestión de Pacientes**: CRUD completo, búsqueda avanzada, historial médico (alergias, patologías, medicación), consentimientos y botón de **Anonimización por derecho al olvido (RGPD)**.
- **Gestión de Horarios y Bloqueos (Sección 4.2)**: Configuración de horarios de apertura, descansos y bloqueos de agenda con justificación.
- **Bandeja de Conversaciones WhatsApp (Wawp)**:
  - Estilo WhatsApp Web con listado de chats e historial completo.
  - Envío manual de respuestas y plantillas predefinidas con variables (`{{nombre}}`, `{{fecha}}`, `{{hora}}`, etc.).
  - Simulador local de mensajes entrantes para probar webhooks y auto-confirmaciones sin consumir saldo.
- **Configuración**: Identidad visual (colores, logo, textos), reglas de reserva (antelación mínima, buffer de limpieza) y credenciales de Wawp.

### 📱 Parte 3 — App Móvil (Expo / React Native)
- Ubicada en `apps/mobile/`.
- Permite a los pacientes consultar próximas citas, reservar en 1 minuto, solicitar cancelaciones y chatear por WhatsApp.
- Modo médico para consulta de la agenda diaria del odontólogo.

---

## 🧪 Pruebas Automatizadas

El backend incluye tests unitarios para validación de esquemas Zod, motor de disponibilidad y simulación Wawp:
```bash
node --test apps/api/tests/api.test.js
```

---

## 🗺️ Plan de Desarrollo por Fases

- [x] **Fase 1 (MVP Actual Entregado)**:
  - Web pública premium y responsive con SEO estructurado.
  - Motor de reserva pública con validación de disponibilidad.
  - Base de datos relacional PostgreSQL con RLS y trigger de anti-solapamiento.
  - Panel CRM completo con FullCalendar interactivo (drop, resize, modales).
  - Integración completa con Wawp (mensajes, plantillas, webhooks y simulador).
  - Horarios públicos dinámicos y bloqueos de agenda.
  - App móvil React Native con Expo.
- [ ] **Fase 2 (Próxima)**:
  - Odontograma visual interactivo para historial clínico.
  - Firma biométrica digital de consentimientos informados en tableta.
- [ ] **Fase 3**:
  - Multi-clínica para franquicias o sucursales adicionales.
  - Campañas masivas de recordatorio de revisión anual vía Wawp.
