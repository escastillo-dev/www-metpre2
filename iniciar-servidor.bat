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

echo Compilando la version mas reciente...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] No fue posible compilar la aplicacion.
  pause
  exit /b 1
)

start "Next.js PWA" cmd /k "npm run start"

echo.
echo [OK] Servidor Next.js iniciado
echo.
echo IMPORTANTE: Mantén esta ventana abierta
echo.
pause
