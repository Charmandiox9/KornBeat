'use client';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Music2,
  Disc3,
  Upload,
  Loader2,
  Play,
  Trash2,
  Plus,
  FolderOpen,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileAudio,
} from 'lucide-react';
import { AuthContext } from '@/context/authContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useI18n } from '@/context/I18nContext';
import { useReveal, staggerIn, scaleIn, shake } from '@/lib/animations';
import artistService from '@/services/artistService';
import SongList from '@/components/common/SongList';
import MusicPlayer from './MusicPlayer';
import SkeletonLoader from './SkeletonLoader';
import TopBar from '@/components/common/TopBar';
import './MusicPage.css';

const MAX_MB = 50;

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0 || isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatTotal = (seconds) => {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const toPlayable = (song, albumTitle) => ({
  _id: song.id,
  titulo: song.title,
  artistas: [{ nombre: song.artist }],
  album_info: { titulo: albumTitle || song.album || '' },
  duracion_segundos: song.duration,
  archivo_url: song.streamUrl,
  portada_url: song.coverUrl ?? null,
  categorias: song.categorias || [],
});

// ---------- Formulario de subida de canción (sencillo o a álbum) ----------
const SongUploadForm = ({
  albums,
  albumMode,
  onUploaded,
  onInvalidFile,
}) => {
  const { t } = useI18n();
  const [file, setFile] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [genero, setGenero] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const formRef = useRef(null);

  const validate = () => {
    if (!file) return false;
    const isMp3 =
      file.type === 'audio/mpeg' || file.type === 'audio/mp3' || /\.mp3$/i.test(file.name);
    if (!isMp3 || file.size > MAX_MB * 1024 * 1024) {
      if (formRef.current) shake(formRef.current);
      onInvalidFile?.();
      return false;
    }
    if (albumMode && !albumId) {
      if (formRef.current) shake(formRef.current);
      return false;
    }
    return true;
  };

  const handleFile = (f) => {
    setFile(f);
    if (f && !titulo) {
      setTitulo(f.name.replace(/\.mp3$/i, '').replace(/[_-]+/g, ' '));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading || !validate()) return;
    setUploading(true);
    try {
      const data = albumMode
        ? await artistService.uploadSongToAlbum(albumId, file, titulo.trim(), genero.trim())
        : await artistService.uploadSingle(file, titulo.trim(), genero.trim());
      toast.success(
        t('music.uploadSuccess', {
          name: data.song?.title || titulo.trim() || file.name,
        }),
      );
      setFile(null);
      setTitulo('');
      setGenero('');
      onUploaded?.();
    } catch (error) {
      if (formRef.current) shake(formRef.current);
      console.error('Error subiendo canción:', error);
      toast.error(error.message || t('music.uploadError'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-4 md:grid-cols-2"
    >
      {albumMode && (
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-ink-2">{t('music.selectAlbum')}</label>
          <select
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
          >
            <option value="">{t('music.selectAlbumPh')}</option>
            {albums.map((a) => (
              <option key={a._id} value={a._id}>
                {a.titulo} {a.year ? `(${a.year})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5 md:col-span-2">
        <label className="text-sm font-medium text-ink-2">{t('music.mp3File')}</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
            dragging
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-bg-2 hover:border-accent/60'
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,.mp3"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <FileAudio size={28} className={file ? 'text-accent' : 'text-ink-4'} />
          {file ? (
            <p className="text-sm font-medium text-ink">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          ) : (
            <p className="text-sm text-ink-3">
              {t('music.mp3FilePh')} <span className="text-ink-4">(.mp3, {MAX_MB} MB)</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-2">{t('music.songTitle')}</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={t('music.songTitlePh')}
          className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-2">{t('music.songGenre')}</label>
        <input
          type="text"
          value={genero}
          onChange={(e) => setGenero(e.target.value)}
          placeholder={t('music.songGenrePh')}
          className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
        />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={uploading || !file || (albumMode && !albumId)}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? t('music.uploading') : t('music.upload')}
        </button>
      </div>
    </form>
  );
};

// ---------- Pestaña: Mis Obras ----------
const MyWorks = ({ albums, singles, onDeleteAlbum, onDeleteSong, refresh }) => {
  const { t } = useI18n();
  const { playNow, togglePlay, currentSong, isPlaying } = useMusicPlayer();
  const [expanded, setExpanded] = useState({});
  const worksRef = useRef(null);

  useEffect(() => {
    if (worksRef.current) {
      staggerIn(worksRef.current, '.album-card, .single-row', { step: 50 });
    }
  }, [albums, singles]);

  const play = (song, albumTitle) => {
    if (currentSong?._id === song.id) {
      togglePlay();
      return;
    }
    playNow(toPlayable(song, albumTitle));
  };

  return (
    <div ref={worksRef} className="grid gap-8">
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <Disc3 size={20} className="text-accent" />
          {t('music.albums')}
        </h2>
        {albums.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-medium text-ink-2">{t('music.noAlbums')}</p>
            <p className="mt-1 text-sm text-ink-3">{t('music.noAlbumsSub')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {albums.map((album) => {
              const isOpen = !!expanded[album._id];
              return (
                <div
                  key={album._id}
                  className="album-card overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:shadow-black/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-ink">
                        {album.titulo}
                      </h3>
                      <p className="mt-0.5 text-sm text-ink-3">
                        {album.year || '—'} · {t('music.songsInAlbum', { n: album.songs.length })}
                        {album.totalDuration > 0 &&
                          ` · ${t('music.totalDuration')}: ${formatTotal(album.totalDuration)}`}
                      </p>
                      {album.descripcion && (
                        <p className="mt-1.5 line-clamp-2 max-w-xl text-sm text-ink-2">
                          {album.descripcion}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpanded({ ...expanded, [album._id]: !isOpen })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-bg-3"
                      >
                        {isOpen ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                        {t('music.addSong')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAlbum(album)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-line-soft px-5 py-3">
                      <UploadSongToAlbum album={album} onUploaded={refresh} />
                      {album.songs.length > 0 && (
                        <ul className="mt-3 divide-y divide-line-soft">
                          {album.songs.map((song) => (
                            <SongRow
                              key={song.id}
                              song={song}
                              albumTitle={album.titulo}
                              isPlaying={currentSong?._id === song.id && isPlaying}
                              onPlay={() => play(song, album.titulo)}
                              onDelete={() => onDeleteSong(song)}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <Music2 size={20} className="text-accent" />
          {t('music.singles')}
        </h2>
        {singles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-medium text-ink-2">{t('music.noSingles')}</p>
            <p className="mt-1 text-sm text-ink-3">{t('music.noSinglesSub')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {singles.map((song) => (
              <div key={song.id} className="single-row">
                <SongRow
                  song={song}
                  isPlaying={currentSong?._id === song.id && isPlaying}
                  onPlay={() => play(song, song.album)}
                  onDelete={() => onDeleteSong(song)}
                  showUploadDate
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const SongRow = ({ song, albumTitle, isPlaying, onPlay, onDelete, showUploadDate }) => {
  const { t } = useI18n();
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-bg-2"
    >
      <button
        type="button"
        onClick={onPlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition hover:bg-accent hover:text-white"
        title={isPlaying ? t('player.pause') : t('player.play')}
      >
        <Play size={15} className="ml-0.5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{song.title}</p>
        <p className="text-xs text-ink-3">
          {song.genre || '—'}
          {albumTitle ? ` · 📀 ${albumTitle}` : ''}
          {showUploadDate && song.uploadDate &&
            ` · ${t('music.uploaded', {
              date: new Date(song.uploadDate).toLocaleDateString(),
            })}`}
        </p>
      </div>
      <span className="hidden text-xs text-ink-3 sm:block">
        {formatDuration(song.duration)}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition hover:bg-danger/10 hover:text-danger"
        title={t('music.delete')}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
};

const UploadSongToAlbum = ({ album, onUploaded }) => {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-bg-2 p-4">
      <p className="mb-3 text-sm font-semibold text-ink">
        {t('music.uploadToAlbumTitle', { name: album.titulo })}
      </p>
      <SongUploadForm albums={[album]} albumMode onUploaded={onUploaded} />
    </div>
  );
};

// ---------- Pestaña: Nuevo Álbum ----------
const NewAlbum = ({ onCreated }) => {
  const { t } = useI18n();
  const [titulo, setTitulo] = useState('');
  const [year, setYear] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [creating, setCreating] = useState(false);
  const formRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (creating || !titulo.trim()) return;
    setCreating(true);
    try {
      const data = await artistService.createAlbum({
        titulo: titulo.trim(),
        year: year ? Number(year) : undefined,
        descripcion: descripcion.trim() || undefined,
      });
      toast.success(t('music.albumCreated', { name: titulo.trim() }));
      setTitulo('');
      setYear('');
      setDescripcion('');
      onCreated?.(data.album);
    } catch (error) {
      if (formRef.current) shake(formRef.current);
      toast.error(error.message || t('music.albumError'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={cardRef} className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-black/20">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Plus size={20} className="text-accent" />
        {t('music.newAlbumTitle')}
      </h2>
      <p className="mt-1 mb-5 text-sm text-ink-3">{t('music.newAlbumDesc')}</p>

      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-2">{t('music.albumName')}</label>
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t('music.albumNamePh')}
            className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-2">{t('music.albumYear')}</label>
          <input
            type="number"
            min={1900}
            max={new Date().getFullYear() + 1}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder={t('music.albumYearPh')}
            className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-2">{t('music.albumDesc')}</label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={t('music.albumDescPh')}
            className="w-full resize-none rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={creating || !titulo.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Disc3 size={16} />
            )}
            {creating ? t('music.creating') : t('music.createAlbum')}
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------- Pestaña: Subir Sencillo ----------
const UploadSingleTab = ({ onUploaded }) => {
  const { t } = useI18n();
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current);
  }, []);

  return (
    <div ref={cardRef} className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-black/20">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Upload size={20} className="text-accent" />
        {t('music.uploadSingleTitle')}
      </h2>
      <p className="mt-1 mb-5 text-sm text-ink-3">{t('music.uploadSingleDesc')}</p>
      <SongUploadForm albums={[]} onUploaded={onUploaded} onInvalidFile={() => toast.error(t('music.invalidFile'))} />
    </div>
  );
};

// ---------- Pestaña: Explorar (cátalogo legacy) ----------
const ExploreTab = () => {
  const { t } = useI18n();
  const [allSongs, setAllSongs] = useState([]);
  const [displayedSongs, setDisplayedSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchAllSongs = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/music/songs');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setAllSongs(data.data);
        setDisplayedSongs(data.data);
        toast.success(t('explore.loaded', { n: data.data.length }));
      } else {
        toast.error(data.message || t('explore.errorLoad'));
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      toast.error(t('explore.errorLoad2'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAllSongs();
  }, [fetchAllSongs]);

  const handleSearch = async (query, type = 'general') => {
    if (!query.trim()) {
      setDisplayedSongs(allSongs);
      setSearchQuery('');
      setSearchType('');
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);
      let endpoint;
      switch (type) {
        case 'artist':
          endpoint = `/api/music/search/artist/${encodeURIComponent(query)}`;
          break;
        case 'song':
          endpoint = `/api/music/search/song/${encodeURIComponent(query)}`;
          break;
        case 'category':
          endpoint = `/api/music/search/category/${encodeURIComponent(query)}`;
          break;
        default:
          endpoint = `/api/music/search/${encodeURIComponent(query)}`;
      }
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setDisplayedSongs(data.data);
        setSearchQuery(query);
        setSearchType(data.searchType || type);
        toast.success(t('explore.results', { n: data.data.length }));
      } else {
        setDisplayedSongs([]);
        toast.error(t('explore.noResults'));
      }
    } catch (error) {
      console.error('Error searching:', error);
      setDisplayedSongs([]);
      toast.error(t('explore.errorSearch'));
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchType('');
    setDisplayedSongs(allSongs);
    setIsSearching(false);
    toast.success(t('explore.cleared'));
  };

  const handleSongSelect = (song) => {
    setCurrentSong(song);
    toast.success(t('explore.playing', { title: song.title || song.titulo }));
  };

  const categories = [
    'Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Electrónica',
    'Reggaeton', 'Clásica', 'Country', 'R&B', 'Metal',
  ];

  return (
    <div>
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder={t('explore.searchPh')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSearch(searchQuery);
            }}
            className="search-input"
          />
          <div className="search-buttons">
            <button
              onClick={() => handleSearch(searchQuery, 'general')}
              disabled={isSearching}
              className="search-btn"
            >
              {isSearching ? t('explore.searching') : t('explore.searchBtn')}
            </button>
            <button
              onClick={() => handleSearch(searchQuery, 'artist')}
              disabled={isSearching}
              className="search-btn artist"
            >
              {t('explore.artist')}
            </button>
            <button
              onClick={() => handleSearch(searchQuery, 'song')}
              disabled={isSearching}
              className="search-btn song"
            >
              {t('explore.song')}
            </button>
            {searchQuery && (
              <button onClick={clearSearch} className="search-btn clear">
                {t('explore.clear')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="categories-section">
        <h3>{t('explore.byGenre')}</h3>
        <div className="category-buttons">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => handleSearch(c, 'category')}
              className="category-btn"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader count={8} />
      ) : (
        <div className="music-layout">
          <div className="songs-section">
            <SongList
              songs={displayedSongs}
              onSongSelect={handleSongSelect}
              currentSong={currentSong}
              searchQuery={searchQuery}
              searchType={searchType}
            />
          </div>

          {currentSong && (
            <div className="player-section">
              <MusicPlayer
                song={currentSong}
                songs={displayedSongs}
                onSongChange={setCurrentSong}
              />
            </div>
          )}
        </div>
      )}

      {!isLoading && displayedSongs.length === 0 && !searchQuery && (
        <div className="empty-state">
          <h3>{t('explore.empty')}</h3>
          <p>{t('explore.emptySub')}</p>
        </div>
      )}
    </div>
  );
};

// ---------- Página principal ----------
const MusicPage = () => {
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState('works');
  const [data, setData] = useState({ albums: [], singles: [] });
  const [loading, setLoading] = useState(true);
  const mainRef = useReveal();

  const isArtist = !!user?.es_artist;

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    if (!isArtist) {
      setTab('explore');
    }
  }, [isArtist]);

  const loadMusic = useCallback(async () => {
    if (!isArtist) return;
    setLoading(true);
    try {
      const res = await artistService.getMyMusic();
      setData({ albums: res.albums || [], singles: res.singles || [] });
    } catch (error) {
      console.error('Error cargando música:', error);
      toast.error(error.message || t('music.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [isArtist, t]);

  useEffect(() => {
    if (user && isArtist) loadMusic();
  }, [user, isArtist, loadMusic]);

  const handleDeleteAlbum = async (album) => {
    if (!window.confirm(t('music.confirmDeleteAlbum', { name: album.titulo }))) return;
    try {
      const res = await artistService.deleteAlbum(album._id);
      toast.success(t('music.deletedAlbum', { name: album.titulo }));
      await loadMusic();
    } catch (error) {
      toast.error(error.message || t('music.deleteError'));
    }
  };

  const handleDeleteSong = async (song) => {
    if (!window.confirm(t('music.confirmDeleteSong', { name: song.title }))) return;
    try {
      await artistService.deleteSong(song.id);
      toast.success(t('music.deletedSong', { name: song.title }));
      await loadMusic();
    } catch (error) {
      toast.error(error.message || t('music.deleteError'));
    }
  };

  if (!user) return null;

  const tabs = isArtist
    ? [
        { key: 'works', label: t('music.tabWorks'), icon: Disc3 },
        { key: 'single', label: t('music.tabSingle'), icon: Music2 },
        { key: 'album', label: t('music.tabAlbum'), icon: Plus },
        { key: 'explore', label: t('music.tabExplore'), icon: FolderOpen },
      ]
    : [{ key: 'explore', label: t('music.tabExplore'), icon: FolderOpen }];

  return (
    <div className="music-page-container">
      <TopBar />
      <main className="music-content" ref={mainRef}>
        <div className="container">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Music2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">{t('music.title')}</h1>
              <p className="text-sm text-ink-3">{t('music.subtitle')}</p>
            </div>
          </div>

          {!isArtist && (
            <div
              className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Sparkles size={22} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold text-ink">{t('music.notArtist')}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{t('music.notArtistSub')}</p>
                </div>
              </div>
              <Link
                href="/profile"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t('music.applyNow')}
              </Link>
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === key
                    ? 'bg-accent text-white shadow-md'
                    : 'border border-line bg-surface text-ink-2 hover:bg-bg-3'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'works' && isArtist && (
            loading ? (
              <div className="flex items-center gap-2 py-16 text-ink-3">
                <Loader2 size={20} className="animate-spin" />
                {t('music.loading')}
              </div>
            ) : (
              <MyWorks
                albums={data.albums}
                singles={data.singles}
                onDeleteAlbum={handleDeleteAlbum}
                onDeleteSong={handleDeleteSong}
                refresh={loadMusic}
              />
            )
          )}

          {tab === 'single' && isArtist && <UploadSingleTab onUploaded={loadMusic} />}

          {tab === 'album' && isArtist && <NewAlbum onCreated={loadMusic} />}

          {tab === 'explore' && <ExploreTab />}
        </div>
      </main>
    </div>
  );
};

export default MusicPage;
