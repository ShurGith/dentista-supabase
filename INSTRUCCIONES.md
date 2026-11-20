# Arrancar la aplicación en local

## Metodo corto, pegar en Warp

```bash
cd /Users/juanjose/Dockers/supabase
./start-web.sh
```

Ejecuta los comandos desde la raíz del proyecto. Necesitas Node.js y npm, además de Docker activo.

## 1. Instalar dependencias y arrancar Supabase

```bash
npm install
docker compose up -d
npm run build:shared
```

Docker Compose usa el archivo `.env` de la raíz. Si no existe, copia `.env.example` como `.env` y completa sus valores antes de arrancar los servicios.

## 2. Aplicar migraciones (primera vez)

```bash
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/20261119000001_initial_schema.sql
docker exec -i supabase-db psql -U supabase_admin -d postgres < supabase/migrations/20261119000002_seed_data.sql
```

## 3. Arrancar la API

En una terminal, desde la raíz:

```bash
npm run dev:api
```

La API debería estar disponible en `http://localhost:4000` y el endpoint de estado en `http://localhost:4000/api/v1/health`.

## 4. Arrancar la aplicación web

En otra terminal, desde la raíz:

```bash
npm run dev:web
```

Abre la dirección local que indique Vite (normalmente `http://localhost:5173`).

## Detener Supabase

```bash
docker compose down
```
