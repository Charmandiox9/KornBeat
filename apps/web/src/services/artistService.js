/**
 * Servicio de artista: solicitudes de artista (auth-api) y
 * música del artista (music-api).
 */

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
});

const json = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data.message || (typeof data.error === 'string' ? data.error : null) ||
      `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const artistService = {
  // ---------- Solicitudes de artista (auth-api) ----------

  /** Estado de la solicitud del usuario logueado. */
  async getMyRequest() {
    const res = await fetch('/auth/artist-requests/me', {
      headers: authHeaders(),
    });
    return json(res);
  },

  /**
   * Envía una solicitud de artista.
   * payload: { artistName, genre?, description?, links? }
   */
  async submitRequest(payload) {
    const res = await fetch('/auth/artist-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return json(res);
  },

  // ---------- Admin (auth-api) ----------

  /** Lista de solicitudes (status: 'pending' | 'approved' | 'rejected' | ''). */
  async listRequests(status = '') {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/auth/admin/artist-requests${qs}`, {
      headers: authHeaders(),
    });
    return json(res);
  },

  /** Acepta o rechaza una solicitud. action: 'approve' | 'reject'. */
  async reviewRequest(id, action, reason) {
    const res = await fetch(`/auth/admin/artist-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action, reason }),
    });
    return json(res);
  },

  // ---------- Mi Música (music-api) ----------

  /** Álbamos + sencillos del artista logueado. */
  async getMyMusic() {
    const res = await fetch('/api/music/artist/me', {
      headers: authHeaders(),
    });
    return json(res);
  },

  /** Crea un álbum. payload: { titulo, year?, descripcion? } */
  async createAlbum(payload) {
    const res = await fetch('/api/music/artist/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return json(res);
  },

  async deleteAlbum(id) {
    const res = await fetch(`/api/music/artist/albums/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return json(res);
  },

  /**
   * Sube un sencillo (.mp3).
   * file: File | Blob, titulo?: string, genero?: string
   */
  async uploadSingle(file, titulo, genero) {
    const form = new FormData();
    form.append('file', file);
    if (titulo) form.append('titulo', titulo);
    if (genero) form.append('genero', genero);
    const res = await fetch('/api/music/artist/singles', {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    return json(res);
  },

  /** Sube una canción a un álbum (.mp3). */
  async uploadSongToAlbum(albumId, file, titulo, genero) {
    const form = new FormData();
    form.append('file', file);
    if (titulo) form.append('titulo', titulo);
    if (genero) form.append('genero', genero);
    const res = await fetch(`/api/music/artist/albums/${albumId}/songs`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    return json(res);
  },

  async deleteSong(id) {
    const res = await fetch(`/api/music/artist/songs/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return json(res);
  },
};

export default artistService;
