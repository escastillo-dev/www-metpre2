# 🔧 PWA - Documentación Técnica

## 📋 Configuración Implementada

### 1. Dependencias Instaladas

```json
{
  "devDependencies": {
    "@ducanh2912/next-pwa": "^latest"
  }
}
```

**¿Por qué @ducanh2912/next-pwa?**
- Compatible con Next.js 15.x
- Soporte para App Router
- Mantenimiento activo
- Mejor rendimiento que alternativas

---

### 2. Configuración Next.js (next.config.ts)

```typescript
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",                          // Directorio de salida del SW
  cacheOnFrontEndNav: true,                // Cache en navegación
  aggressiveFrontEndNavCaching: true,      // Cache agresivo
  reloadOnOnline: true,                    // Recargar al reconectar
  swcMinify: true,                         // Minificación con SWC
  disable: process.env.NODE_ENV === "development", // Solo en producción
  workboxOptions: {
    disableDevLogs: true,                  // Sin logs en desarrollo
  },
});

export default withPWA(nextConfig);
```

**Características clave:**
- ✅ PWA deshabilitada en desarrollo
- ✅ Cache automático de recursos
- ✅ Minificación optimizada
- ✅ Recarga automática al reconectar

---

### 3. Manifest.json

Ubicación: `public/manifest.json`

```json
{
  "name": "WWW MetPre - Sistema de Gestión",
  "short_name": "MetPre",
  "description": "Sistema de gestión de mermas, valores y operaciones",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2368b3",
  "orientation": "portrait-primary",
  "icons": [...]
}
```

**Propiedades importantes:**

| Propiedad | Valor | Descripción |
|-----------|-------|-------------|
| `display` | `standalone` | Pantalla completa sin barra de navegación |
| `theme_color` | `#2368b3` | Color de la barra de estado |
| `start_url` | `/` | URL inicial al abrir la app |
| `orientation` | `portrait-primary` | Orientación preferida |

---

### 4. Metadata en Layout (app/layout.tsx)

```typescript
export const metadata: Metadata = {
  applicationName: "WWW MetPre",
  title: {
    default: "WWW MetPre - Sistema de Gestión",
    template: "%s - WWW MetPre",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WWW MetPre",
  },
  // ...
};

export const viewport: Viewport = {
  themeColor: "#2368b3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

**Elementos críticos:**
- `manifest`: Enlace al archivo manifest.json
- `appleWebApp`: Configuración específica para iOS
- `viewport`: Configuración responsive

---

### 5. Iconos PWA

Ubicación: `public/`

Archivos requeridos:
- `icon-192x192.png` (192x192px)
- `icon-512x512.png` (512x512px)

**Especificaciones:**
```json
{
  "src": "/icon-192x192.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "any maskable"
}
```

**Purpose "any maskable":**
- `any`: Funciona en todos los contextos
- `maskable`: Se adapta a formas de iconos de diferentes sistemas

---

### 6. Service Worker Generado

El plugin genera automáticamente en `public/`:

- `sw.js` - Service Worker principal
- `workbox-*.js` - Workbox runtime
- `sw.js.map` - Source map para debugging

**Configuración automática:**
- Cache-first strategy para assets estáticos
- Network-first para rutas de API
- Fallback offline para páginas

---

## 🔍 Estrategias de Cache

### Assets Estáticos
```
Cache Strategy: Cache-First
```
- Imágenes, CSS, JS se cachean permanentemente
- Mejora velocidad de carga significativamente

### Rutas de API
```
Cache Strategy: Network-First con Fallback
```
- Intenta red primero
- Si falla, usa cache
- Garantiza datos frescos cuando hay conexión

### Páginas HTML
```
Cache Strategy: Network-First
```
- Siempre intenta obtener versión fresca
- Fallback a cache si offline

---

## 📱 Compatibilidad

### ✅ Android
- Chrome 80+
- Samsung Internet 10+
- Edge Mobile
- Firefox Mobile 85+

**Funcionalidades:**
- ✅ Instalación desde banner
- ✅ Modo standalone completo
- ✅ Service Workers completos
- ✅ Notificaciones push
- ✅ Funcionalidad offline completa

### ⚠️ iOS
- Safari 11.3+
- Chrome/Firefox (limitado)

**Funcionalidades:**
- ✅ Instalación manual (Add to Home Screen)
- ⚠️ Service Workers limitados
- ❌ Sin banner de instalación automático
- ⚠️ Modo offline limitado
- ❌ Sin notificaciones push

---

## 🚀 Optimizaciones Implementadas

### 1. Lazy Loading
```typescript
// Componentes se cargan solo cuando se necesitan
const MermasContent = dynamic(() => import('./components/MermasContent'));
```

### 2. Code Splitting
```typescript
// Next.js automáticamente divide el código por rutas
// Cada página es un chunk separado
```

### 3. Image Optimization
```jsx
// Usar Next.js Image component
import Image from 'next/image';
<Image src="/icon.png" width={192} height={192} alt="Icon" />
```

### 4. Minificación
```typescript
// SWC minification habilitada en next.config.ts
swcMinify: true
```

---

## 🔒 Seguridad

### HTTPS Requerido
Las PWAs **REQUIEREN HTTPS** en producción (excepto localhost).

**Razones:**
- Service Workers solo funcionan en HTTPS
- Previene ataques man-in-the-middle
- Requerimiento de estándar web

**Soluciones:**
- Vercel/Netlify: HTTPS automático
- Let's Encrypt: Certificados SSL gratuitos
- Cloudflare: SSL gratuito con proxy

---

## 📊 Métricas y Performance

### Core Web Vitals Targets

| Métrica | Target | Descripción |
|---------|--------|-------------|
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |

### Lighthouse PWA Checklist

- ✅ Installable
- ✅ Works offline
- ✅ Configured for custom offline page
- ✅ Themed
- ✅ Has viewport meta tag
- ✅ Uses HTTPS
- ✅ Redirects HTTP to HTTPS
- ✅ Service worker registered
- ✅ Manifest valid

---

## 🛠️ Debugging

### Chrome DevTools

1. **Application Tab**
   ```
   - Manifest: Ver configuración
   - Service Workers: Estado y cache
   - Storage: Ver datos cacheados
   ```

2. **Network Tab**
   ```
   - Filtrar por "Service Worker"
   - Ver qué se sirve desde cache
   ```

3. **Console**
   ```javascript
   // Ver Service Worker activo
   navigator.serviceWorker.ready.then(reg => console.log(reg));
   
   // Forzar actualización
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   ```

### Comandos Útiles

```bash
# Limpiar cache de Next.js
rm -rf .next

# Limpiar cache de npm
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Build limpio
npm run build

# Verificar Service Worker generado
ls public/sw*
```

---

## 🔄 Ciclo de Actualización

### Cómo se Actualizan las PWAs

1. **Usuario abre la app**
2. Service Worker verifica nuevas versiones
3. Si hay cambios, descarga nueva versión en background
4. Nueva versión se activa en próxima apertura

### Forzar Actualización Inmediata

```typescript
// En tu código
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.update();
  });
}
```

---

## 📦 Build y Deployment

### Build Local

```bash
# 1. Asegurar iconos existan
ls public/icon-*.png

# 2. Build producción
npm run build

# 3. Verificar archivos generados
ls public/sw*

# 4. Iniciar servidor
npm run start

# 5. Probar en http://localhost:3000
```

### Vercel Deployment

```bash
# Instalar CLI
npm i -g vercel

# Deploy
vercel --prod

# Vercel automáticamente:
# - Ejecuta npm run build
# - Genera SW correctamente
# - Proporciona HTTPS
# - Optimiza imágenes
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] App se puede instalar (banner aparece)
- [ ] Iconos correctos en pantalla de inicio
- [ ] Abre en modo standalone (sin barra de navegación)
- [ ] Funciona offline después de primera visita
- [ ] Service Worker se registra correctamente
- [ ] Manifest.json es válido
- [ ] Theme color se aplica correctamente
- [ ] Responsive en diferentes tamaños

### Automated Testing

```bash
# Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=http://localhost:3000
```

---

## 🐛 Problemas Comunes

### 1. Service Worker no se registra

**Síntomas:** No aparece en DevTools > Application

**Solución:**
```bash
# Verificar que estás en producción
echo $NODE_ENV  # Debe ser "production"

# Rebuild
npm run build
npm run start
```

### 2. Iconos no aparecen

**Síntomas:** Icono genérico o vacío

**Solución:**
```bash
# Verificar iconos existan
ls public/icon-*.png

# Deben ser exactamente:
# icon-192x192.png
# icon-512x512.png

# Regenerar si es necesario
# Abre http://localhost:3000/generate-icons.html
```

### 3. App no funciona offline

**Síntomas:** Pantalla blanca sin conexión

**Solución:**
1. Visita la app con conexión primero
2. Navega por todas las páginas importantes
3. Desconecta internet
4. Recarga la página

### 4. Cambios no se reflejan

**Síntomas:** Ver versión antigua tras actualizar

**Solución:**
```javascript
// Desregistrar Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

// Limpiar cache
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// Recargar
location.reload(true);
```

---

## 📈 Roadmap Futuro

### Características Planeadas

- [ ] Push Notifications
- [ ] Background Sync
- [ ] Offline Form Submissions
- [ ] Share Target API
- [ ] Periodic Background Sync
- [ ] App Shortcuts
- [ ] File Handling

---

## 📚 Referencias

- [Next PWA Documentation](https://github.com/DuCanhGH/next-pwa)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Última actualización:** Octubre 2025  
**Versión Next.js:** 15.5.4  
**Versión PWA Plugin:** @ducanh2912/next-pwa latest
