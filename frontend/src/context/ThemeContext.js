// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Obtener tema guardado o usar preferencia del sistema
  const getInitialTheme = () => {
    // 1. Intentar obtener del localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    
    // 2. Detectar preferencia del sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // 3. Por defecto: claro
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Aplicar tema al DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Remover tema anterior
    root.classList.remove('light-theme', 'dark-theme');
    
    // Agregar nuevo tema
    root.classList.add(`${theme}-theme`);
    
    // Guardar en localStorage
    localStorage.setItem('theme', theme);
    
    console.log('🎨 Tema aplicado:', theme);
  }, [theme]);

  // Función para cambiar tema
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Función para establecer tema específico
  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);
    }
  };

  const value = {
    theme,
    toggleTheme,
    setTheme: setSpecificTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;