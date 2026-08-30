'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Music2,
  Clock,
  XCircle,
  BadgeCheck,
  Upload,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import { useGql } from '@/lib/gql';
import { useReveal, shake, scaleIn } from '@/lib/animations';
import artistService from '@/services/artistService';
import TopBar from '@/components/common/TopBar';
import BottomBar from '@/components/common/BottomBar';
import './Perfil.css';

const STATS_QUERY = `
query Stats($userId: String!) {
  favorites(userId: $userId, limit: 1) {
    total
  }
  playlists(userId: $userId) {
    id
    titulo
  }
}
`;

const ArtistZone = ({ user }) => {
  const { t } = useI18n();
  const [state, setState] = useState({ loading: true, request: null });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    artistName: '',
    genre: '',
    description: '',
    links: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef(null);
  const formRef = useRef(null);
  const revealRef = useReveal({ distance: 22 });

  const loadRequest = async () => {
    try {
      const data = await artistService.getMyRequest();
      setState({ loading: false, request: data.request });
    } catch (error) {
      console.error('Error cargando solicitud de artista:', error);
      setState({ loading: false, request: null });
    }
  };

  useEffect(() => {
    if (!user.es_artist) loadRequest();
  }, [user.es_artist]);

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current, { delay: 150 });
  }, []);

  if (user.es_artist) {
    return (
      <div ref={revealRef} className="mb-8">
        <div
          ref={cardRef}
          className="rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-black/20"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <BadgeCheck size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-ink">
                {t('perfil.isArtist', { name: user.artist_name || user.name })}
              </h3>
              <p className="mt-1 text-sm text-ink-2">{t('perfil.isArtistSub')}</p>
              <Link
                href="/music"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Music2 size={16} />
                {t('perfil.goToMusic')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const request = state.request;
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.artistName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await artistService.submitRequest({
        artistName: form.artistName.trim(),
        genre: form.genre.trim() || undefined,
        description: form.description.trim() || undefined,
        links: form.links.trim() || undefined,
      });
      toast.success(t('perfil.reqSuccess'));
      setForm({ artistName: '', genre: '', description: '', links: '' });
      setShowForm(false);
      await loadRequest();
    } catch (error) {
      if (formRef.current) shake(formRef.current);
      toast.error(
        error.status === 409
          ? t('perfil.reqErrorPending')
          : error.message || t('perfil.reqError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={revealRef} className="mb-8">
      <div
        ref={cardRef}
        className="rounded-2xl border border-line bg-surface p-6 shadow-sm dark:shadow-black/20"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">{t('perfil.artistZone')}</h3>
            <p className="text-sm text-ink-2">{t('perfil.artistZoneDesc')}</p>
          </div>
        </div>

        {state.loading ? (
          <div className="flex items-center gap-2 py-6 text-ink-3">
            <Loader2 size={18} className="animate-spin" />
            {t('common.loading')}
          </div>
        ) : request?.status === 'pending' ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-center gap-3">
              <Clock size={20} className="shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-ink">{t('perfil.reqPending')}</p>
                <p className="mt-0.5 text-sm text-ink-2">
                  {t('perfil.reqPendingSub', { name: request.artistName })}
                </p>
                {request.createdAt && (
                  <p className="mt-1 text-xs text-ink-3">
                    {t('perfil.reqSentOn', {
                      date: new Date(request.createdAt).toLocaleDateString(),
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : request?.status === 'rejected' ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4">
            <div className="flex items-center gap-3">
              <XCircle size={20} className="shrink-0 text-danger" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{t('perfil.reqRejected')}</p>
                {request.rejectReason && (
                  <p className="mt-0.5 text-sm text-ink-2">
                    {t('perfil.reqRejectedReason', { reason: request.rejectReason })}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-3 rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white"
                >
                  {t('perfil.reqRetry')}
                </button>
              </div>
            </div>
          </div>
        ) : showForm || !request ? (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-2">
                {t('perfil.reqArtistName')}
              </label>
              <input
                type="text"
                required
                value={form.artistName}
                onChange={(e) => setForm({ ...form, artistName: e.target.value })}
                placeholder={t('perfil.reqArtistNamePh')}
                className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-2">
                {t('perfil.reqGenre')}
              </label>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder={t('perfil.reqGenrePh')}
                className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-ink-2">
                {t('perfil.reqDescription')}
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('perfil.reqDescriptionPh')}
                className="w-full resize-none rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-ink-2">
                {t('perfil.reqLinks')}
              </label>
              <input
                type="text"
                value={form.links}
                onChange={(e) => setForm({ ...form, links: e.target.value })}
                placeholder={t('perfil.reqLinksPh')}
                className="w-full rounded-lg border border-line bg-bg-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting || !form.artistName.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {submitting ? t('perfil.reqSubmitting') : t('perfil.reqSubmit')}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-line bg-bg-2 p-4 text-sm text-ink-2">
            {t('perfil.reqFormDesc')}
          </div>
        )}
      </div>
    </div>
  );
};

const PerfilPage = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useI18n();
  const router = useRouter();
  const mainRef = useReveal();
  const { data: stats } = useGql(
    'music',
    STATS_QUERY,
    { userId: user?._id ?? '' },
    [user?._id],
  );

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) {
    return null;
  }

  const favoritesCount = stats?.favorites?.total ?? 0;
  const playlistsCount = (stats?.playlists ?? []).length;

  const memberSince = user.date_of_register || user.createdAt;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="principal-container">
      <TopBar />
      <main className="principal-content1" ref={mainRef}>
        <div className="container">
          <h1>{t('perfil.title')}</h1>

          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-value">{favoritesCount}</span>
              <span className="profile-stat-label">{t('perfil.favorites')}</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{playlistsCount}</span>
              <span className="profile-stat-label">{t('perfil.playlists')}</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{user.country || '—'}</span>
              <span className="profile-stat-label">{t('perfil.country')}</span>
            </div>
          </div>

          <ArtistZone user={user} />

          <div className="profile-info">
            <div className="profile-card">
              <h3>{t('perfil.info')}</h3>

              <p>
                <strong>{t('perfil.name')}:</strong>{' '}
                {user.name || t('perfil.notSpecified')}
              </p>
              <p>
                <strong>{t('auth.email')}:</strong> {user.email}
              </p>
              <p>
                <strong>{t('perfil.memberSince')}</strong>{' '}
                {memberSince
                  ? new Date(memberSince).toLocaleDateString()
                  : t('perfil.noDate')}
              </p>

              <div className="profile-actions">
                <Link href="/edit-profile">
                  <button className="card-btn">{t('perfil.edit')}</button>
                </Link>
                <Link href="/library">
                  <button className="card-btn">{t('perfil.library')}</button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  );
};

export default PerfilPage;
