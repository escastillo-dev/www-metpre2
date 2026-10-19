# 🔧 SOLUCIÓN: No puedo conectarme desde el celular

## ❌ Problema Identificado

El firewall de Windows está bloqueando las conexiones entrantes en el puerto 3000, por eso no puedes acceder desde tu celular.

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Abrir PowerShell como Administrador

1. Presiona `Windows + X`
2. Selecciona "Windows PowerShell (Administrador)" o "Terminal (Administrador)"
3. Si aparece el control de cuentas de usuario, haz clic en "Sí"

### Paso 2: Agregar Regla al Firewall

Copia y pega este comando en PowerShell como administrador:

```powershell
netsh advfirewall firewall add rule name="Next.js Port 3000" dir=in action=allow protocol=TCP localport=3000
```

Deberías ver el mensaje: `Correcto.`

### Paso 3: Verificar que la Regla se Creó

```powershell
netsh advfirewall firewall show rule name="Next.js Port 3000"
```

### Paso 4: Navegar a la Carpeta del Proyecto

```powershell
cd "c:\Users\estef\Desktop\Maestria\Lenguajes Web 2\www-metpre"
```

### Paso 5: Iniciar el Servidor

```powershell
npm run start
```

Deberías ver algo como:
```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
- Network:      http://192.168.137.207:3000
```

### Paso 6: Conectarte desde el Celular

**IMPORTANTE:** Tu IP actual es: `192.168.137.207`

Abre el navegador en tu celular y ve a:
```
http://192.168.137.207:3000
```

## 🔍 Verificaciones

### 1. Verificar que tu celular está en la misma red WiFi

Tu celular debe estar conectado a la misma red WiFi que tu computadora.

### 2. Verificar la IP de tu computadora

Si la IP cambió, ejecuta en PowerShell:
```powershell
ipconfig | findstr "IPv4"
```

Busca la IP que empieza con `192.168.137.xxx`

### 3. Verificar que el servidor esté corriendo

```powershell
netstat -ano | findstr :3000
```

Deberías ver líneas con `LISTENING`

### 4. Verificar el Backend API (FastAPI)

Si el login no funciona, verifica que el backend esté corriendo:

```powershell
cd "c:\Users\estef\Desktop\Maestria\Lenguajes Web 2\www-metpre\api"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Y agrega regla de firewall para el puerto 8000:
```powershell
netsh advfirewall firewall add rule name="FastAPI Port 8000" dir=in action=allow protocol=TCP localport=8000
```

## 📱 URLs Completas

Después de configurar todo:

- **Frontend (PWA):** http://192.168.137.207:3000
- **Backend (API):** http://192.168.137.207:8000

## 🐛 Solución de Problemas

### Si aún no puedes conectarte:

1. **Desactiva temporalmente el firewall** para probar:
   ```powershell
   netsh advfirewall set allprofiles state off
   ```
   
   Si funciona, el problema es el firewall. Vuélvelo a activar:
   ```powershell
   netsh advfirewall set allprofiles state on
   ```

2. **Verifica antivirus:** Algunos antivirus bloquean conexiones de red.

3. **Reinicia el router:** A veces la tabla ARP necesita actualizarse.

4. **Verifica el archivo .env.local:**
   Debe tener:
   ```
   NEXT_PUBLIC_API_URL=http://192.168.137.207:8000
   ```

## 📝 Comandos Rápidos de Referencia

```powershell
# Ver IP actual
ipconfig | findstr "IPv4"

# Ver puertos abiertos
netstat -ano | findstr :3000

# Detener procesos Node.js
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Iniciar servidor Next.js
npm run start

# Iniciar backend FastAPI
cd api
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## ✅ Checklist de Verificación

- [ ] PowerShell ejecutado como administrador
- [ ] Regla de firewall para puerto 3000 creada
- [ ] Regla de firewall para puerto 8000 creada
- [ ] Servidor Next.js corriendo (npm run start)
- [ ] Backend FastAPI corriendo (uvicorn)
- [ ] Celular en la misma red WiFi
- [ ] IP correcta (192.168.137.207)
- [ ] .env.local configurado con IP correcta

¡Después de seguir estos pasos deberías poder conectarte desde tu celular! 🎉
