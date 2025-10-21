// Context para el estado global de autenticación
'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AuthService, { UserData, Sucursal } from '../services/AuthService';

// Tipos del estado
interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  sucursales: Sucursal[];
  loading: boolean;
  error: string | null;
}

// Tipos de acciones
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: UserData | null }
  | { type: 'SET_SUCURSALES'; payload: Sucursal[] }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'LOGOUT' }
  | { type: 'RESET_STATE' };

// Estado inicial
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  sucursales: [],
  loading: true,
  error: null
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_SUCURSALES':
      return { ...state, sucursales: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'LOGOUT':
      return { ...initialState, loading: false };
    case 'RESET_STATE':
      return { ...initialState };
    default:
      return state;
  }
}

// Context
interface AuthContextType {
  state: AuthState;
  login: (credentials: string, userId: string) => Promise<boolean>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      if (!AuthService.isAuthenticated()) {
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        dispatch({ type: 'SET_LOADING', payload: false });
        return false;
      }

      const result = await AuthService.validateCredentials();
      
      if (result.success && result.data) {
        dispatch({ type: 'SET_USER', payload: result.data.usuario });
        dispatch({ type: 'SET_SUCURSALES', payload: result.data.sucursales || [] });
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error de autenticación' });
      logout();
      return false;
    }
  };

  const login = async (credentials: string, userId: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Guardar credenciales
      localStorage.setItem('userCredentials', credentials);
      localStorage.setItem('userId', userId);

      const result = await AuthService.validateCredentials();
      
      if (result.success && result.data) {
        const userData = result.data.usuario;
        const sucursales = result.data.sucursales || [];

        // Guardar información adicional
        localStorage.setItem('userLevel', userData.idNivelUsuario.toString());
        localStorage.setItem('userName', userData.NombreUsuario);

        dispatch({ type: 'SET_USER', payload: userData });
        dispatch({ type: 'SET_SUCURSALES', payload: sucursales });
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
        
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.message });
        logout();
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error de inicio de sesión' });
      logout();
      return false;
    }
  };

  const logout = () => {
    AuthService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const refreshUserData = async () => {
    if (!state.isAuthenticated) return;
    
    try {
      const result = await AuthService.validateCredentials();
      if (result.success && result.data) {
        dispatch({ type: 'SET_USER', payload: result.data.usuario });
        dispatch({ type: 'SET_SUCURSALES', payload: result.data.sucursales || [] });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    refreshUserData,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;