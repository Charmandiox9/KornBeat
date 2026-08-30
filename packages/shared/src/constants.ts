export const PORTS = {
  web: 3000,
  auth: 3001,
  music: 3002,
  reco: 3003,
} as const;

export const MONGO_COLLECTIONS = {
  usuarios: 'usuarios',
  songs: 'songs',
  canciones: 'canciones',
  playlists: 'playlists',
  likes: 'likes_canciones',
  artistas: 'artistas',
  albumes: 'albumes',
  artistRequests: 'artist_requests',
} as const;

export const REDIS_KEYS = {
  userCache: (userId: string) => `cache:user:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user_sessions:${userId}`,
  refreshToken: (token: string) => `refresh_token:${token}`,
  songCache: (songId: string) => `cache:song:${songId}`,
  queryCache: (queryKey: string) => `cache:query:${queryKey}`,
  songCounter: (songId: string, type: 'plays' | 'likes') =>
    `counter:song:${songId}:${type}`,
  userRecentSongs: (userId: string) => `user:${userId}:recent_songs`,
  userReelPosition: (userId: string) => `user:${userId}:reel_position`,
  userReelHistory: (userId: string) => `user:${userId}:reel_history`,
  topGlobalCache: (limit: number, offset: number) =>
    `top-global:${limit}:${offset}`,
  topCountryCache: (country: string, limit: number, offset: number) =>
    `top-country:${country.toUpperCase()}:${limit}:${offset}`,
  recoUserCache: (userId: string, kind: string, limit: number) =>
    `reco:user:${userId}:${kind}:${limit}`,
  songsListCache: () => `cache:query:songs:all`,
} as const;

export const REDIS_TTL = {
  userCache: 3600,
  session: 7200,
  refreshToken: 604800,
  songCache: 3600,
  queryCache: 300,
  recentSongs: 86400,
  reelPosition: 604800,
  reelHistory: 604800,
  recoCache: 300,
} as const;

export const RATE_LIMITS = {
  global: { limit: 100, ttlMs: 60_000 },
  login: { limit: 10, ttlMs: 300_000 },
  register: { limit: 3, ttlMs: 3_600_000 },
} as const;

export const COUNTER_SYNC_EVERY = 10;

export const REEL_HISTORY_MAX = 100;
