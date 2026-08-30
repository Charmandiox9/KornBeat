export interface CoverContext {
  protocol: string;
  host: string;
}

/**
 * Convierte un documento de canción agregando la URL completa de la portada
 * (paridad con coverUrlHelper.js legacy).
 */
export function processSongCoverUrl<T extends Record<string, any>>(
  song: T,
  ctx: CoverContext,
): T {
  const songObj: Record<string, any> = { ...song };
  const coverPath = songObj.coverUrl || songObj.portada_url;

  if (coverPath) {
    const cleanPath = String(coverPath).replace(/^covers\//, '');
    songObj.coverUrl = `${ctx.protocol}://${ctx.host}/api/music/covers/${cleanPath}`;
    delete songObj.portada_url;
  } else {
    songObj.coverUrl = null;
  }

  return songObj as T;
}

export function processSongsCoverUrls<T extends Record<string, any>>(
  songs: T[],
  ctx: CoverContext,
): T[] {
  return songs.map((song) => processSongCoverUrl(song, ctx));
}
