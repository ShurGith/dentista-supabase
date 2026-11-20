#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

command -v ngrok >/dev/null || { echo "ngrok no está instalado o no está en PATH." >&2; exit 1; }
if ! ngrok_url="$(node -e 'const url=require("dotenv").config().parsed?.WAWP_TUNNEL_URL; if (!url) process.exit(1); console.log(new URL(url).origin)')"; then
  echo "Define una URL válida en WAWP_TUNNEL_URL dentro de .env para iniciar ngrok." >&2
  exit 1
fi

if [ ! -x node_modules/.bin/vite ]; then
  npm install
fi

docker compose up -d
npm run build:shared
npm run build:api

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

# La migración inicial crea políticas sin IF NOT EXISTS; solo se aplica a una BD vacía.
if ! docker compose exec -T db psql -U postgres -d postgres -tAc \
  "SELECT to_regclass('public.clinics') IS NOT NULL" | grep -q t; then
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
    < supabase/migrations/20261119000001_initial_schema.sql
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
    < supabase/migrations/20261119000002_seed_data.sql
fi

npm --workspace=apps/api run start &
api_pid=$!
echo "Iniciando ngrok en ${ngrok_url}..."
ngrok http 4000 --url "$ngrok_url" --log stdout &
ngrok_pid=$!
npm run dev:web &
web_pid=$!

cleanup() {
  kill "$api_pid" "$web_pid" "$ngrok_pid" 2>/dev/null || true
  wait "$api_pid" "$web_pid" "$ngrok_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "API, web y ngrok iniciados. Pulsa Ctrl+C para detenerlos."
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null && kill -0 "$ngrok_pid" 2>/dev/null; do
  sleep 1
done

wait "$api_pid" || status=$?
wait "$web_pid" || status=$?
exit "${status:-1}"
