import React, { useState, useEffect } from 'react';
import favoritesService from '../services/favoritesService';
import '../styles/FavoriteButton.css';

const FavoriteButton = ({ songId, userId, size = 'medium' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Verificar si es favorito al montar
  useEffect(() => {
    if (userId && songId) {
      checkFavorite();
    }
  }, [userId, songId]);

  const checkFavorite = async () => {
    try {
      const response = await favoritesService.checkFavorite(userId, songId);
      setIsFavorite(response.isFavorite);
    } catch (error) {
      console.error('Error al verificar favorito:', error);
    }
  };

  const handleToggle = async (e) => {
    e.stopPropagation(); // Evitar que se dispare el click del padre
    
    if (isLoading || !userId) return;

    setIsLoading(true);
    setIsAnimating(true);

    try {
      const response = await favoritesService.toggleFavorite(userId, songId, isFavorite);
      
      if (response.success) {
        setIsFavorite(!isFavorite);
        
        // Animación completada
        setTimeout(() => setIsAnimating(false), 600);
      }
    } catch (error) {
      console.error('Error al toggle favorito:', error);
      setIsAnimating(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={`favorite-button favorite-button-${size} ${isFavorite ? 'is-favorite' : ''} ${isAnimating ? 'is-animating' : ''}`}
      onClick={handleToggle}
      disabled={isLoading || !userId}
      title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <svg
        className="favorite-icon"
        viewBox="0 0 24 24"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
};

export default FavoriteButton;
