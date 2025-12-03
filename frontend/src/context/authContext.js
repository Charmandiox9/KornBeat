import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

  // Logout
  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await axios.post(`${API_URL}/auth/logout`, { refreshToken });
    } catch (error) {
      console.warn('Error en logout:', error.response?.data?.message);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setInitialLoading(false);
    }
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && user) {
          try {
            await refreshToken();
            // Reintentar la petición original
            return axios.request(error.config);
          } catch (refreshError) {
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
    initialLoading, 
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