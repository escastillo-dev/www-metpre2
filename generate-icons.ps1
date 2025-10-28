# Script PowerShell para generar iconos PWA

Write-Host "🎨 Generando iconos PWA..." -ForegroundColor Cyan

# Verificar si ImageMagick está instalado
$magickPath = Get-Command magick -ErrorAction SilentlyContinue

if ($magickPath) {
    Write-Host "Convirtiendo SVG a PNG..." -ForegroundColor Yellow
    
    # Convertir icon-192x192.svg a PNG
    & magick convert -background none -resize 192x192 public/icon-192x192.svg public/icon-192x192.png
    Write-Host "✅ icon-192x192.png generado" -ForegroundColor Green
    
    # Convertir icon-512x512.svg a PNG
    & magick convert -background none -resize 512x512 public/icon-512x512.svg public/icon-512x512.png
    Write-Host "✅ icon-512x512.png generado" -ForegroundColor Green
    
    Write-Host "🎉 Iconos PWA generados exitosamente!" -ForegroundColor Green
} else {
    Write-Host "❌ ImageMagick no está instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones para generar los iconos:" -ForegroundColor Yellow
    Write-Host "1. Instalar ImageMagick desde: https://imagemagick.org/script/download.php"
    Write-Host "2. Usar herramientas online gratuitas:"
    Write-Host "   - https://realfavicongenerator.net/"
    Write-Host "   - https://www.pwabuilder.com/imageGenerator"
    Write-Host "   - https://favicon.io/"
    Write-Host ""
    Write-Host "Instrucciones:" -ForegroundColor Cyan
    Write-Host "1. Abre una de las herramientas online"
    Write-Host "2. Sube tu logo o usa el SVG generado en public/"
    Write-Host "3. Descarga los iconos en tamaños 192x192 y 512x512"
    Write-Host "4. Guárdalos como icon-192x192.png y icon-512x512.png en public/"
}
