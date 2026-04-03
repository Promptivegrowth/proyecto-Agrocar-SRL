# Variables de Entorno - Agrocar SRL

Estas son las variables que deberás configurar en **Vercel** para que la app pase a producción.
Las variables que empiezan con `NEXT_PUBLIC_` serán expuestas al cliente, las demás se mantienen seguras en el backend (Edge Functions/API Routes).

```env
# Supabase (Obligatorias)
NEXT_PUBLIC_SUPABASE_URL=https://ktvpoafwopcybuvbtmme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# SUNAT — Facturación electrónica directa (Reemplazar con datos reales)
SUNAT_RUC=20123456789
SUNAT_USUARIO_SOL=USUARI01
SUNAT_CLAVE_SOL=misuperclave
SUNAT_CERTIFICADO_PFX_BASE64=... (el archivo .pfx codificado en base64)
SUNAT_CERTIFICADO_PASSWORD=clavecert
SUNAT_URL=https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService
SUNAT_URL_BETA=https://e-beta.sunat.gob.pe/ol-ti-itcpfegem/billService
SUNAT_MODO=beta # (cambiar a produccion para emitir validez legal)

# Google Maps (Obligatoria para tracking y PWA)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```
