# 🚀 Guía de Despliegue en Producción - Clínica Dental Eugenia

Guía para desplegar el stack completo en un servidor VPS o infraestructura cloud (Docker, Supabase, Nginx y Node.js).

---

## 🏗️ 1. Requisitos del Servidor
- Servidor VPS (Ubuntu 22.04 LTS o Debian 12)
- Mínimo 2 CPU y 4 GB de RAM
- Docker y Docker Compose instalados
- Node.js 20+ LTS y npm
- Dominio apuntando a la IP pública (ej: `clinicadentaleugenia.es` y `api.clinicadentaleugenia.es`)

---

## 🗄️ 2. Base de Datos Supabase

### Opción A: Supabase Cloud (Recomendada)
1. Crea un proyecto en [https://supabase.com](https://supabase.com).
2. En el SQL Editor, ejecuta las migraciones:
   - `supabase/migrations/20261119000001_initial_schema.sql`
   - `supabase/migrations/20261119000002_seed_data.sql`
3. Copia la URL del proyecto (`SUPABASE_URL`) y la `SERVICE_ROLE_KEY` en tus variables de entorno.

### Opción B: Self-Hosted Docker Compose (Ya configurado)
1. El proyecto ya incluye el stack `docker-compose.yml` completo con PostgreSQL 17, PostgREST, Gotrue, Storage y Envoy.
2. Inicia con:
   ```bash
   docker compose up -d
   ```

---

## ⚙️ 3. Despliegue del Backend API (`apps/api`)

1. Compila el paquete compartido y la API:
   ```bash
   npm run build:shared
   npm run build:api
   ```
2. Configura las variables de entorno en el servidor (`apps/api/.env`):
   ```env
   NODE_ENV=production
   API_PORT=4000
   CORS_ORIGIN=https://clinicadentaleugenia.es

   SUPABASE_URL=https://tu-proyecto.supabase.co
   SERVICE_ROLE_KEY=tu_clave_secreta_service_role
   ANON_KEY=tu_clave_anon

   WAWP_BASE_URL=https://api.wawp.net/v1
   WAWP_INSTANCE_ID=tu_instancia_produccion
   WAWP_API_TOKEN=tu_token_wawp_real
   WAWP_PHONE_NUMBER=+34600112233
   WAWP_WEBHOOK_SECRET=secreto_firma_segura
   WAWP_SANDBOX_MODE=false
   ```
3. Ejecuta con gestor de procesos **PM2**:
   ```bash
   npm install -g pm2
   pm2 start apps/api/dist/server.js --name "eugenia-api"
   pm2 save
   pm2 startup
   ```

---

## 💻 4. Despliegue del Frontend Web (`apps/web`)

1. Compila los assets estáticos:
   ```bash
   npm run build:web
   ```
2. El directorio generado `apps/web/dist/` contiene los archivos HTML/CSS/JS listos para ser servidos por Nginx o subidos a Vercel/Netlify.

### Configuración Nginx con SSL (Certbot)

```nginx
server {
    server_name clinicadentaleugenia.es www.clinicadentaleugenia.es;
    root /var/www/clinica-eugenia/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl http2;
    # Rutas certificados Let's Encrypt...
}
```

---

## 📱 5. App Móvil (Expo)

1. Para generar la build de producción (.apk / .ipa):
   ```bash
   cd apps/mobile
   npx eas build --platform android
   npx eas build --platform ios
   ```
2. Configura `API_BASE_URL` apuntando a tu dominio de producción `https://api.clinicadentaleugenia.es/api/v1`.

