# 🚀 Quick Start - PWA en 5 Minutos

## ⚡ Inicio Rápido

### 1️⃣ Generar Iconos (1 minuto)

```bash
# Opción A: Abrir generador HTML
# Navega a: http://localhost:3000/generate-icons.html
# Descarga icon-192x192.png y icon-512x512.png
# Guárdalos en public/

# Opción B: Usar herramienta online
# Visita: https://realfavicongenerator.net/
# Sube tu logo y descarga los iconos
```

### 2️⃣ Compilar (2 minutos)

```bash
npm run build
npm run start
```

### 3️⃣ Probar en Móvil (2 minutos)

**Opción rápida - Red local:**
```bash
# 1. Ver tu IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# 2. Abrir en móvil (misma WiFi)
http://TU_IP:3000
```

**Opción rápida - Internet público:**
```bash
# Instalar ngrok
npm install -g ngrok

# Crear túnel
ngrok http 3000

# Usar URL HTTPS en móvil
```

---

## 📱 Instalar en Móvil

### Android (Chrome)
1. Abre la URL en Chrome
2. Toca "Agregar a pantalla de inicio"
3. ✅ Listo!

### iOS (Safari)
1. Abre la URL en Safari
2. Toca botón Compartir
3. "Añadir a pantalla de inicio"
4. ✅ Listo!

---

## ✅ Verificar que Funciona

1. Abre Chrome DevTools (F12)
2. Ve a "Application" > "Manifest"
3. Debe mostrar: ✅ "Installable"
4. Service Workers debe estar activo

---

## 🆘 Solución Rápida de Problemas

| Problema | Solución |
|----------|----------|
| No aparece banner instalación | ¿Estás en producción? `npm run build && npm run start` |
| Iconos no se ven | Verifica que existan en `public/icon-*.png` |
| No funciona offline | Visita la app con conexión primero |
| Cambios no se reflejan | Desinstala la app y reinstala |

---

## 📖 Documentación Completa

- [Guía de Instalación Completa](./PWA-GUIA-INSTALACION.md)
- [Documentación Técnica](./PWA-DOCUMENTACION-TECNICA.md)

---

**¡Eso es todo! Tu PWA está lista.** 🎉
