'use client';
import React, { useContext } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthContext } from '@/context/authContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useI18n } from '@/context/I18nContext';
import { useReveal } from '@/lib/animations';
import { useGql } from '@/lib/gql';
import FavoriteButton from '@/components/common/FavoriteButton';
import TopBar from '@/components/common/TopBar';
import BottomBar from '@/components/common/BottomBar';

const SONG_QUERY = `
query Song($id: String!) {
  song(id: $id) {
    id title artist composers album duration genre categorias tags
    coverUrl streamUrl playCount likes fileName fileSize uploadDate
  }
}
`;

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${minutes}:${s.toString().padStart(2, '0')}`;
};

export default function SongPage() {
  const params = useParams();
  const id = params?.id;
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const { playNow, currentSong, isPlaying, togglePlay } = useMusicPlayer();
  const mainRef = useReveal();

  const { data, loading } = useGql('music', SONG_QUERY, { id }, [id]);
  const song = data?.song;

  const isCurrent = currentSong?._id === id;

  const handlePlay = () => {
    if (!song) return;
    if (isCurrent) {
      togglePlay();
      return;
    }
    playNow({
      _id: song.id,
      titulo: song.title,
      artistas: [{ nombre: song.artist }],
      album_info: { titulo: song.album || '' },
      portada_url: song.coverUrl ?? null,
      archivo_url: song.streamUrl,
      duracion_segundos: song.duration,
      categorias: song.categorias || [],
    });
  };

  return (
    <div className="principal-wrapper">
      <TopBar />
      <main className="principal-contents">
        <div ref={mainRef} style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
          <Link href="/home" style={{ color: '#888', fontSize: 14 }}>
            {t('cancion.back')}
          </Link>

          {loading ? (
            <p style={{ marginTop: 24 }}>{t('cancion.loading')}</p>
          ) : !song ? (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 48 }}>😕</p>
              <h2>{t('cancion.notFound')}</h2>
              <p>
                {t('cancion.notFoundDesc', { id })}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 24,
                marginTop: 24,
                flexWrap: 'wrap',
              }}
            >
              <img
                src={song.coverUrl || '/covers/placeholder.png'}
                alt={song.title}
                style={{
                  width: 260,
                  height: 260,
                  objectFit: 'cover',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div style={{ flex: 1, minWidth: 260 }}>
                <h1 style={{ margin: '0 0 4px' }}>{song.title}</h1>
                <p style={{ color: '#aaa', fontSize: 18, margin: '0 0 12px' }}>
                  {song.artist}
                </p>

                {song.album && <p>{t('song.album', { album: song.album })}</p>}
                {song.genre && <p>{t('song.genre', { genre: song.genre })}</p>}
                {song.composers?.length > 0 && (
                  <p>{t('song.composers')} {song.composers.join(', ')}</p>
                )}
                {song.categorias?.length > 0 && (
                  <p>{t('song.categories')} {song.categorias.join(', ')}</p>
                )}

                <p style={{ color: '#888', fontSize: 14, marginTop: 16 }}>
                  ⏱️ {formatDuration(song.duration)} · ▶️ {song.playCount}{' '}
                  {t('song.playCount')} · ❤️ {song.likes} {t('song.likes')}
                  {song.fileSize > 0 &&
                    ` · 💾 ${(song.fileSize / 1024 / 1024).toFixed(1)} MB`}
                </p>
                {song.uploadDate && (
                  <p style={{ color: '#666', fontSize: 12 }}>
                    {t('song.uploadedAt', {
                      date: new Date(song.uploadDate).toLocaleDateString(),
                    })}
                  </p>
                )}

                <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    onClick={handlePlay}
                    style={{
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 999,
                      padding: '12px 28px',
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isCurrent && isPlaying ? t('cancion.pause') : t('cancion.play')}
                  </button>
                  {user?._id && (
                    <FavoriteButton songId={song.id} userId={user._id} size="large" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomBar />
    </div>
  );
}
