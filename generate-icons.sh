#!/bin/bash

# Script para generar iconos PWA en formato PNG
# Requiere ImageMagick instalado: https://imagemagick.org/script/download.php

echo "🎨 Generando iconos PWA..."

# Convertir icon-192x192.svg a PNG
if command -v magick &> /dev/null; then
    magick convert -background none -resize 192x192 public/icon-192x192.svg public/icon-192x192.png
    echo "✅ icon-192x192.png generado"
    
    magick convert -background none -resize 512x512 public/icon-512x512.svg public/icon-512x512.png
    echo "✅ icon-512x512.png generado"
    
    echo "🎉 Iconos PWA generados exitosamente!"
else
    echo "❌ ImageMagick no está instalado."
    echo "Por favor instálalo desde: https://imagemagick.org/script/download.php"
    echo ""
    echo "Alternativamente, puedes usar herramientas online:"
    echo "1. https://realfavicongenerator.net/"
    echo "2. https://www.pwabuilder.com/imageGenerator"
    echo "3. https://favicon.io/"
fi
