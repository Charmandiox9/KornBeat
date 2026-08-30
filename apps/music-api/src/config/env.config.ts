import { registerAs } from '@nestjs/config';

export interface MusicConfig {
  port: number;
  mongoUri: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  jwtSecret: string;
  corsOrigins: string[];
  minio: {
    endpoint: string;
    port: number;
    useSsl: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  uploadsDir: string;
}

export default registerAs('music', (): MusicConfig => ({
  port: parseInt(process.env.PORT ?? '3002', 10),
  mongoUri:
    process.env.MONGODB_URI ??
    'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin',
  redisHost: process.env.REDIS_HOST ?? 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  jwtSecret: process.env.JWT_SECRET ?? 'change_me_in_production',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSsl: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.MINIO_BUCKET ?? 'music',
  },
  uploadsDir: process.env.UPLOADS_DIR ?? './uploads',
}));
