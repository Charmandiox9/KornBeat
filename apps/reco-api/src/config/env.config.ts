import { registerAs } from '@nestjs/config';

export interface RecoConfig {
  port: number;
  mongoUri: string;
  neo4j: {
    uri: string;
    user: string;
    password: string;
  };
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisCacheTtl: number;
  syncIntervalMinutes: number;
  syncHistoryDays: number;
  autoSyncOnStart: boolean;
  corsOrigins: string[];
}

export default registerAs('reco', (): RecoConfig => ({
  port: parseInt(process.env.PORT ?? '3003', 10),
  mongoUri:
    process.env.MONGODB_URI ??
    'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin',
  neo4j: {
    uri: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    user: process.env.NEO4J_USER ?? 'neo4j',
    password: process.env.NEO4J_PASSWORD ?? 'password',
  },
  redisHost: process.env.REDIS_HOST ?? 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisCacheTtl: parseInt(process.env.REDIS_CACHE_TTL ?? '300', 10),
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES ?? '30', 10),
  syncHistoryDays: parseInt(process.env.SYNC_HISTORY_DAYS ?? '30', 10),
  autoSyncOnStart: (process.env.AUTO_SYNC_ON_START ?? 'true') === 'true',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}));
