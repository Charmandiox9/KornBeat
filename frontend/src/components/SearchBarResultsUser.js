import React, { useState, useCallback, useMemo } from 'react';
import { Music, Search, Loader2, Play, Heart, MoreVertical, ListPlus, PlayCircle } from 'lucide-react';
import { useMusicSearch } from '../context/MusicSearchContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import '../styles/SearchBarResults.css';

// usuarios registrados
const SearchBarResultsUser = () => {
  const { searchResults, isLoading, error, searchQuery } = useMusicSearch();
  const { playNow, addToQueue, playNextInQueue, currentSong } = useMusicPlayer();
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [imageErrors, setImageErrors] = useState(new Set());
  const [activeMenu, setActiveMenu] = useState(null);

  const formatDuration = useCallback((seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayNow = useCallback((e, song) => {
    e.stopPropagation();
    playNow(song);
    setActiveMenu(null);
  }, [playNow]);

  return (
    <div className="search-results">
    </div>
  );
};

export default SearchBarResultsUser;
