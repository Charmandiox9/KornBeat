import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  port: number;
  mongoUri: string;
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  corsOrigins: string[];
}

export default registerAs('auth', (): AuthConfig => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  mongoUri:
    process.env.MONGODB_URI ??
    'mongodb://admin:admin123@localhost:27017/music_app?authSource=admin',
  redisHost: process.env.REDIS_HOST ?? 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  jwtSecret: process.env.JWT_SECRET ?? 'change_me_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}));
