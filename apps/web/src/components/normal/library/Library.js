'use client';
import React, { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useI18n } from '@/context/I18nContext';
import { useGql } from '@/lib/gql';
import SongList from '@/components/common/SongList';
import TopBar from '@/components/common/TopBar';
import BottomBar from '@/components/common/BottomBar';
import './Library.css';

const RECENT_QUERY = `
query Recent($userId: String!) {
  recentHistory(userId: $userId, limit: 50) {
    id titulo artista portada_url: portadaUrl duracion reproducciones
    fecha_reproduccion: fechaReproduccion
  }
}
`;

const FAVORITES_QUERY = `
query Favorites($userId: String!) {
  favorites(userId: $userId, limit: 100) {
    total totalPages
    favorites {
      fechaLike
      song {
        id title artist album genre duration coverUrl streamUrl
        playCount likes fileSize composers
      }
    }
  }
}
`;

const PLAYLISTS_QUERY = `
query Playlists($userId: String!) {
  playlists(userId: $userId) {
    id titulo descripcion totalCanciones duracionTotal fechaCreacion
    songs { id titulo artista duracion orden coverUrl streamUrl }
  }
}
`;

const TABS = [
  { key: 'recientes', labelKey: 'library.tabRecent' },
  { key: 'favoritos', labelKey: 'library.tabFavorites' },
  { key: 'playlists', labelKey: 'library.tabPlaylists' },
];

const formatDuration = (seconds) => {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${minutes}:${s.toString().padStart(2, '0')}`;
};

const formatTotalDuration = (seconds) => {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
};

const Library = () => {
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const { playNow } = useMusicPlayer();
  const router = useRouter();
  const [tab, setTab] = useState('recientes');
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const userId = user?._id ?? '';

  const recent = useGql(
    'reco',
    RECENT_QUERY,
    { userId },
    [userId, tab === 'recientes'],
  );
  const favorites = useGql(
    'music',
    FAVORITES_QUERY,
    { userId },
    [userId, tab === 'favoritos'],
  );
  const playlists = useGql(
    'music',
    PLAYLISTS_QUERY,
    { userId },
    [userId, tab === 'playlists'],
  );

  if (!user) {
    router.replace('/login');
    return null;
  }

  const recentSongs = (recent.data?.recentHistory ?? []).map((s) => ({
    _id: s.id,
    title: s.titulo,
    artist: s.artista,
    duration: s.duracion,
    playCount: s.reproducciones,
    fileSize: 0,
    coverUrl: s.portada_url ? `/api/music/covers/${s.portada_url}` : null,
  }));

  const favoriteSongs = (favorites.data?.favorites?.favorites ?? []).map(
    (f) => ({
      _id: f.song.id,
      title: f.song.title,
      artist: f.song.artist,
      album: f.song.album,
      genre: f.song.genre,
      duration: f.song.duration,
      playCount: f.song.playCount,
      likes: f.song.likes,
      fileSize: f.song.fileSize,
      composers: f.song.composers,
      fechaLike: f.fechaLike,
    }),
  );

  const playlistDocs = playlists.data?.playlists ?? [];

  const handlePlaySong = (song) => {
    playNow({
      _id: song._id,
      titulo: song.title,
      artistas: [{ nombre: song.artist }],
      album_info: { titulo: song.album || '' },
      portada_url: song.coverUrl ?? null,
      archivo_url: song.streamUrl ?? `/api/music/songs/${song._id}/stream`,
      duracion_segundos: song.duration,
      categorias: song.genre ? [song.genre] : [],
    });
  };

  return (
    <div className="principal-container">
      <TopBar />
      <main className="principal-content1">
        <div className="container">
          <h1>{t('library.title')}</h1>

          <div className="library-tabs">
            {TABS.map((tabDef) => (
              <button
                key={tabDef.key}
                className={`library-tab ${tab === tabDef.key ? 'active' : ''}`}
                onClick={() => setTab(tabDef.key)}
              >
                {t(tabDef.labelKey)}
              </button>
            ))}
          </div>

          {tab === 'recientes' && (
            <div className="library-section">
              {recent.loading ? (
                <p className="library-status">{t('library.loadingHistory')}</p>
              ) : recentSongs.length === 0 ? (
                <p className="library-status">
                  {t('library.noHistory')}
                </p>
              ) : (
                <SongList songs={recentSongs} onSongSelect={handlePlaySong} />
              )}
            </div>
          )}

          {tab === 'favoritos' && (
            <div className="library-section">
              {favorites.loading ? (
                <p className="library-status">{t('library.loadingFavorites')}</p>
              ) : favoriteSongs.length === 0 ? (
                <p className="library-status">
                  {t('library.noFavorites')}
                </p>
              ) : (
                <SongList songs={favoriteSongs} onSongSelect={handlePlaySong} />
              )}
            </div>
          )}

          {tab === 'playlists' && (
            <div className="library-section">
              {playlists.loading ? (
                <p className="library-status">{t('library.loadingPlaylists')}</p>
              ) : playlistDocs.length === 0 ? (
                <p className="library-status">
                  {t('library.noPlaylists')}
                </p>
              ) : (
                <div className="playlist-cards">
                  {playlistDocs.map((pl) => (
                    <div key={pl.id} className="playlist-card">
                      <div
                        className="playlist-card-header"
                        onClick={() =>
                          setExpandedPlaylist(
                            expandedPlaylist === pl.id ? null : pl.id,
                          )
                        }
                      >
                        <div>
                          <h3>{pl.titulo}</h3>
                          {pl.descripcion && <p>{pl.descripcion}</p>}
                          <span className="playlist-meta">
                            {t('library.songsAndDuration', {
                              n: pl.totalCanciones,
                              dur: formatTotalDuration(pl.duracionTotal),
                            })}
                          </span>
                        </div>
                        <span className="playlist-expand">
                          {expandedPlaylist === pl.id ? '▲' : '▼'}
                        </span>
                      </div>

                      {expandedPlaylist === pl.id && pl.songs.length > 0 && (
                        <ul className="playlist-songs">
                          {pl.songs.map((s) => (
                            <li key={s.id}>
                              <button
                                className="playlist-song-btn"
                                onClick={() =>
                                  handlePlaySong({
                                    _id: s.id,
                                    title: s.titulo,
                                    artist: s.artista,
                                    duration: s.duracion,
                                    streamUrl: s.streamUrl,
                                    coverUrl: s.coverUrl,
                                  })
                                }
                              >
                                ▶️ {s.orden}. {s.titulo} — {s.artista} (
                                {formatDuration(s.duracion)})
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomBar />
    </div>
  );
};

export default Library;
