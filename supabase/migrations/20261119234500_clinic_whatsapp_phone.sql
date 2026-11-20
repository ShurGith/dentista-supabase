-- Número de WhatsApp de contacto público de la clínica (botón flotante, enlaces wa.me de la web).
-- Se rellena con el teléfono de urgencias, que es el que la web usaba hasta ahora para WhatsApp.
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(50);
UPDATE public.clinics SET whatsapp_phone = emergency_phone WHERE whatsapp_phone IS NULL;
COMMENT ON COLUMN public.clinics.whatsapp_phone IS 'WhatsApp público de contacto (formato internacional). Se edita en Configuración.';
