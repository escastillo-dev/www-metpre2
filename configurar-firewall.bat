@echo off
echo ========================================
echo CONFIGURACION DE FIREWALL PARA PWA
echo ========================================
echo.
echo Este script agregara reglas al firewall de Windows
echo para permitir conexiones desde tu celular.
echo.
echo IMPORTANTE: Debes ejecutar este archivo como ADMINISTRADOR
echo (Click derecho -> Ejecutar como administrador)
echo.
pause

echo.
echo [1/2] Agregando regla para Next.js (Puerto 3000)...
netsh advfirewall firewall delete rule name="Next.js Port 3000" >nul 2>&1
netsh advfirewall firewall add rule name="Next.js Port 3000" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo [OK] Regla para puerto 3000 creada exitosamente
) else (
    echo [ERROR] No se pudo crear la regla. Ejecuta este archivo como ADMINISTRADOR
    pause
    exit /b 1
)

echo.
echo [2/2] Agregando regla para FastAPI (Puerto 8000)...
netsh advfirewall firewall delete rule name="FastAPI Port 8000" >nul 2>&1
netsh advfirewall firewall add rule name="FastAPI Port 8000" dir=in action=allow protocol=TCP localport=8000
if %errorlevel% equ 0 (
    echo [OK] Regla para puerto 8000 creada exitosamente
) else (
    echo [ERROR] No se pudo crear la regla. Ejecuta este archivo como ADMINISTRADOR
    pause
    exit /b 1
)

echo.
echo ========================================
echo CONFIGURACION COMPLETADA!
echo ========================================
echo.
echo Ahora puedes conectarte desde tu celular a:
echo.
echo   Frontend: http://192.168.137.207:3000
echo   Backend:  http://192.168.137.207:8000
echo.
echo Asegurate de que tu celular este en la misma red WiFi
echo.
pause
