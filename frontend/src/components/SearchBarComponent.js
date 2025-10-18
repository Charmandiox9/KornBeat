import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useMusicSearch } from '../context/MusicSearchContext';
import '../styles/SearchBar.css';

const SearchBarComponent = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    searchSongs,
    clearSearch,
    isLoading,
  } = useMusicSearch();

  const [localQuery, setLocalQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const categories = [
    'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Electrónica', 
    'Reggaeton', 'Clásica', 'Country', 'R&B', 'Metal'
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim().length > 2) {
        setSearchQuery(localQuery);
        searchSongs(localQuery, selectedCategory);
      } else if (localQuery.trim().length === 0 && searchQuery) {
        clearSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localQuery, selectedCategory]);

  const handleCategorySelect = (category) => {
    const newCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(newCategory);
    setShowCategories(false);
    
    // Si hay categoría seleccionada, buscar solo por categoría
    if (newCategory) {
      searchSongs('', newCategory);
    } else {
      // Si se deselecciona, buscar con el query actual o limpiar
      if (localQuery) {
        searchSongs(localQuery, '');
      } else {
        clearSearch();
      }
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    setSelectedCategory('');
    clearSearch();
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-container">
        <div className="search-bar">
          <Search className="search-icon" />
          
          <input
            type="text"
            placeholder="Buscar canciones, artistas o álbumes..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="search-input"
          />

          {isLoading && <Loader2 className="loading-spinner" />}

          {(localQuery || selectedCategory) && (
            <button
              onClick={handleClear}
              className="clear-button"
              aria-label="Limpiar búsqueda"
            >
              <X className="clear-icon" />
            </button>
          )}

          <button
            onClick={() => setShowCategories(!showCategories)}
            className="category-button"
          >
            {selectedCategory || 'Categorías'}
          </button>
        </div>

        {showCategories && (
          <div className="category-dropdown">
            <div className="category-grid">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`category-item ${
                    selectedCategory === category ? 'active' : ''
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {(searchQuery || selectedCategory) && (
        <div className="active-filters">
          <span>Buscando:</span>
          {searchQuery && (
            <span className="filter-tag filter-query">
              "{searchQuery}"
            </span>
          )}
          {selectedCategory && (
            <span className="filter-tag filter-category">
              {selectedCategory}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBarComponent;