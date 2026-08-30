'use client';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Check,
  X,
  Loader2,
  Inbox,
  User as UserIcon,
  Music2,
  Link2,
} from 'lucide-react';
import { AuthContext } from '@/context/authContext';
import { useI18n } from '@/context/I18nContext';
import { useReveal, staggerIn, shake } from '@/lib/animations';
import artistService from '@/services/artistService';
import TopBar from '@/components/common/TopBar';
import BottomBar from '@/components/common/BottomBar';

const FILTERS = [
  { key: '', labelKey: 'admin.all' },
  { key: 'pending', labelKey: 'admin.pending' },
  { key: 'approved', labelKey: 'admin.approved' },
  { key: 'rejected', labelKey: 'admin.rejected' },
];

const STATUS_STYLES = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-danger/15 text-danger border-danger/30',
};

const StatusBadge = ({ status, t }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || 'bg-bg-3 text-ink-2 border-line'}`}
  >
    {status === 'pending' && t('admin.pending')}
    {status === 'approved' && t('admin.approved')}
    {status === 'rejected' && t('admin.rejected')}
  </span>
);

const RequestCard = ({ request, t, onReviewed }) => {
  const [mode, setMode] = useState(null); // 'approve' | 'reject'
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const [error, setError] = useState(false);
  const cardRef = useRef(null);

  const runAction = async (action) => {
    if (acting) return;
    if (action === 'approve') {
      if (!window.confirm(t('admin.confirmApprove', { name: request.artistName }))) {
        return;
      }
    }
    setActing(true);
    setError(false);
    try {
      const data = await artistService.reviewRequest(
        request._id,
        action,
        action === 'reject' ? reason.trim() || undefined : undefined,
      );
      toast.success(
        action === 'approve'
          ? t('admin.approvedMsg', { name: request.artistName })
          : t('admin.rejectedMsg'),
      );
      onReviewed();
    } catch (err) {
      setError(true);
      if (cardRef.current) shake(cardRef.current);
      toast.error(err.message || t('admin.error'));
    } finally {
      setActing(false);
      setMode(null);
      setReason('');
    }
  };

  const isPending = request.status === 'pending';

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border border-line bg-surface p-5 shadow-sm transition dark:shadow-black/20 ${
        isPending ? '' : 'opacity-80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Music2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">
              {request.artistName}
            </p>
            <p className="flex items-center gap-1.5 truncate text-xs text-ink-3">
              <UserIcon size={12} />
              {request.user?.name || '—'} · {request.email}
            </p>
          </div>
        </div>
        <StatusBadge status={request.status} t={t} />
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-3">{t('admin.colGenre')}</dt>
          <dd className="text-ink-2">{request.genre || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">{t('admin.colDate')}</dt>
          <dd className="text-ink-2">
            {request.createdAt
              ? new Date(request.createdAt).toLocaleDateString()
              : '—'}
          </dd>
        </div>
        {request.links ? (
          <div className="min-w-0">
            <dt className="text-xs text-ink-3">{t('admin.links')}</dt>
            <dd className="flex items-center gap-1 truncate text-ink-2">
              <Link2 size={12} className="shrink-0" />
              <span className="truncate">{request.links}</span>
            </dd>
          </div>
        ) : null}
      </dl>

      {request.description && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-bg-2 p-3 text-sm text-ink-2">
          {request.description}
        </p>
      )}

      {request.status === 'rejected' && request.reviewedBy && (
        <p className="mt-3 text-xs text-ink-3">
          {t('admin.rejectedBy', {
            by: request.reviewedBy,
            date: request.reviewedAt
              ? new Date(request.reviewedAt).toLocaleDateString()
              : '—',
          })}
        </p>
      )}

      {isPending && (
        <div className="mt-4 border-t border-line-soft pt-4">
          {mode === 'reject' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('admin.rejectReasonPh')}
                className="flex-1 rounded-lg border border-line bg-bg-2 px-3.5 py-2 text-sm text-ink outline-none transition focus:border-danger"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  disabled={acting}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-bg-3 disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => runAction('reject')}
                  disabled={acting || error}
                  className="inline-flex items-center gap-1.5 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {acting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}
                  {t('admin.reject')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runAction('approve')}
                disabled={acting}
                className="inline-flex items-center gap-1.5 rounded-full bg-success px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {acting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {t('admin.approve')}
              </button>
              <button
                type="button"
                onClick={() => setMode('reject')}
                disabled={acting}
                className="inline-flex items-center gap-1.5 rounded-full border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
              >
                <X size={14} />
                {t('admin.reject')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminPage = () => {
  const { user } = useContext(AuthContext);
  const { t } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);
  const mainRef = useReveal();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const load = useCallback(async (status) => {
    setLoading(true);
    try {
      const data = await artistService.listRequests(status);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      toast.error(error.message || t('admin.error'));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadCounts = useCallback(async () => {
    try {
      const data = await artistService.listRequests('');
      const list = data.requests || [];
      setCounts({
        all: list.length,
        pending: list.filter((r) => r.status === 'pending').length,
        approved: list.filter((r) => r.status === 'approved').length,
        rejected: list.filter((r) => r.status === 'rejected').length,
      });
    } catch {
      // los contadores son secundarios
    }
  }, []);

  useEffect(() => {
    if (user && user.isAdmin) {
      load(filter);
      loadCounts();
    }
  }, [user, filter, load, loadCounts]);

  useEffect(() => {
    if (listRef.current && requests.length) {
      staggerIn(listRef.current, '.admin-request-card', { step: 45 });
    }
  }, [requests]);

  if (!user) return null;

  if (!user.isAdmin) {
    return (
      <div className="principal-container">
        <TopBar />
        <main className="principal-content1">
          <div className="container flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
              <ShieldCheck size={30} />
            </div>
            <h1 className="text-2xl font-bold text-ink">{t('admin.accessDenied')}</h1>
          </div>
        </main>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="principal-container">
      <TopBar />
      <main className="principal-content1" ref={mainRef}>
        <div className="container">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">{t('admin.title')}</h1>
              <p className="text-sm text-ink-3">{t('admin.subtitle')}</p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === f.key
                    ? 'bg-accent text-white shadow-md'
                    : 'border border-line bg-surface text-ink-2 hover:bg-bg-3'
                }`}
              >
                {t(f.labelKey)}
                {f.key === 'pending' && counts.pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">
                    {counts.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="mb-4 text-sm text-ink-3">
            {t('admin.count', { n: loading ? '…' : requests.length })}
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-16 text-ink-3">
              <Loader2 size={20} className="animate-spin" />
              {t('admin.loading')}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
              <Inbox size={40} className="mb-3 text-ink-4" />
              <p className="text-ink-2">{t('admin.empty')}</p>
            </div>
          ) : (
            <div ref={listRef} className="flex flex-col gap-4">
              {requests.map((request) => (
                <div key={request._id} className="admin-request-card">
                  <RequestCard
                    request={request}
                    t={t}
                    onReviewed={() => {
                      load(filter);
                      loadCounts();
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomBar />
    </div>
  );
};

export default AdminPage;
