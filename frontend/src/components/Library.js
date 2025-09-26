import React from 'react';
import './Library.css';

const Library = () => {
  return (
    <div className="library-container">
      <div className="library-card">
        <h2>Bienvenido a KornBeat</h2>
        <div className="library-content">
          <p>Has iniciado sesión correctamente</p>
          {/* Aquí puedes agregar más contenido */}
        </div>
      </div>
    </div>
  );
};

export default Library;