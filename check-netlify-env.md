# Configurar Variables de Entorno en Netlify

Tu aplicación funciona localmente pero no en producción porque faltan las variables de entorno en Netlify.

## Pasos para configurar en Netlify:

1. **Accede a tu sitio en Netlify**
   - Ve a https://app.netlify.com
   - Selecciona tu sitio

2. **Configura las variables de entorno**
   - Ve a: **Site configuration** → **Environment variables**
   - Haz clic en **Add a variable** o **Add variables** (si es la primera vez)

3. **Agrega estas 4 variables:**

   **Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://wfbdxxpegggmbvfoteml.supabase.co`

   **Variable 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4`

   **Variable 3:**
   - Key: `SUPABASE_URL`
   - Value: `https://wfbdxxpegggmbvfoteml.supabase.co`

   **Variable 4:**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5ODAxNCwiZXhwIjoyMDczMDc0MDE0fQ.emLJjfXkf1g_1E1aH9eKQWAZGPuwJ_3bwBhRvwJN-m8`

   **Variable 5 (opcional, para deploy desde este proyecto):**
   - Key: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmR4eHBlZ2dnbWJ2Zm90ZW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTgwMTQsImV4cCI6MjA3MzA3NDAxNH0.DjJNPiAz6O7Qhpvs8MKmj4uMs_6QXVSRtepfgc_a9y4`

4. **Guarda los cambios**

5. **Redeploy del sitio**
   - Ve a: **Deploys** → **Trigger deploy**
   - Selecciona: **Clear cache and deploy site**

## Verificar que funcionó:

Una vez completado el deploy, puedes verificar que las variables están configuradas visitando:
`https://tu-sitio.netlify.app/api/check-env`

Deberías ver todas las variables marcadas como ✅ Configurada.

## Importante:

- Las variables que empiezan con `VITE_` son para el frontend (React)
- Las variables sin `VITE_` son para las funciones serverless (API)
- Ambas son necesarias para que la aplicación funcione completamente
