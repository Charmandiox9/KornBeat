'use client';
import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMusicSearch } from '@/context/MusicSearchContext';
import { useI18n } from '@/context/I18nContext';
import './SearchBar.css';

function SearchBarComponentInner() {
  const { t } = useI18n();
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    searchSongs,
    clearSearch,
    isLoading,
  } = useMusicSearch();
  const router = useRouter();
  const params = useSearchParams();

  const [localQuery, setLocalQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  // Al montar, sincroniza el input con ?q= (p. ej. desde /search?q=rock)
  useEffect(() => {
    const urlQuery = params.get('q');
    if (urlQuery) {
      setLocalQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToSearch = (query, category) => {
    const url = new URLSearchParams();
    if (query) url.set('q', query);
    if (category) {
      url.set('type', 'category');
      if (!query) url.set('q', category);
    }
    const qs = url.toString();
    router.replace(qs ? `/search?${qs}` : '/search');
  };

  const categories = [
    'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Electrónica', 
    'Reggaeton', 'Clásica', 'Country', 'R&B', 'Metal'
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim().length > 2) {
        setSearchQuery(localQuery);
        searchSongs(localQuery, selectedCategory);
        goToSearch(localQuery.trim(), selectedCategory);
      } else if (localQuery.trim().length === 0 && searchQuery) {
        clearSearch();
        goToSearch('', '');
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery, selectedCategory]);

  const handleCategorySelect = (category) => {
    const newCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(newCategory);
    setShowCategories(false);
    
    // Si hay categoría seleccionada, buscar solo por categoría
    if (newCategory) {
      searchSongs('', newCategory);
      goToSearch(newCategory, newCategory);
    } else {
      // Si se deselecciona, buscar con el query actual o limpiar
      if (localQuery) {
        searchSongs(localQuery, '');
        goToSearch(localQuery.trim(), '');
      } else {
        clearSearch();
        goToSearch('', '');
      }
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    setSelectedCategory('');
    clearSearch();
    goToSearch('', '');
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-container">
        <div className="search-bar">
          <Search className="search-icon" />
          
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="search-input"
          />

          {isLoading && <Loader2 className="loading-spinner" />}

          {(localQuery || selectedCategory) && (
            <button
              onClick={handleClear}
              className="clear-button"
              aria-label={t('search.clear')}
            >
              <X className="clear-icon" />
            </button>
          )}

          <button
            onClick={() => setShowCategories(!showCategories)}
            className="category-button"
          >
            <Filter size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
            {selectedCategory || t('search.categories')}
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
          <span>{t('search.searching')}</span>
          {searchQuery && (
            <span className="filter-tag filter-query">
              "{searchQuery}"
            </span>
          )}
          {selectedCategory && (
            <span className="filter-tag filter-category">
              📂 {selectedCategory}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const SearchBarComponent = () => (
  <React.Suspense fallback={null}>
    <SearchBarComponentInner />
  </React.Suspense>
);

export default SearchBarComponent;