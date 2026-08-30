'use client';
import React, { Suspense, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthContext } from '@/context/authContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useI18n } from '@/context/I18nContext';
import { useGql } from '@/lib/gql';
import SongList from '@/components/common/SongList';
import TopBar from '@/components/common/TopBar';
import BottomBar from '@/components/common/BottomBar';

const SEARCH_QUERY = `
query Search($query: String!, $type: SearchType) {
  search(query: $query, type: $type) {
    id title artist album genre duration coverUrl streamUrl
    playCount likes fileSize composers
  }
}
`;

function SearchResultsInner() {
  const params = useSearchParams();
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const { playNow, currentSong } = useMusicPlayer();

  const q = params.get('q') ?? '';
  const type = params.get('type') ?? 'general';

  const { data, loading } = useGql(
    'music',
    SEARCH_QUERY,
    { query: q, type },
    [q, type],
  );

  const songs = (data?.search ?? []).map((s) => ({
    _id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.album,
    genre: s.genre,
    duration: s.duration,
    playCount: s.playCount,
    likes: s.likes,
    fileSize: s.fileSize,
    composers: s.composers,
    coverUrl: s.coverUrl,
    streamUrl: s.streamUrl,
  }));

  const handlePlaySong = (song) => {
    playNow({
      _id: song._id,
      titulo: song.title,
      artistas: [{ nombre: song.artist }],
      album_info: { titulo: song.album || '' },
      portada_url: song.coverUrl ?? null,
      archivo_url: song.streamUrl,
      duracion_segundos: song.duration,
      categorias: song.genre ? [song.genre] : [],
    });
  };

  return (
    <div className="principal-wrapper">
      <TopBar />
      <main className="principal-contents">
        <div className="search-page-container">
          <h1>{t('search.pageTitle')}</h1>

          {!q ? (
            <p className="library-status">
              {t('search.typePlaceholder')}
            </p>
          ) : loading ? (
            <p className="library-status">
              {t('search.searchingFor', {
                q,
                type:
                  type === 'artist'
                    ? t('search.typeArtist')
                    : type === 'song'
                      ? t('search.typeSong')
                      : type === 'category'
                        ? t('search.byCategory')
                        : t('search.typeGeneral'),
              })}
            </p>
          ) : (
            <SongList
              songs={songs}
              onSongSelect={handlePlaySong}
              currentSong={currentSong}
              searchQuery={q}
              searchType={type}
            />
          )}
        </div>
      </main>
      <BottomBar />
    </div>
  );
}

export default function SearchPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="principal-wrapper">
          <TopBar />
          <main className="principal-contents">
            <p className="library-status">{t('search.loading')}</p>
          </main>
          <BottomBar />
        </div>
      }
    >
      <SearchResultsInner />
    </Suspense>
  );
}
