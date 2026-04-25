# 🚀 Guía de Despliegue en EasyPanel

Esta guía te ayudará a desplegar la aplicación SANALADAS HUB en tu VPS usando EasyPanel.

## 📋 Prerequisitos

1. **VPS con EasyPanel instalado**
   - Acceso al panel de EasyPanel
   - Docker instalado (viene con EasyPanel)

2. **Repositorio GitHub**
   - Tu código debe estar en un repositorio de GitHub
   - Asegúrate de que los archivos `Dockerfile` y `nginx.conf` están en la raíz del repo

3. **Variables de Entorno**
   - `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` - Clave anónima de Supabase
   - `VITE_N8N_WEBHOOK_URL` - URL del webhook de N8N (opcional)

## 🔧 Paso 1: Preparar el Repositorio GitHub

1. **Sube los archivos al repositorio:**
   ```bash
   git add Dockerfile nginx.conf .dockerignore
   git commit -m "Add Docker configuration for EasyPanel deployment"
   git push origin main
   ```

2. **Verifica que los archivos estén en la raíz del repositorio**

## 🎯 Paso 2: Crear la Aplicación en EasyPanel

### 2.1 Acceder a EasyPanel

1. Ve a tu panel de EasyPanel (ej: `https://tu-dominio.lytrap.easypanel.host`)
2. Inicia sesión con tus credenciales

### 2.2 Crear un Nuevo Proyecto

1. Haz clic en **"Create Project"** o **"+ New"**
2. Selecciona **"From GitHub"**

### 2.3 Configurar el Repositorio

1. **Connect GitHub:**
   - Autoriza EasyPanel a acceder a tu cuenta de GitHub
   - Selecciona tu repositorio

2. **Configuración Básica:**
   - **Name:** `sanaladas-hub` (o el nombre que prefieras)
   - **Branch:** `main` (o la rama que uses)
   - **Build Method:** `Dockerfile`
   - **Dockerfile Path:** `Dockerfile` (ya está en la raíz)

### 2.4 Configurar Variables de Entorno

En la sección **Environment Variables**, agrega:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

**⚠️ IMPORTANTE:** Estas variables deben tener el prefijo `VITE_` para que Vite las incluya en el build.

### 2.5 Configurar el Puerto

1. **Port:** `80` (el que expone Nginx en el Dockerfile)
2. **Protocol:** `HTTP`

### 2.6 Configurar el Dominio (Opcional)

1. En **Domains**, puedes agregar:
   - Un subdominio de EasyPanel: `sanaladas-hub.tu-vps.lytrap.easypanel.host`
   - Tu propio dominio: `hub.sanaladas.com`

2. Si usas tu propio dominio:
   - Crea un registro A en tu DNS apuntando a la IP de tu VPS
   - O un registro CNAME apuntando al dominio de EasyPanel

## 🚀 Paso 3: Desplegar

1. Haz clic en **"Deploy"** o **"Create"**
2. EasyPanel:
   - Clonará tu repositorio
   - Construirá la imagen Docker usando tu Dockerfile
   - Desplegará el contenedor
   - Lo expondrá en el puerto 80

3. **Espera a que termine el build** (puede tardar 2-5 minutos la primera vez)

## ✅ Paso 4: Verificar el Despliegue

1. Ve a la URL de tu aplicación
2. La aplicación debería cargar correctamente
3. Verifica que:
   - El login funciona
   - Puedes conectar con Supabase
   - Los pedidos se cargan correctamente

## 🔄 Actualizaciones Automáticas

EasyPanel puede configurarse para:

1. **Auto-deploy desde GitHub:**
   - Ve a Settings > GitHub
   - Activa **"Auto Deploy"**
   - Cada push a `main` desplegará automáticamente

2. **Webhooks:**
   - EasyPanel proporciona una URL de webhook
   - Agrégala a tu repositorio en GitHub > Settings > Webhooks

## 🐛 Solución de Problemas

### Error: "Build failed"

**Causa:** Error durante el build de npm.

**Solución:**
```bash
# Verifica que el proyecto compile localmente
npm install
npm run build

# Si funciona, sube los cambios
git push origin main
```

### Error: "Container crashed"

**Causa:** Nginx no puede iniciar o encuentra un error.

**Solución:**
1. Revisa los logs en EasyPanel > Logs
2. Verifica que `nginx.conf` esté correctamente configurado

### Error: "Environment variables not loaded"

**Causa:** Las variables de entorno no están disponibles en tiempo de build.

**Solución:**
1. Verifica que todas las variables tengan el prefijo `VITE_`
2. En EasyPanel, ve a Settings > Environment
3. Asegúrate de que las variables estén guardadas
4. Haz un rebuild: Deploy > Rebuild

### La aplicación carga pero Supabase no funciona

**Causa:** Variables de entorno incorrectas.

**Solución:**
1. Verifica las credenciales en tu proyecto Supabase
2. Copia la URL y la clave anónima exactas
3. Actualiza en EasyPanel > Settings > Environment
4. Rebuild la aplicación

## 📊 Monitoreo

EasyPanel proporciona:

1. **Logs en Tiempo Real:**
   - Ve a tu app > Logs
   - Puedes ver tanto los logs de build como de runtime

2. **Métricas:**
   - CPU y memoria usada
   - Tráfico de red
   - Tiempo de respuesta

3. **Health Checks:**
   - EasyPanel revisa automáticamente `/health`
   - Si falla, reinicia el contenedor

## 🔐 Seguridad

### SSL/HTTPS

EasyPanel configura automáticamente SSL usando Let's Encrypt:

1. Ve a tu app > Domains
2. Activa **"Enable SSL"**
3. EasyPanel obtendrá y configurará el certificado automáticamente

### Firewall

El VPS debería tener solo estos puertos abiertos:
- `80` (HTTP)
- `443` (HTTPS)
- `22` (SSH - solo para administración)

## 📝 Comandos Útiles

### Ver Logs en Tiempo Real
En EasyPanel: App > Logs > Live Logs

### Reiniciar la Aplicación
En EasyPanel: App > Actions > Restart

### Rebuild desde Cero
En EasyPanel: App > Deploy > Rebuild

### Escalar (si necesitas más recursos)
En EasyPanel: App > Settings > Resources
- Aumenta CPU/RAM si la app es lenta
- Reduce si no usas todos los recursos

## 🎓 Recursos Adicionales

- [Documentación de EasyPanel](https://easypanel.io/docs)
- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Nginx](https://nginx.org/en/docs/)

## 💡 Tips

1. **Primera vez desplegando:**
   - El primer build puede tardar 5-10 minutos
   - Los siguientes builds serán más rápidos (gracias a la caché de Docker)

2. **Variables de entorno:**
   - Nunca las subas a GitHub
   - Siempre configúralas en EasyPanel

3. **Backups:**
   - EasyPanel no hace backup de tu código (está en GitHub)
   - Pero sí hace backup de configuraciones y datos
   - Supabase ya tiene backups automáticos

4. **Performance:**
   - Nginx sirve los archivos estáticos muy rápido
   - Si necesitas más velocidad, considera usar un CDN

## ❓ Soporte

Si tienes problemas:

1. Revisa los logs en EasyPanel
2. Verifica que las variables de entorno estén correctas
3. Prueba hacer un rebuild completo
4. Consulta la documentación de EasyPanel

---

**¡Listo! Tu aplicación SANALADAS HUB debería estar funcionando en producción. 🎉**
