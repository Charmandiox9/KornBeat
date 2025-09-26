import React, { useContext } from 'react';
import '../App.css';


// Componente de loading inicial
const InitialLoading = () => (
  <div className="loading-screen">
    <div className="spinner-large"></div>
    <p>Verificando autenticación...</p>
  </div>
);

export default InitialLoading;