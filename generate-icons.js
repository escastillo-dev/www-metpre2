const fs = require('fs');
const path = require('path');

console.log('🎨 Generando iconos PWA placeholder...');

// Función para crear un canvas y generar PNG
function createIconPlaceholder(size, filename) {
  // Crear SVG inline que se puede convertir fácilmente
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2368b3"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="#ffffff" opacity="0.2"/>
  <text x="${size/2}" y="${size/2 + size/8}" font-family="Arial, sans-serif" font-size="${size/3}" font-weight="bold" fill="#ffffff" text-anchor="middle">M</text>
  <text x="${size/2}" y="${size - size/6}" font-family="Arial, sans-serif" font-size="${size/11}" fill="#ffffff" text-anchor="middle" opacity="0.9">MetPre</text>
</svg>`;

  fs.writeFileSync(path.join(__dirname, 'public', filename), svg);
  console.log(`✅ ${filename} creado`);
}

createIconPlaceholder(192, 'icon-192x192.png.svg');
createIconPlaceholder(512, 'icon-512x512.png.svg');

console.log('\n⚠️  IMPORTANTE: Estos son iconos SVG temporales.');
console.log('Para crear los PNG finales, ejecuta:');
console.log('  - En Windows: .\\generate-icons.ps1');
console.log('  - En Mac/Linux: ./generate-icons.sh');
console.log('\nO usa una herramienta online como:');
console.log('  - https://realfavicongenerator.net/');
console.log('  - https://www.pwabuilder.com/imageGenerator');
