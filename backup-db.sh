#!/usr/bin/env bash
# Copia de la base de datos local (Docker, contenedor supabase-db)
# para importarla en un proyecto nuevo de Supabase Cloud (supabase.com).
#
# Uso (desde la raíz del proyecto, en Warp):
#   bash backup-db.sh
#
# Genera en ./backups/:
#   clinica-dental-eugenia-YYYYMMDD-HHMMSS.sql        -> volcado completo (public + private)
#   clinica-dental-eugenia-YYYYMMDD-HHMMSS-cloud.sql  -> MISMO volcado, listo para Cloud
#   clinica-dental-eugenia-YYYYMMDD-HHMMSS-counts.txt -> nº de filas por tabla, para verificar la importación
#
# Se copian los esquemas `public` Y `private`. En `public` vive toda la
# aplicación (clinics, patients, appointments, whatsapp_messages,
# crm_credentials, ...). En `private` viven las funciones que usan los
# triggers y las políticas RLS (write_audit_log, check_appointment_overlap,
# guard_patient_soft_delete, record_appointment_status_change,
# current_user_clinic_id, has_permission, ...): sin ellas la importación
# fallaría al crear los triggers. NO se copian los esquemas internos de
# Supabase (auth, storage, realtime, _realtime, extensions, vault...): en
# Cloud ya existen y un volcado completo fallaría. Tampoco se copian
# propietarios ni privilegios (--no-owner --no-privileges).
#
# El archivo `-cloud.sql` es el que se importa (ver COPIA_A_SUPABASE_CLOUD.md).
# Difiere del volcado crudo solo en dos líneas que en Cloud dan error:
#   - `CREATE SCHEMA public;` (en Cloud el esquema public ya existe)
#   - `\restrict ...` y `\unrestrict ...` (meta-comandos de pg_dump 17, van en pareja;
#     si se quita uno hay que quitar el otro o psql da error al final)
# El volcado es para importar en un proyecto Cloud NUEVO/VACÍO. No lleva
# --clean: no borra nada. Importar con psql (COPY FROM stdin no funciona
# en el SQL Editor del dashboard).
set -euo pipefail

cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Docker no está instalado o no está en PATH." >&2; exit 1; }

echo "Levantando la base de datos local..."
docker compose up -d db

echo "Esperando a que PostgreSQL esté listo..."
for attempt in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    echo "PostgreSQL no estuvo listo después de 60 segundos." >&2
    exit 1
  fi
  sleep 1
done

mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="backups/clinica-dental-eugenia-${STAMP}.sql"
CLOUD="backups/clinica-dental-eugenia-${STAMP}-cloud.sql"
COUNTS="backups/clinica-dental-eugenia-${STAMP}-counts.txt"

echo "Volcando los esquemas public + private a ${DUMP} ..."
docker compose exec -T db pg_dump -U postgres -d postgres \
  --schema=public --schema=private --no-owner --no-privileges \
  > "${DUMP}"

echo "Generando la versión lista para Cloud en ${CLOUD} ..."
sed -e '/^CREATE SCHEMA public;$/d' -e '/^\\restrict /d' -e '/^\\unrestrict /d' "${DUMP}" > "${CLOUD}"

echo "Contando filas por tabla en ${COUNTS} ..."
docker compose exec -T db psql -U postgres -d postgres -At -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1;" \
  > /tmp/clinica-tables.txt
: > "${COUNTS}"
while read -r table; do
  n=$(docker compose exec -T db psql -U postgres -d postgres -At -c "SELECT count(*) FROM public.\"${table}\";" < /dev/null)
  echo "${table}: ${n}" | tee -a "${COUNTS}"
done < /tmp/clinica-tables.txt
rm -f /tmp/clinica-tables.txt

echo ""
echo "Copia lista:"
ls -lh "${DUMP}" "${CLOUD}" "${COUNTS}"
echo ""
echo "Importa el archivo *-cloud.sql (ver COPIA_A_SUPABASE_CLOUD.md)."
