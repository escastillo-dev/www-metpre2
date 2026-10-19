# 📱 PWA - Guía Completa de Instalación y Uso

## 🎯 ¿Qué es una PWA?

Una **Progressive Web App (PWA)** es una aplicación web que se comporta como una aplicación nativa. Los usuarios pueden:
- ✅ Instalarla en su dispositivo móvil (Android/iOS)
- ✅ Usarla sin conexión (modo offline)
- ✅ Recibirla en la pantalla de inicio
- ✅ Experiencia de pantalla completa

---

## 🚀 PASO 1: Generar los Iconos de la App

### Método 1: Generador HTML Incluido (Recomendado)

1. Abre tu navegador y navega a:
   ```
   http://localhost:3000/generate-icons.html
   ```
   (o el puerto donde corra tu servidor de desarrollo)

2. Haz clic en los botones **"📥 Descargar"** para cada icono

3. Guarda los archivos descargados en la carpeta `public/` con estos nombres exactos:
   - `icon-192x192.png`
   - `icon-512x512.png`

### Método 2: Herramientas Online (Para logos personalizados)

Si tienes un logo de tu empresa:

1. **RealFaviconGenerator** (Recomendado)
   - Visita: https://realfavicongenerator.net/
   - Sube tu logo
   - Descarga los iconos en tamaños 192x192 y 512x512

2. **PWA Builder**
   - Visita: https://www.pwabuilder.com/imageGenerator
   - Sube tu logo
   - Genera todos los tamaños necesarios

3. **Favicon.io**
   - Visita: https://favicon.io/
   - Crea iconos desde texto o imagen
   - Descarga los tamaños requeridos

### Método 3: Scripts Automatizados (Requiere ImageMagick)

**En Windows:**
```powershell
.\generate-icons.ps1
```

**En Mac/Linux:**
```bash
chmod +x generate-icons.sh
./generate-icons.sh
```

---

## 🏗️ PASO 2: Compilar para Producción

La PWA **SOLO funciona en modo producción**, no en desarrollo.

### 2.1. Compilar el Proyecto

```bash
npm run build
```

### 2.2. Iniciar en Modo Producción

```bash
npm run start
```

La app estará disponible en: `http://localhost:3000`

---

## 📱 PASO 3: Probar la PWA en Dispositivos Móviles

### Opción A: Usando tu Red Local

1. **Obtén tu IP local:**
   
   **Windows (PowerShell):**
   ```powershell
   ipconfig
   ```
   Busca "Dirección IPv4" (ejemplo: 192.168.1.100)

   **Mac/Linux:**
   ```bash
   ifconfig | grep inet
   ```

2. **Asegúrate que tu móvil esté en la misma red WiFi**

3. **Accede desde el móvil:**
   ```
   http://TU_IP:3000
   ```
   Ejemplo: `http://192.168.1.100:3000`

### Opción B: Usando ngrok (Internet público)

1. **Instalar ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Iniciar túnel:**
   ```bash
   ngrok http 3000
   ```

3. **Copia la URL HTTPS** que te proporciona ngrok (ejemplo: `https://abc123.ngrok.io`)

4. **Accede desde cualquier dispositivo** usando esa URL

---

## 📲 PASO 4: Instalar la PWA en Android

1. **Abre Chrome en tu Android**

2. **Navega a la URL de tu app** (red local o ngrok)

3. Espera el banner "Agregar a pantalla de inicio" o:
   - Toca el menú (⋮) en la esquina superior derecha
   - Selecciona **"Agregar a pantalla de inicio"** o **"Instalar app"**

4. **Confirma la instalación**

5. **La app aparecerá en tu pantalla de inicio** como una app nativa

### Verificar Instalación en Android:

- La app debe abrir sin la barra de direcciones del navegador
- Debe tener su propio icono
- Debe verse en el drawer de aplicaciones

---

## 📲 PASO 5: Instalar la PWA en iOS (iPhone/iPad)

1. **Abre Safari** (DEBE ser Safari, no Chrome)

2. **Navega a la URL de tu app**

3. **Toca el botón Compartir** (icono de cuadrado con flecha hacia arriba)

4. **Desplázate hacia abajo** y selecciona **"Añadir a pantalla de inicio"**

5. **Edita el nombre** si deseas y toca **"Añadir"**

6. **La app aparecerá en tu pantalla de inicio**

### ⚠️ Limitaciones en iOS:

- Debe usarse Safari (no Chrome u otros navegadores)
- No aparece banner automático de instalación
- Service Workers tienen limitaciones
- El modo offline es limitado comparado con Android

---

## 🧪 PASO 6: Verificar que la PWA Funciona Correctamente

### En Chrome DevTools (Desktop):

1. Abre Chrome DevTools (F12)
2. Ve a la pestaña **"Application"** o **"Aplicación"**
3. Verifica:
   - ✅ **Manifest**: Debe mostrar todos los datos del manifest.json
   - ✅ **Service Workers**: Debe estar activo
   - ✅ **Storage**: Verifica que se pueda cachear contenido

### Lighthouse Audit:

1. En Chrome DevTools, ve a **"Lighthouse"**
2. Selecciona **"Progressive Web App"**
3. Haz clic en **"Generate report"**
4. **Objetivo: Puntaje 90+**

### Checklist PWA:

- ✅ Manifest.json configurado
- ✅ Iconos 192x192 y 512x512 disponibles
- ✅ Service Worker registrado
- ✅ HTTPS habilitado (en producción)
- ✅ Responsive design
- ✅ Installable
- ✅ Funciona offline

---

## 🚀 PASO 7: Desplegar en Producción

### Opción A: Vercel (Recomendado para Next.js)

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión:**
   ```bash
   vercel login
   ```

3. **Desplegar:**
   ```bash
   vercel --prod
   ```

4. **Vercel automáticamente:**
   - Proporciona HTTPS (requerido para PWA)
   - Optimiza el build
   - Genera una URL pública

### Opción B: Netlify

1. Conecta tu repositorio de GitHub
2. Configura el build command: `npm run build`
3. Configura el publish directory: `.next`
4. Despliega automáticamente

### Opción C: Servidor Propio

Requisitos:
- Node.js instalado
- HTTPS configurado (certificado SSL)
- Puerto 80/443 abierto

```bash
npm run build
npm run start
```

---

## 👥 PARA COLABORADORES: Cómo Instalar el Proyecto

### 1. Clonar el Repositorio

```bash
git clone [URL_DEL_REPOSITORIO]
cd www-metpre
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Generar Iconos PWA

```bash
# Windows
.\generate-icons.ps1

# Mac/Linux
./generate-icons.sh

# O manualmente:
# Abre http://localhost:3000/generate-icons.html
# y descarga los iconos
```

### 4. Configurar Variables de Entorno

Crea un archivo `.env.local` con:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

**Nota:** La PWA está deshabilitada en desarrollo. Solo funciona en producción.

### 6. Probar en Producción Local

```bash
npm run build
npm run start
```

---

## 🔧 Solución de Problemas

### El banner de instalación no aparece

**Posibles causas:**
- No estás en modo producción (la PWA está deshabilitada en desarrollo)
- No estás usando HTTPS (requerido para PWA)
- Los iconos no están en la carpeta public/
- El manifest.json tiene errores

**Solución:**
1. Ejecuta `npm run build && npm run start`
2. Verifica que los iconos existan en public/
3. Usa ngrok o despliega en Vercel para tener HTTPS

### La app no funciona offline

**Causa:** Service Worker no está registrado o cacheando.

**Solución:**
1. Verifica en DevTools > Application > Service Workers
2. Limpia el caché del navegador
3. Recarga la app

### Cambios no se reflejan en la PWA instalada

**Causa:** Service Worker está cacheando la versión antigua.

**Solución:**
1. Desinstala la PWA del dispositivo
2. Limpia el caché
3. Vuelve a instalar

### Error al compilar next.config.ts

**Causa:** TypeScript no reconoce el módulo PWA.

**Solución:**
```bash
npm install @ducanh2912/next-pwa --save-dev
```

---

## 📊 Características de la PWA Configurada

✅ **Modo Standalone:** Se abre en pantalla completa sin barra de navegación  
✅ **Iconos Optimizados:** 192x192 y 512x512 con propósito "any maskable"  
✅ **Service Worker:** Cache automático para funcionamiento offline  
✅ **Responsive:** Se adapta a cualquier tamaño de pantalla  
✅ **Offline First:** Funciona sin conexión una vez instalada  
✅ **Fast Loading:** Caché agresivo de recursos estáticos  
✅ **Auto-update:** Se actualiza automáticamente al detectar cambios  

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica el checklist PWA en DevTools
2. Revisa la consola del navegador en busca de errores
3. Asegúrate de estar en modo producción
4. Verifica que los iconos estén en public/
5. Confirma que manifest.json no tenga errores

---

## 📚 Recursos Adicionales

- [Next.js PWA Plugin](https://github.com/DuCanhGH/next-pwa)
- [PWA Builder](https://www.pwabuilder.com/)
- [Google PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN PWA Documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

**¡Listo! Tu app ahora es una PWA completamente funcional.** 🎉
