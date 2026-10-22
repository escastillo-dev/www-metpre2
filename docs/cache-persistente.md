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

Las operaciones de registro no se almacenan en caché y no hay cola de escrituras
sin conexión. Los datos guardados solo se reutilizan mientras siguen vigentes.
No hay actualización en segundo plano de las consultas vigentes.

## Listados y estadísticas

`operationalCache.ts` conserva lecturas durante cinco minutos por usuario, API,
módulo, filtros y página. Se aplica a Mermas, Próximos a Caducar, Recuperaciones,
Productos consumidos, Aperturas/Cierres, Valores y el dashboard. Cada vista muestra
su última fecha de actualización y un botón para forzar una consulta. El reloj de
la interfaz no provoca consultas de red.

Una escritura confirmada invalida todas las páginas del módulo afectado y, cuando
corresponde, los resúmenes del dashboard. Cerrar un caso con merma también invalida
Mermas. Los otros módulos y los catálogos conservan su caché. Se renueva la vista
actual por su flujo normal; no se descargan paneles ocultos.

Cuando vence una lectura, el cliente reutiliza su ETag (o Last-Modified) para
preguntar si cambió. Un 304 conserva el cuerpo local y renueva su fecha. Sin estos
encabezados funciona con una descarga normal. El botón Actualizar elimina las
copias del módulo y solicita una respuesta nueva.

## Backend y publicación

Los cambios de API están en el repositorio `Proyecto ManejoValores`:

- Mermas acepta `limit` (1–200), `offset`, `fecha_inicio` y `fecha_fin`. Sin limit
  mantiene compatibilidad con clientes anteriores.
- Devuelve `total` y `resumen` del conjunto filtrado completo, aunque la página
  contenga solo 20 registros. Los detalles solo se descargan al abrir una merma.
- Próximos a Caducar utiliza su paginación existente, con 50 casos por página.
- La API añade ETag a lecturas operativas exitosas y comprime respuestas grandes.
  La validación ETag reduce bytes transferidos; todavía ejecuta autorización y SQL.

Publicar primero el backend y después el frontend permite aprovechar de inmediato
los resúmenes y la paginación de Mermas. Con una API anterior el cliente conserva
el cálculo desde detalles (cacheados), sin suponer que existen resúmenes nuevos.
No hay cambios de esquema ni migraciones de base de datos.

## Comprobación

Ejecutar `node --test tests/apiCache.test.cjs tests/operationalCache.test.cjs tests/mermas-summary.test.cjs` para probar persistencia,
separación por usuario, vencimiento, peticiones simultáneas, invalidación y
limpieza con peticiones pendientes. `fake-indexeddb` se usa solo en desarrollo.

En una compilación de producción, consultar un producto y abrir el mismo código
en otro módulo: Network no debería mostrar una segunda búsqueda. Repetir tras
cerrar y abrir la PWA con la misma sesión. Cerrar sesión y entrar de nuevo debe
requerir descargar esos datos otra vez. Medir bytes transferidos antes y después
en un teléfono real para cuantificar el ahorro.
