import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Information.css';

const Information = () => {
  return (
    <div className="information-container">
      <Link to="/" className="back-button">
        ← Volver
      </Link>
      <div className="information-content">
        <h1>Sobre KornBeat</h1>
        <div className="info-sections">
          <section className="info-section">
            <h2>¿Qué es KornBeat?</h2>
            <p>KornBeat es una plataforma innovadora diseñada para amantes de la música donde podrás descubrir, compartir y disfrutar de tu música favorita.</p>
          </section>

          <section className="info-section">
            <h2>Características</h2>
            <ul>
              <li>Descubre nueva música basada en tus gustos</li>
              <li>Crea y comparte playlists personalizadas</li>
              <li>Conecta con otros amantes de la música</li>
              <li>Accede a estadísticas de tu música</li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Nuestra Misión</h2>
            <p>Crear una comunidad vibrante de amantes de la música donde cada usuario pueda descubrir, compartir y disfrutar de experiencias musicales únicas.


            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Information;