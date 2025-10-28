#!/usr/bin/env node

/**
 * Script de Verificación PWA
 * Verifica que todos los archivos necesarios estén presentes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración PWA...\n');

const checks = [];
let allPassed = true;

// Función auxiliar para verificar archivos
function checkFile(filePath, description) {
  const exists = fs.existsSync(path.join(process.cwd(), filePath));
  checks.push({ description, exists, filePath });
  if (!exists) allPassed = false;
  return exists;
}

// Verificar archivos de configuración
console.log('📋 Archivos de Configuración:');
checkFile('next.config.ts', 'Configuración Next.js con PWA');
checkFile('public/manifest.json', 'Manifest.json');
checkFile('app/layout.tsx', 'Layout con metadata PWA');

console.log('');

// Verificar iconos
console.log('🎨 Iconos PWA:');
const icon192 = checkFile('public/icon-192x192.png', 'Icono 192x192 PNG');
const icon512 = checkFile('public/icon-512x512.png', 'Icono 512x512 PNG');

console.log('');

// Verificar documentación
console.log('📚 Documentación:');
checkFile('PWA-QUICK-START.md', 'Quick Start Guide');
checkFile('PWA-GUIA-INSTALACION.md', 'Guía de Instalación');
checkFile('PWA-DOCUMENTACION-TECNICA.md', 'Documentación Técnica');
checkFile('PWA-RESUMEN-COMPLETO.md', 'Resumen Completo');

console.log('');

// Verificar generadores
console.log('🛠️  Herramientas:');
checkFile('public/generate-icons.html', 'Generador de Iconos HTML');
checkFile('generate-icons.ps1', 'Script PowerShell');
checkFile('generate-icons.sh', 'Script Bash');

console.log('');

// Mostrar resultados
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 RESULTADOS:\n');

checks.forEach(check => {
  const status = check.exists ? '✅' : '❌';
  const color = check.exists ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}${status}${reset} ${check.description}`);
  if (!check.exists) {
    console.log(`   ⚠️  Falta: ${check.filePath}`);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Verificar package.json
console.log('📦 Verificando dependencias...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasPWA = packageJson.devDependencies && packageJson.devDependencies['@ducanh2912/next-pwa'];

if (hasPWA) {
  console.log('✅ @ducanh2912/next-pwa instalado');
} else {
  console.log('❌ @ducanh2912/next-pwa NO instalado');
  console.log('   Ejecuta: npm install @ducanh2912/next-pwa --save-dev');
  allPassed = false;
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Advertencias sobre iconos
if (!icon192 || !icon512) {
  console.log('⚠️  ADVERTENCIA: Faltan iconos PNG\n');
  console.log('Opciones para generar iconos:');
  console.log('1. Abrir: http://localhost:3000/generate-icons.html');
  console.log('2. Ejecutar: .\\generate-icons.ps1 (Windows)');
  console.log('3. Ejecutar: ./generate-icons.sh (Mac/Linux)');
  console.log('4. Usar: https://realfavicongenerator.net/\n');
}

// Próximos pasos
console.log('🚀 PRÓXIMOS PASOS:\n');

if (!icon192 || !icon512) {
  console.log('1. Generar iconos PNG (ver opciones arriba)');
  console.log('2. Compilar: npm run build');
  console.log('3. Iniciar: npm run start');
  console.log('4. Probar: http://localhost:3000');
} else {
  console.log('1. Compilar: npm run build');
  console.log('2. Iniciar: npm run start');
  console.log('3. Probar: http://localhost:3000');
  console.log('4. Verificar en DevTools > Application');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Resultado final
if (allPassed && icon192 && icon512) {
  console.log('✅ ¡TODO LISTO! Tu PWA está configurada correctamente.\n');
  console.log('Para más información, consulta:');
  console.log('- PWA-QUICK-START.md (inicio rápido)');
  console.log('- PWA-GUIA-INSTALACION.md (guía completa)');
  console.log('- PWA-RESUMEN-COMPLETO.md (resumen y próximos pasos)\n');
} else {
  console.log('⚠️  Hay elementos pendientes. Revisa los archivos marcados arriba.\n');
}

process.exit(allPassed ? 0 : 1);
