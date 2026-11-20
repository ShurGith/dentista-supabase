---
name: Clínica Dental Eugenia
description: Web pública, panel CRM y app de citas de una clínica dental de Madrid; ordenada como un buen mostrador de recepción.
colors:
  brand-teal: "#0d9488"
  brand-teal-deep: "#0f766e"
  brand-teal-ink: "#115e59"
  brand-teal-bright: "#14b8a6"
  brand-mist: "#f0fdfa"
  brand-wash: "#ccfbf1"
  whatsapp-emerald: "#059669"
  whatsapp-emerald-deep: "#047857"
  whatsapp-mist: "#ecfdf5"
  ink: "#0f172a"
  ink-soft: "#334155"
  text-muted: "#64748b"
  text-faint: "#94a3b8"
  line: "#e2e8f0"
  canvas-crm: "#f1f5f9"
  canvas-public: "#f8fafc"
  paper: "#ffffff"
  alert-red: "#dc2626"
  alert-red-mist: "#fef2f2"
  caution-amber: "#d97706"
  caution-amber-mist: "#fffbeb"
  waiting-sky: "#0369a1"
  waiting-sky-mist: "#f0f9ff"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
  headline-crm:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    lineHeight: 1.43
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  body-dense:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  md: "0.5rem"
  control: "0.75rem"
  panel: "1rem"
  card: "1.5rem"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-teal}"
    textColor: "{colors.paper}"
    typography: "{typography.body-dense}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-teal-deep}"
    textColor: "{colors.paper}"
  button-primary-hero:
    backgroundColor: "{colors.brand-teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "16px 32px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp-emerald}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-whatsapp-hover:
    backgroundColor: "{colors.whatsapp-emerald-deep}"
  button-danger:
    backgroundColor: "{colors.alert-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "24px"
  chip-status-ok:
    backgroundColor: "{colors.whatsapp-mist}"
    textColor: "{colors.whatsapp-emerald}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-brand:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.brand-teal-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  nav-crm:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.text-faint}"
    typography: "{typography.body-dense}"
    width: "256px"
  nav-crm-item-active:
    backgroundColor: "{colors.brand-teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
---

# Design System: Clínica Dental Eugenia

## Overview

**Creative North Star: "El mostrador de recepción"**

Todo está a mano, ordenado y sin ruido, como en el mostrador de una clínica bien llevada. El sistema está pensado para el trabajo diario: la recepcionista confirma, mueve y contesta en pocos clics; el paciente reserva sin tener que llamar. La claridad clínica (blanco, gris pizarra, un único turquesa) transmite higiene y confianza sin frialdad.

El mismo lenguaje sirve a dos registros. La **web pública** es más amplia y cálida: titulares grandes en Plus Jakarta Sans muy pesada, el turquesa con un degradado en la palabra clave del hero y llamadas a la acción generosas. El **panel CRM** es denso y práctico: lienzo gris claro, menú lateral oscuro casi negro, tarjetas blancas muy redondeadas, texto pequeño (12 px) en negrita y etiquetas en mayúsculas espaciadas. La densidad sube en el CRM; el carácter (formas suaves, tipografía firme, un acento) no cambia.

Los componentes son suaves y seguros: esquinas muy redondeadas, bordes de 1 px gris claro, sombras mínimas y un peso tipográfico fuerte que hace el trabajo de jerarquía.

**Key Characteristics:**
- Un acento de marca (turquesa) y un acento de canal (esmeralda para WhatsApp y éxito).
- Plus Jakarta Sans en todo; la jerarquía la da el peso (bold, extrabold, black) más que el tamaño.
- Tarjetas de 24 px de radio sobre lienzo gris; controles de 12 px de radio.
- Plano por defecto: borde gris claro antes que sombra.
- CRM denso en 12 px; web pública con aire y titulares de hasta 60 px.

## Colors

Una paleta clínica de pizarra fría y blanco, con un turquesa que firma la marca y un esmeralda reservado a WhatsApp.

### Primary
El color de marca es **configurable** en *Configuración → Color principal* (tabla `settings.primary_color`). Ese color es el tono 600 y `src/brandTheme.ts` genera la paleta `brand-50…900` (mezcla con blanco/negro) en variables CSS `--brand-*` que usa Tailwind. Los valores de este documento son el turquesa por defecto. Nunca uses `teal-*` ni hex de marca fijos: usa siempre `brand-*` o `rgb(var(--brand-600))`.

- **Turquesa Clínico** (`brand-teal`): botones principales, enlaces, foco de campos, elemento activo del menú del CRM y toolbar de FullCalendar. Es la firma de la clínica.
- **Turquesa Profundo** (`brand-teal-deep`): hover de botones principales y texto de marca sobre fondos claros (chips, enlaces activos).
- **Turquesa Tinta** (`brand-teal-ink`): estado activo/pulsado (botón activo de FullCalendar).
- **Turquesa Brillante** (`brand-teal-bright`): segundo tono del degradado del titular del hero y anillo de foco de los campos.
- **Bruma Turquesa** (`brand-mist`) y **Agua Turquesa** (`brand-wash`): fondos de iconos, día de hoy en el calendario y superficies destacadas suaves.

### Secondary
- **Esmeralda WhatsApp** (`whatsapp-emerald`): todo lo que pertenece al canal WhatsApp (bandeja, burbujas salientes, botón flotante, «Simular mensaje entrante», «Enviar») y los estados de éxito o confirmación.
- **Esmeralda Profundo** (`whatsapp-emerald-deep`): hover de los botones de WhatsApp.
- **Bruma Esmeralda** (`whatsapp-mist`): fondo de chips «Disponible», «Wawp Online» y avisos de éxito.

### Neutral
- **Tinta** (`ink`): titulares, texto principal y fondo del menú lateral del CRM.
- **Pizarra** (`ink-soft`): texto de cuerpo y etiquetas de formulario.
- **Gris Secundario** (`text-muted`): descripciones y texto de apoyo.
- **Gris Tenue** (`text-faint`): metadatos, horas, placeholders y texto del menú inactivo.
- **Línea** (`line`): bordes de tarjetas, campos, tablas y separadores (habitualmente con 80 % de opacidad en tarjetas).
- **Lienzo CRM** (`canvas-crm`): fondo de todo el panel.
- **Lienzo Público** (`canvas-public`): fondo de la web pública.
- **Papel** (`paper`): tarjetas, modales, campos y cabeceras.

### Estados
- **Rojo Alerta** (`alert-red`, con `alert-red-mist`): errores, acciones destructivas y botón de confirmar en diálogos de riesgo.
- **Ámbar Aviso** (`caution-amber`, con `caution-amber-mist`): citas sin confirmar y alertas operativas.
- **Cielo Sala de Espera** (`waiting-sky`, con `waiting-sky-mist`): solo para el estado «en sala de espera».

### Named Rules
**The One Signature Rule.** El turquesa es la única voz de marca. Botones principales, enlaces y selección usan turquesa; ningún otro tono compite por la acción principal.

**The Channel Color Rule.** El esmeralda significa «WhatsApp» o «correcto». No se usa para acciones de marca que no tengan que ver con WhatsApp, ni el turquesa se usa dentro de la bandeja de WhatsApp para enviar.

**The No-Price Rule.** Ningún color, insignia ni chip se diseña para precios, descuentos u ofertas: el producto no los tiene.

## Typography

**Display Font:** Plus Jakarta Sans (con sans-serif)
**Body Font:** Plus Jakarta Sans (con sans-serif)
**Label/Mono Font:** monospace del sistema, solo para teléfonos, horas e identificadores técnicos

**Character:** Una sola familia geométrica-humanista con pesos de 300 a 800 (cargada desde Google Fonts). La jerarquía nace del peso: casi todo el texto de interfaz va en negrita y los titulares en extrabold o black.

### Hierarchy
- **Display** (800, 60 px en escritorio, 36→48→60 px por breakpoint, interlineado 1.15, tracking −0.025em): titular del hero de la web pública. La palabra clave lleva el degradado turquesa.
- **Headline** (800, 30 px, 1.2): títulos de sección de la web pública y cifras grandes de los KPIs del dashboard.
- **Headline CRM** (900, 24 px, tracking −0.025em): título de cada pantalla del CRM («Bandeja de WhatsApp (Wawp)», «Dashboard Operativo»).
- **Title** (800, 14 px): títulos de tarjeta y de bloque dentro del CRM.
- **Body** (400–500, 14 px, 1.5): texto de la web pública, campos de formulario y modales.
- **Body Dense** (500–700, 12 px): el tamaño de trabajo del CRM: filas, botones, burbujas de chat y descripciones.
- **Label** (700, 11 px, mayúsculas, tracking 0.05em): cabeceras de columna, encabezados de lista («CONVERSACIONES ACTIVAS») y etiquetas de agrupación.
- **Micro** (700, 10 px): chips de estado y horas en listas. Nunca para texto que haya que leer con atención.

### Named Rules
**The Weight-Not-Size Rule.** Para jerarquizar dentro del CRM se sube el peso (bold → extrabold → black), no el tamaño. El CRM no pasa de 24 px salvo en cifras de KPI.

**The Ten-Pixel Floor.** Nada baja de 10 px. Lo que mida 10–11 px va en negrita.

## Layout

- **Web pública:** secciones a ancho completo con contenido centrado en `max-w-7xl` (1280 px) y márgenes laterales de 16→24→32 px. Rejillas de 1 columna en móvil y de 2–4 en escritorio (servicios, equipo, testimonios). La reserva se abre en un modal de 4 pasos.
- **CRM:** menú lateral fijo de 256 px, oscuro, y área principal desplazable con 24 px de padding sobre el lienzo gris. Las pantallas combinan una cabecera (título + descripción + acciones a la derecha) y tarjetas en rejilla de 12 columnas (`lg:col-span-8` + `lg:col-span-4`, por ejemplo).
- **Bandeja de WhatsApp:** caja de altura fija (680 px) con lista de conversaciones (4/12) y chat (8/12). Cada columna desplaza por dentro; la caja no crece con el contenido.
- **Ritmo:** base de 4 px. Separación entre bloques de 24 px (`space-y-6`); dentro de tarjetas, 12–16 px; entre controles, 8 px.
- **Breakpoints:** los de Tailwind (640, 768, 1024, 1280 px). El CRM pasa a una sola columna por debajo de 768 px.

## Elevation & Depth

Plano por defecto. La profundidad se construye con lienzo gris + tarjeta blanca + borde de 1 px, y las sombras se reservan para lo que flota o para un realce de marca.

### Shadow Vocabulary
- **Reposo** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): botones principales y algunas tarjetas.
- **Realce de marca** (`box-shadow: 0 10px 15px -3px rgb(13 148 136 / 0.25)`): botón del hero y elemento activo del menú del CRM (en este último, más suave).
- **Evento de calendario** (`box-shadow: 0 1px 3px rgba(0,0,0,0.08)`, que en hover sube 1 px con `0 4px 6px -1px rgba(0,0,0,0.1)`): bloques de FullCalendar.
- **Flotante** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`): modales y diálogos, sobre un velo `rgba(15,23,42,0.5)` con desenfoque.

### Named Rules
**The Border-First Rule.** Una tarjeta se separa del fondo con su borde gris claro, no con sombra. La sombra es para lo que se mueve o flota.

## Shapes

Formas blandas y generosas: nada es recto salvo las tablas.
- **Tarjetas y paneles grandes:** 24 px (`rounded-3xl`).
- **Bloques intermedios y modales:** 16 px (`rounded-2xl`).
- **Controles** (botones, campos, elementos de menú, avisos): 12 px (`rounded-xl`). Es el radio más usado del sistema.
- **Eventos de calendario y toolbar de FullCalendar:** 6–8 px.
- **Chips, insignias, avatares y contadores:** píldora o círculo completo.
- **Burbujas de chat:** 16 px, con la esquina inferior del lado del remitente recta.
- **Bordes:** siempre de 1 px; gris claro en reposo y turquesa o rojo solo para estado.

## Components

### Buttons
Firmes y cómodos de pulsar: peso bold, esquinas de 12 px, icono a la izquierda con 6–8 px de separación.
- **Shape:** esquinas redondeadas (12 px).
- **Primary:** fondo Turquesa Clínico, texto blanco en bold de 12 px, padding 10 × 16 px, sombra de reposo. En formularios públicos sube a 14 px y 12 × 24 px.
- **Primary Hero:** 16 px de texto, padding 16 × 32 px, sombra de realce de marca y elevación de 2 px en hover.
- **Hover / Focus:** pasa a Turquesa Profundo con transición de 150 ms; deshabilitado al 50 % de opacidad.
- **Secondary:** fondo blanco, borde Línea, texto Pizarra; hover en Lienzo Público. También en versión solo icono (refrescar, eliminar), con padding de 8–10 px.
- **WhatsApp:** mismo formato que Primary, en Esmeralda WhatsApp. Solo para acciones del canal.
- **Danger:** fondo Rojo Alerta, texto blanco. Solo dentro de diálogos de confirmación; en la interfaz normal, la acción destructiva es un botón de icono neutro que se vuelve rojo en hover.

### Chips
- **Estado correcto:** fondo Bruma Esmeralda, texto Esmeralda WhatsApp, 10 px bold, píldora («Disponible», «Wawp Online», «En vivo»).
- **Marca:** fondo blanco, borde Agua Turquesa, texto Turquesa Profundo, 11 px bold.
- **Estado de cita** (11 px bold, píldora, fondo tenue + texto oscuro del mismo tono): confirmada en esmeralda, en sala de espera en cielo, completada en turquesa y pendiente (y el resto) en ámbar. En el calendario, los bloques toman su color de `APPOINTMENT_STATUS_COLORS` (`packages/shared`) o, si no, el color del profesional.

### Cards / Containers
- **Corner Style:** 24 px.
- **Background:** Papel sobre Lienzo CRM o Lienzo Público.
- **Shadow Strategy:** ninguna o la de reposo (ver Elevation & Depth).
- **Border:** 1 px Línea al 80 %.
- **Internal Padding:** 24 px (32 px en las tarjetas principales de la web en escritorio).

### Inputs / Fields
- **Style:** fondo blanco, borde 1 px Línea, radio 12 px, padding de 12 px (10 px en formularios densos), texto de 14 px (12 px en el CRM).
- **Focus:** anillo de 2 px en turquesa (`brand-teal-bright`) sin contorno del navegador; en la bandeja de WhatsApp el anillo es esmeralda.
- **Error / Disabled:** texto de ayuda en Rojo Alerta bajo el campo; deshabilitado al 50 %.

### Navigation
- **Web pública:** franja superior fina en Tinta con texto de 12 px en gris claro (horario, dirección, «Urgencias 24h» y acceso al CRM), y debajo una barra blanca de 80 px, fija al hacer scroll, al 95 % de opacidad con desenfoque y borde inferior. El logotipo es un estetoscopio blanco dentro de un cuadrado de 44 px y 12 px de radio con degradado de Turquesa Clínico a turquesa claro, junto al nombre en extrabold. Los enlaces van en semibold de 14 px y pasan a turquesa en hover. «Reservar cita» es el botón principal.
- **CRM:** menú lateral de 256 px en Tinta. Elementos de 12 px bold en Gris Tenue con icono de 16 px y padding de 12 × 14 px; en hover, texto blanco sobre pizarra oscura (`#1e293b`); el activo es una pieza de 12 px de radio en Turquesa Clínico con texto blanco y realce de marca. En la parte inferior, «Volver a la Web Pública».

### Bandeja de WhatsApp
Componente característico. Imita la lógica de WhatsApp Web sin copiar su aspecto:
- Lista de conversaciones con nombre en bold de 12 px, último mensaje truncado en Gris Secundario y hora (o fecha si no es de hoy) en micro monoespaciada. La conversación seleccionada se marca con fondo Bruma Turquesa y una barra Turquesa Clínico de 4 px a la izquierda; las demás se aclaran a blanco en hover.
- Chat sobre Lienzo CRM tenue: las burbujas salientes en Esmeralda WhatsApp con texto blanco y las entrantes en blanco con borde Línea. Los separadores de día son píldoras blancas centradas («Hoy», «Ayer», «martes, 17 nov»).
- Pie con plantillas como chips grises desplazables en horizontal y un campo con su botón «Enviar».

### Diálogos de aviso y confirmación
Modal blanco de 448 px de ancho máximo, radio 16 px, sombra flotante y velo oscuro desenfocado. Icono circular de 44 px con fondo tenue del color del tipo (rojo error, ámbar confirmación, esmeralda éxito). En las confirmaciones, el foco inicial va a «Cancelar» y la acción va en Rojo Alerta con un verbo concreto («Eliminar», no «Aceptar»).

## Do's and Don'ts

### Do:
- **Do** usar Turquesa Clínico para la acción principal de cada pantalla, una sola vez por zona.
- **Do** reservar Esmeralda WhatsApp para el canal WhatsApp y los estados de éxito.
- **Do** separar tarjetas del fondo con borde de 1 px Línea y radio de 24 px antes que con sombra.
- **Do** jerarquizar el CRM con peso tipográfico (bold, extrabold, black) a 12–14 px.
- **Do** poner etiquetas de agrupación en 11 px bold, mayúsculas y tracking de 0.05em.
- **Do** confirmar las acciones destructivas en un diálogo con el foco en «Cancelar» y el botón de acción en rojo con un verbo explícito.
- **Do** mostrar la fecha además de la hora cuando un dato no sea de hoy (lista de chats, mensajes, citas).

### Don't:
- **Don't** introducir un segundo color de marca ni usar el esmeralda para acciones que no sean de WhatsApp.
- **Don't** diseñar insignias, chips o bloques para precios, ofertas o descuentos.
- **Don't** bajar de 10 px ni usar 10–11 px sin negrita.
- **Don't** usar esquinas rectas en tarjetas, campos o botones; el radio mínimo de un control es 12 px.
- **Don't** usar clases que Tailwind 3.4 no genera (por ejemplo `shadow-2xs` o `text-slate-650`): no producen ningún estilo. Usa `shadow-sm` y `text-slate-600`.
- **Don't** dejar que una lista o un chat crezcan más que su contenedor: cada panel con altura fija desplaza por dentro.
