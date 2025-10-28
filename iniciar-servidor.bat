@echo off
echo ========================================
echo INICIANDO PWA Y BACKEND
echo ========================================
echo.
echo Tu IP actual es: 192.168.137.207
echo.
echo Desde tu celular podras acceder a:
echo   http://192.168.137.207:3000
echo.
echo Presiona Ctrl+C para detener
echo.
echo ========================================
echo.

cd /d "%~dp0"
start "Next.js PWA" cmd /k "npm run start"

echo.
echo [OK] Servidor Next.js iniciado
echo.
echo IMPORTANTE: Mantén esta ventana abierta
echo.
pause
