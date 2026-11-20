-- Credenciales de acceso al panel CRM (usuario + contraseña), editables desde Configuración.
-- La contraseña se guarda solo como hash scrypt generado por la API; nunca en claro.
-- Además de este usuario, la API acepta el superusuario definido en .env (SUPER_USER / SUPER_PASS).

CREATE TABLE IF NOT EXISTS public.crm_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  username VARCHAR(80) NOT NULL CHECK (char_length(btrim(username)) >= 3),
  password_hash TEXT NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_credentials IS 'Usuario y hash de contraseña del panel CRM. Solo accesible por el backend (service_role).';

-- Solo el backend (service_role, que omite RLS) puede leer o escribir: ni anon ni authenticated.
ALTER TABLE public.crm_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.crm_credentials FROM anon, authenticated;
