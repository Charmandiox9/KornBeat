'use client';
import React, { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import { staggerIn } from '@/lib/animations';
import FavoriteButton from './FavoriteButton';
import './SongList.css';

const SongList = ({ songs, onSongSelect, currentSong, searchQuery, searchType }) => {
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && songs?.length) {
      staggerIn(listRef.current, '.song-item', { step: 40, distance: 10 });
    }
  }, [songs]);
  
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="search-highlight">{part}</mark> : part
    );
  };

  if (!songs || songs.length === 0) {
    return (
      <div className="song-list-empty">
        {searchQuery ? (
          <div>
            <p>{t('song.notFoundFor', { q: searchQuery })}</p>
            <p>{t('search.tryOther')}</p>
          </div>
        ) : (
          <p>{t('song.empty')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="song-list-container" ref={listRef}>
      <div className="song-list-header">
        <h2>🎶
          {searchQuery ? (
            <span>
              {t('search.resultsFor', { q: searchQuery, n: songs.length })}
            </span>
          ) : (
            <span>{t('song.listCount', { n: songs.length })}</span>
          )}
        </h2>

        {searchType && (
          <div className="search-info">
            <span className="search-type">
              {t('search.byType', {
                type:
                  searchType === 'artist'
                    ? t('search.typeArtist')
                    : searchType === 'song'
                      ? t('search.typeSong')
                      : searchType === 'category'
                        ? t('search.byCategory')
                        : t('search.typeGeneral'),
              })}
            </span>
          </div>
        )}
      </div>
      
      <div className="song-list">
        {songs.map((song) => (
          <div 
            key={song._id}
            className={`song-item ${currentSong?._id === song._id ? 'active' : ''}`}
            onClick={() => onSongSelect(song)}
          >
            <div className="song-info">
              <div className="song-main-info">
                <h4 className="song-title">
                  {searchQuery ? highlightText(song.title, searchQuery) : song.title}
                </h4>
                <p className="song-artist">
                  {searchQuery ? highlightText(song.artist, searchQuery) : song.artist}
                </p>
                
                {song.composers && song.composers.length > 0 && (
                  <div className="song-composers">
                    <span className="composers-label">{t('song.composers')} </span>
                    {song.composers.map((composer, index) => (
                      <span key={index} className="composer-name">
                        {searchQuery ? highlightText(composer, searchQuery) : composer}
                        {index < song.composers.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="song-details">
                {song.album && (
                  <span className="song-album">
                    {t('song.album', {
                      album: searchQuery ? highlightText(song.album, searchQuery) : song.album,
                    })}
                  </span>
                )}
                {song.genre && (
                  <span className="song-genre">
                    {t('song.genre', {
                      genre: searchQuery ? highlightText(song.genre, searchQuery) : song.genre,
                    })}
                  </span>
                )}
              </div>
            </div>
            
            <div className="song-meta">
              <span className="song-duration">⏱️ {formatDuration(song.duration)}</span>
              <span className="song-size">💾 {formatFileSize(song.fileSize)}</span>
              <span className="song-plays">{t('song.plays', { n: song.playCount })}</span>
            </div>
            
            <div className="song-actions">
              {user && user._id && (
                <FavoriteButton 
                  songId={song._id} 
                  userId={user._id}
                  size="medium"
                />
              )}
              <button 
                className="play-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSongSelect(song);
                }}
              >
                {currentSong?._id === song._id ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongList;