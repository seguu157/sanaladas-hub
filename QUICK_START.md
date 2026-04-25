# ⚡ Guía Rápida - Desplegar en 5 Minutos

## 🎯 Resumen Ultra-Rápido

```bash
# 1. Sube el código a GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Ve a EasyPanel → Create App → From GitHub
# 3. Configura variables de entorno (ver abajo)
# 4. Deploy!
```

## 📝 Variables de Entorno Requeridas

Configura en EasyPanel > Settings > Environment:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔧 Configuración EasyPanel (Resumen)

| Campo | Valor |
|-------|-------|
| **Name** | `sanaladas-hub` |
| **Repository** | `tu-usuario/tu-repo` |
| **Branch** | `main` |
| **Build Method** | `Dockerfile` |
| **Port** | `80` |
| **Protocol** | `HTTP` |

## ✅ Verificación Rápida

Después del deploy:

1. ✅ Abre la URL de tu app
2. ✅ Deberías ver la pantalla de login
3. ✅ Inicia sesión con tus credenciales
4. ✅ Sube un PDF de prueba
5. ✅ ¡Listo!

## 🐛 Si Algo Falla

```bash
# Ver logs
EasyPanel > Tu App > Logs

# Rebuild
EasyPanel > Tu App > Deploy > Rebuild

# Verificar variables
EasyPanel > Tu App > Settings > Environment
```

## 📚 Documentación Completa

- `DESPLIEGUE_EASYPANEL.md` - Guía detallada paso a paso
- `GITHUB_SETUP.md` - Configuración de GitHub y auto-deploy

---

**Tiempo estimado: 5-10 minutos** ⏱️
