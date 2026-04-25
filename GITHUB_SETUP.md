# 🔗 Conectar GitHub con EasyPanel

Guía paso a paso para conectar tu repositorio de GitHub a EasyPanel.

## 📦 Paso 1: Preparar el Repositorio en GitHub

### 1.1 Subir el Código a GitHub

Si aún no has subido tu código:

```bash
# Inicializa git (si no lo has hecho)
git init

# Agrega todos los archivos
git add .

# Commit inicial
git commit -m "Initial commit - SANALADAS HUB"

# Conecta con tu repositorio remoto
git remote add origin https://github.com/tu-usuario/tu-repo.git

# Sube el código
git push -u origin main
```

### 1.2 Verificar Archivos Necesarios

Asegúrate de que estos archivos estén en la raíz del repositorio:

```
tu-repo/
├── Dockerfile          ✅ (Creado)
├── nginx.conf          ✅ (Creado)
├── .dockerignore       ✅ (Creado)
├── package.json        ✅ (Existe)
├── vite.config.ts      ✅ (Existe)
├── .env.example        ✅ (Para referencia)
└── src/                ✅ (Tu código)
```

### 1.3 Crear .env.example (Para Documentación)

Crea un archivo `.env.example` con las variables necesarias (SIN valores reales):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui

# N8N Configuration (opcional)
VITE_N8N_WEBHOOK_URL=https://tu-n8n.lytrap.easypanel.host/webhook/pdf-upload
```

**⚠️ IMPORTANTE:** Nunca subas el archivo `.env` real con credenciales a GitHub.

## 🔐 Paso 2: Configurar Variables de Entorno

### 2.1 En Desarrollo Local

Tu archivo `.env` local debe contener:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_N8N_WEBHOOK_URL=https://sanaladas-n8n.lytrap.easypanel.host/webhook/pdf-upload
```

### 2.2 En Producción (EasyPanel)

Las mismas variables, pero configuradas en:
- EasyPanel > Tu App > Settings > Environment Variables

## 🚀 Paso 3: Desplegar en EasyPanel

### 3.1 Acceder a EasyPanel

1. Ve a tu instalación de EasyPanel
2. URL típica: `https://panel.tu-dominio.com` o `https://tu-vps-ip:3000`

### 3.2 Crear Nueva Aplicación

1. Click en **"Projects"** en el menú lateral
2. Click en **"+ Create"** o **"New Project"**
3. Selecciona **"App"** > **"From GitHub"**

### 3.3 Conectar GitHub

**Primera vez conectando GitHub:**

1. Click en **"Connect GitHub"**
2. Serás redirigido a GitHub
3. Autoriza EasyPanel a acceder a tu cuenta
4. Selecciona qué repositorios puede ver EasyPanel:
   - **Option A:** Todos los repositorios
   - **Option B:** Solo repositorios seleccionados (recomendado)

**Si ya conectaste GitHub antes:**

1. Selecciona tu repositorio de la lista

### 3.4 Configurar la Aplicación

```yaml
# Configuración Básica
Name: sanaladas-hub
Repository: tu-usuario/tu-repo
Branch: main
Build Method: Dockerfile

# Build Settings
Dockerfile Path: Dockerfile
Context Path: .

# Port Settings
Port: 80
Protocol: HTTP

# Environment Variables
VITE_SUPABASE_URL: https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY: eyJhbGci...
```

### 3.5 Configurar Dominio

**Opción A: Usar dominio de EasyPanel (gratis)**
```
sanaladas-hub.tu-vps.lytrap.easypanel.host
```

**Opción B: Usar tu propio dominio**

1. En EasyPanel:
   - Agrega tu dominio: `hub.sanaladas.com`
   - Activa SSL (Let's Encrypt automático)

2. En tu proveedor de DNS:
   - Crea un registro A:
     ```
     hub.sanaladas.com  →  IP_DE_TU_VPS
     ```
   - O un CNAME:
     ```
     hub.sanaladas.com  →  sanaladas-hub.tu-vps.lytrap.easypanel.host
     ```

### 3.6 Deploy Inicial

1. Click en **"Deploy"** o **"Create and Deploy"**
2. Espera el build (2-5 minutos primera vez)
3. Verifica los logs durante el build

## 🔄 Paso 4: Configurar Auto-Deploy

Para que cada push a GitHub despliegue automáticamente:

### 4.1 En EasyPanel

1. Ve a tu app > **Settings** > **GitHub**
2. Activa **"Auto Deploy from GitHub"**
3. Selecciona la rama: `main`

### 4.2 En GitHub (Opcional - Webhook)

EasyPanel proporciona una URL de webhook:

1. En EasyPanel: App > Settings > Webhooks
2. Copia la URL del webhook
3. En GitHub: Tu Repo > Settings > Webhooks > Add webhook
4. Pega la URL
5. Content type: `application/json`
6. Events: **Just the push event**
7. Save

Ahora cada `git push` desplegará automáticamente.

## 📋 Checklist de Verificación

Antes de desplegar, verifica:

- [ ] Código subido a GitHub
- [ ] `Dockerfile` en la raíz del repo
- [ ] `nginx.conf` en la raíz del repo
- [ ] `.dockerignore` en la raíz del repo
- [ ] `.env` NO subido a GitHub (está en `.gitignore`)
- [ ] `.env.example` sí está en GitHub (para documentación)
- [ ] Variables de entorno configuradas en EasyPanel
- [ ] Puerto 80 configurado en EasyPanel
- [ ] Dominio configurado (si usas uno propio)

## 🔍 Verificar el Build

Durante el build, deberías ver:

```bash
# Paso 1: Building Docker image
[+] Building 45.2s (14/14) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 789B
 => [internal] load .dockerignore
 => [builder 1/6] FROM node:20-alpine
 => [builder 2/6] WORKDIR /app
 => [builder 3/6] COPY package*.json ./
 => [builder 4/6] RUN npm ci
 => [builder 5/6] COPY . .
 => [builder 6/6] RUN npm run build
 => [stage-1 1/3] FROM nginx:alpine
 => [stage-1 2/3] COPY nginx.conf /etc/nginx/conf.d/default.conf
 => [stage-1 3/3] COPY --from=builder /app/dist /usr/share/nginx/html
 => exporting to image

# Paso 2: Starting container
Container started successfully on port 80

# Paso 3: Health check
✓ Application is healthy
```

## 🐛 Problemas Comunes

### Error: "Repository not found"

**Solución:**
1. Verifica que el repositorio existe en GitHub
2. Asegúrate de que EasyPanel tiene acceso al repo
3. Reconecta GitHub en EasyPanel

### Error: "Build failed - npm ERR!"

**Solución:**
1. Prueba el build localmente: `npm install && npm run build`
2. Verifica que `package.json` tenga todas las dependencias
3. Asegúrate de que Node 20 es compatible con tus paquetes

### Error: "Cannot read .env file"

**Solución:**
- EasyPanel NO usa archivos `.env`
- Las variables se configuran en: Settings > Environment Variables
- Asegúrate de que `.env` está en `.gitignore`

### Contenedor inicia pero la app no funciona

**Solución:**
1. Revisa los logs: App > Logs
2. Verifica las variables de entorno
3. Prueba acceder a `/health` (debería devolver "healthy")

## 📚 Recursos

- [GitHub Docs - Managing Deploy Keys](https://docs.github.com/en/developers/overview/managing-deploy-keys)
- [EasyPanel Docs](https://easypanel.io/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🎯 Próximos Pasos

Una vez desplegado:

1. ✅ Verifica que la aplicación carga
2. ✅ Prueba el login
3. ✅ Sube un PDF de prueba
4. ✅ Verifica la conexión con Supabase
5. ✅ Prueba el webhook de N8N
6. ✅ Configura SSL si usas dominio propio
7. ✅ Configura auto-deploy desde GitHub

---

**¡Listo para producción! 🚀**
