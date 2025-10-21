// Context para el estado global de la aplicación (no relacionado con auth)
'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Tipos del estado global
interface AppState {
  currentPage: string;
  notifications: Notification[];
  isLoading: boolean;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Tipos de acciones
type AppAction =
  | { type: 'SET_CURRENT_PAGE'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean };

// Estado inicial
const initialState: AppState = {
  currentPage: '',
  notifications: [],
  isLoading: false,
  theme: 'light',
  sidebarOpen: true
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'ADD_NOTIFICATION':
      const newNotification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };
      return { 
        ...state, 
        notifications: [...state.notifications, newNotification] 
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  setCurrentPage: (page: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setCurrentPage = (page: string) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  };

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    
    // Auto-remove notification after duration
    if (notification.duration !== 0) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        // This will be handled by the notification ID that gets generated
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
    localStorage.setItem('theme', theme);
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const setSidebar = (open: boolean) => {
    dispatch({ type: 'SET_SIDEBAR', payload: open });
  };

  const contextValue: AppContextType = {
    state,
    setCurrentPage,
    addNotification,
    removeNotification,
    clearNotifications,
    setLoading,
    setTheme,
    toggleSidebar,
    setSidebar
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook personalizado
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;