# Caché persistente de lecturas

La aplicación conserva catálogos y búsquedas de productos en IndexedDB, con una
copia en memoria. La siguiente consulta idéntica reutiliza la respuesta vigente,
incluso al cerrar y volver a abrir la PWA con la sesión activa. No se descarga el
catálogo completo de productos: se guardan únicamente las búsquedas realizadas.

## Vigencias

- Catálogos, proveedores y búsquedas: 24 horas.
- Sucursales asignadas y niveles de usuario: 15 minutos.
- Las consultas simultáneas a la misma clave comparten una petición.
- Tras vencer, la siguiente consulta solicita una respuesta actualizada.

Las búsquedas se comparten entre Mermas, Recuperaciones, Próximos a Caducar y
Productos consumidos. Se conserva el código de barras como texto.

## Sesión y límites

Las claves incluyen el usuario y la URL de la API; no contienen contraseñas ni
credenciales. Cerrar sesión limpia la caché de lecturas, y cambiar de cuenta
también la limpia. Una petición anterior a la limpieza no vuelve a guardar su
respuesta. Las sucursales se renuevan tras validar al usuario con el servidor.

El almacenamiento está limitado a 500 respuestas. Al escribir se eliminan las
más antiguas y las mayores de 24 horas. Si IndexedDB falla o está bloqueado se
continúa con memoria y red. El navegador o el usuario pueden eliminar IndexedDB.

Esta etapa no almacena listados operativos, estadísticas ni operaciones de
registro; tampoco implementa una cola de escrituras sin conexión. Los datos
guardados solo se reutilizan mientras siguen vigentes. No hay actualización en
segundo plano de las consultas vigentes.

## Comprobación

Ejecutar `node --test tests/apiCache.test.cjs` para probar persistencia,
separación por usuario, vencimiento, peticiones simultáneas, invalidación y
limpieza con peticiones pendientes. `fake-indexeddb` se usa solo en desarrollo.

En una compilación de producción, consultar un producto y abrir el mismo código
en otro módulo: Network no debería mostrar una segunda búsqueda. Repetir tras
cerrar y abrir la PWA con la misma sesión. Cerrar sesión y entrar de nuevo debe
requerir descargar esos datos otra vez. Medir bytes transferidos antes y después
en un teléfono real para cuantificar el ahorro.
