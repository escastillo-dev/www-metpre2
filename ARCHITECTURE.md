# Arquitectura de la Aplicación

## Resumen

Esta aplicación implementa una arquitectura moderna con Next.js 15 que incluye:

- **Service Layer**: Centraliza todas las llamadas a la API
- **Repository Pattern**: Encapsula el acceso a datos
- **Custom Hooks**: Extraen lógica repetitiva de componentes
- **Context API**: Maneja el estado global de la aplicación

## Estructura de Archivos

```
app/
├── context/
│   ├── AuthContext.tsx       # Estado global de autenticación
│   ├── AppContext.tsx        # Estado global de la aplicación
│   └── index.ts              # Barrel exports
├── services/
│   ├── BaseApiService.ts     # Servicio base para API
│   ├── AuthService.ts        # Manejo de autenticación
│   ├── SucursalesService.ts  # Manejo de sucursales
│   ├── MovimientosService.ts # Manejo de movimientos
│   └── AperturaCierresService.ts # Manejo de aperturas/cierres
├── hooks/
│   ├── useMovimientos.ts     # Hook para movimientos
│   ├── useAperturaCierres.ts # Hook para aperturas/cierres
│   ├── useSucursales.ts      # Hook para sucursales
│   └── index.ts              # Barrel exports
└── components/
    └── ExampleComponent.tsx  # Ejemplo de uso
```

## Service Layer

### BaseApiService

Servicio base que proporciona:

- Configuración centralizada de headers de autenticación
- Manejo unificado de errores
- Métodos CRUD estándar (GET, POST, PUT, DELETE)
- Transformación de respuestas a formato consistente

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
```

### Servicios Específicos

Cada dominio tiene su propio servicio que extiende BaseApiService:

- **AuthService**: Validación de credenciales, manejo de usuarios
- **SucursalesService**: Gestión de sucursales asignadas
- **MovimientosService**: CRUD de movimientos de valores
- **AperturaCierresService**: Gestión de registros de apertura/cierre

## Context API

### AuthContext

Maneja el estado global de autenticación:

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  sucursales: Sucursal[];
  loading: boolean;
  error: string | null;
}
```

**Acciones disponibles:**
- `login()`: Iniciar sesión
- `logout()`: Cerrar sesión
- `refreshUserData()`: Actualizar datos del usuario
- `checkAuthStatus()`: Verificar estado de autenticación

### AppContext

Maneja el estado global de la aplicación:

```typescript
interface AppState {
  currentPage: string;
  notifications: Notification[];
  isLoading: boolean;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}
```

**Acciones disponibles:**
- `addNotification()`: Agregar notificación
- `setLoading()`: Controlar estado de carga
- `setTheme()`: Cambiar tema
- `toggleSidebar()`: Alternar sidebar

## Custom Hooks

### useMovimientos

Hook para manejo de movimientos de valores:

```typescript
const {
  movimientos,           // Lista de movimientos
  loading,              // Estado de carga
  error,                // Error actual
  loadMovimientos,      // Cargar movimientos
  createMovimiento,     // Crear nuevo movimiento
  loadIncidencias,      // Cargar incidencias
  refreshData,          // Recargar datos
  clearError,           // Limpiar errores
  resetState           // Resetear estado
} = useMovimientos();
```

### useAperturaCierres

Hook para manejo de registros de apertura/cierre:

```typescript
const {
  registros,            // Lista de registros
  stats,                // Estadísticas calculadas
  loading,              // Estado de carga
  error,                // Error actual
  loadRegistros,        // Cargar registros
  createRegistro,       // Crear nuevo registro
  calculateStats,       // Calcular estadísticas
  getFilteredRecords,   // Filtrar registros
  refreshData,          // Recargar datos
  clearError,           // Limpiar errores
  resetState           // Resetear estado
} = useAperturaCierres();
```

### useSucursales

Hook para manejo de sucursales:

```typescript
const {
  sucursales,           // Lista de sucursales
  loading,              // Estado de carga
  error,                // Error actual
  loadSucursales,       // Cargar sucursales
  getSucursalName,      // Obtener nombre de sucursal
  isSucursalAsignada,   // Verificar asignación
  getSucursalesIds,     // Obtener IDs como string
  clearError,           // Limpiar errores
  resetState           // Resetear estado
} = useSucursales();
```

## Uso en Componentes

### Ejemplo Básico

```typescript
'use client';

import { useAuth, useApp } from '../context';
import { useMovimientos } from '../hooks';

export default function MyComponent() {
  // Context hooks
  const { state: authState, logout } = useAuth();
  const { addNotification } = useApp();
  
  // Custom hooks
  const {
    movimientos,
    loading,
    error,
    loadMovimientos,
    createMovimiento
  } = useMovimientos();

  // Effects
  useEffect(() => {
    if (authState.isAuthenticated) {
      loadMovimientos();
    }
  }, [authState.isAuthenticated, loadMovimientos]);

  // Handlers
  const handleCreate = async (data) => {
    const success = await createMovimiento(data);
    if (success) {
      addNotification({
        type: 'success',
        message: 'Movimiento creado exitosamente'
      });
    }
  };

  // Render
  return (
    <div>
      {/* Componente JSX */}
    </div>
  );
}
```

## Beneficios de la Arquitectura

### 1. Separación de Responsabilidades
- **Servicios**: Manejo de API y lógica de datos
- **Hooks**: Lógica de estado y efectos
- **Componentes**: Solo lógica de presentación
- **Context**: Estado global compartido

### 2. Reutilización de Código
- Los hooks pueden usarse en múltiples componentes
- Los servicios encapsulan lógica de API
- Los contexts proporcionan estado global

### 3. Mantenibilidad
- Código organizado por responsabilidades
- Fácil testing de cada capa por separado
- Cambios en API solo afectan servicios

### 4. Escalabilidad
- Nuevos dominios solo requieren nuevo servicio + hook
- Contextos modulares para diferentes aspectos
- Patrones consistentes en toda la aplicación

### 5. Debugging
- Errores centralizados en servicios
- Estado predecible con Context API
- Notificaciones consistentes
- Logging estructurado

## Próximos Pasos

1. **Implementar Tests**: Unit tests para servicios y hooks
2. **Error Boundaries**: Manejo de errores a nivel de componente
3. **Performance**: Memoización y optimizaciones
4. **Offline Support**: Cache y sincronización
5. **Real-time**: WebSockets para updates en vivo

## Patrones de Uso Recomendados

### 1. Inicialización de Datos
```typescript
useEffect(() => {
  if (authState.isAuthenticated) {
    loadData();
  }
}, [authState.isAuthenticated, loadData]);
```

### 2. Manejo de Errores
```typescript
if (error) {
  return <ErrorComponent error={error} onClear={clearError} />;
}
```

### 3. Loading States
```typescript
if (loading) {
  return <LoadingSpinner />;
}
```

### 4. Notificaciones
```typescript
const handleAction = async () => {
  const success = await performAction();
  addNotification({
    type: success ? 'success' : 'error',
    message: success ? 'Acción exitosa' : 'Error en la acción'
  });
};
```

Esta arquitectura proporciona una base sólida, escalable y mantenible para el desarrollo de la aplicación.