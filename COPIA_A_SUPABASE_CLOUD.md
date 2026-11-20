# Copia de la BD local a Supabase Cloud

## 1. Generar la copia (en tu Mac)

Desde la raíz del proyecto, en Warp:

```bash
cd /Users/juan/Webs/supabase
bash backup-db.sh
```

El script levanta el contenedor `supabase-db` si no estaba arriba, espera a
PostgreSQL y genera en `./backups/`:

- `clinica-dental-eugenia-YYYYMMDD-HHMMSS.sql` — volcado completo.
- `clinica-dental-eugenia-YYYYMMDD-HHMMSS-cloud.sql` — **este es el que se
  importa**: igual que el anterior pero sin las dos líneas que en Cloud dan
  error (`CREATE SCHEMA public;` y `\restrict ...`).
- `clinica-dental-eugenia-YYYYMMDD-HHMMSS-counts.txt` — nº de filas por tabla,
  para comprobar después que la importación trajo todo.

Se copian los esquemas `public` (toda la aplicación) y `private` (las
funciones que usan los triggers y las políticas RLS). Los esquemas internos
de Supabase (`auth`, `storage`, `realtime`, `extensions`, `vault`...) ya
existen en Cloud y NO se importan. Storage local no tiene archivos reales
(solo un `stub`), así que no hay nada que migrar de ahí.

> Los usuarios de Supabase Auth no se copian: en este proyecto el login del
> CRM es propio (`public.crm_credentials`, hash scrypt) y el login con
> Supabase Auth está pendiente (ver `PRODUCT.md`), así que no hay usuarios
> Auth que migrar.

## 2. Crear el proyecto en supabase.com

1. Entra en https://supabase.com/dashboard y crea un proyecto nuevo
   (nombre sugerido: `clinica-dental-eugenia`, región Europa, PostgreSQL 17).
2. Espera a que ponga que está listo y anota la contraseña de la base de datos
   que elijas al crearlo: la necesitarás para importar.
3. En el proyecto nuevo, ve a **Database → Extensions** y activa `uuid-ossp`
   (la migración inicial usa `uuid_generate_v4()`). Sin esto la importación
   dará error.

## 3. Importar la copia (con psql, no con el SQL Editor)

El archivo usa `COPY ... FROM stdin`, que el SQL Editor del dashboard no
soporta. Hay que importarlo con `psql` desde la terminal.

En **Project Settings → Database → Connection string** copia la cadena de
conexión directa (URI, puerto 5432, no la del pooler) y ejecuta, desde la
raíz del proyecto:

```bash
psql "postgresql://postgres.<ref-del-proyecto>:<contraseña>@<host>:5432/postgres" \
  -v ON_ERROR_STOP=1 \
  -f backups/clinica-dental-eugenia-YYYYMMDD-HHMMSS-cloud.sql
```

Sustituye el nombre del archivo por el que generó el script. La contraseña
no se escribe en ningún archivo del proyecto.

## 4. Verificar

En el SQL Editor del proyecto Cloud, comprueba que los conteos coinciden
con el archivo `-counts.txt` generado en local, por ejemplo:

```sql
SELECT count(*) FROM public.patients;
SELECT count(*) FROM public.appointments;
SELECT count(*) FROM public.whatsapp_messages;
```

Referencia de la copia del 20/11/2026 a las 14:06: 398 filas en total —
`patients: 4`, `appointments: 3`, `whatsapp_messages: 78`,
`whatsapp_contacts: 19`, `message_logs: 38`, `clinics: 1`, `services: 9`,
`professionals: 4`, `crm_credentials: 0`, `profiles: 0`.

> Nota: `audit_logs` (68) y `appointment_status_history` (4) pueden salir
> con unas filas de más en Cloud: al importar se disparan los triggers de
> auditoría y de cambio de estado. Es esperado, no es un error.

## 5. Apuntar la app a Cloud (después de importar)

Las claves locales NO valen en Cloud: en **Project Settings → API** del
proyecto nuevo copia la URL y las claves (`anon` / `service_role`, ahora
`publishable` / `secret`) y actualiza los `.env` de `apps/api` y `apps/web`
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` o sus
equivalentes). La base local de Docker sigue intacta: esta copia no la toca
ni la borra.

El login del CRM seguirá siendo el usuario definido en `.env`
(`SUPER_USER` / `SUPER_PASS`): la tabla `crm_credentials` venía vacía (0
filas), así que no hay credenciales de base de datos que migrar.
