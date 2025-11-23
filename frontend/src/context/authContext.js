import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Verificar autenticación al cargar la app
  useEffect(() => {
    checkAuth();
  }, []);

  // Login
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);
      return user;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  // Logout - limpia sesión Y resetea el reproductor
  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Intentar cerrar sesión en el servidor, pero SOLO si tenemos token
    if (refreshToken) {
      try {
        // Silenciar completamente los errores de logout
        await axios.post(`${API_URL}/auth/logout`, { refreshToken }).catch(() => {});
      } catch (error) {
        // Ignorar completamente
      }
    }
    
    // Limpiar tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Limpiar usuario
    setUser(null);
    
    // Limpiar el reproductor (llamar resetPlayer del contexto global)
    // Esto se ejecutará después de que el componente se actualice
    window.dispatchEvent(new CustomEvent('logout-cleanup'));
    
    console.log('✅ Sesión cerrada');
  };

  // Comprobar token
  const checkAuth = async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setInitialLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(res.data.user);
    } catch (error) {
      // Token inválido, limpiar localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setInitialLoading(false);
    }
  };

  // Función para refrescar token (opcional, para mayor seguridad)
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch (error) {
      logout(); // Refresh token inválido
      throw error;
    }
  };

  // Interceptor para manejar tokens expirados - SIN logout automático agresivo
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Solo intentar refresh si es un 401 Y no es la petición de logout
        if (error.response?.status === 401 && 
            user && 
            !originalRequest.url?.includes('/auth/logout') &&
            !originalRequest._retry) {
          
          originalRequest._retry = true;
          
          try {
            const newToken = await refreshToken();
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axios.request(originalRequest);
          } catch (refreshError) {
            // Solo hacer logout si el refresh falla
            console.log('🔐 Token expirado, cerrando sesión...');
            logout();
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [user]);

  const value = {
    user,
    loading,
    initialLoading, // Para mostrar spinner inicial
    login,
    logout,
    checkAuth,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};