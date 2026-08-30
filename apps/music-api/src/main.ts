import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  const corsOrigins = config.get<string[]>('music.corsOrigins') ?? [];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Logging de requests solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalInterceptors(new LoggingInterceptor());
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KornBeat Music API')
    .setDescription(
      'API híbrida de música: REST + GraphQL (/api/music/graphql) + WebSocket (/socket.io/music, namespace counters: eventos counters:pending).',
    )
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/music/api-docs', app, swaggerDocument);

  const port = config.get<number>('music.port') ?? 3002;
  await app.listen(port);
  Logger.log(`🎵 music-api escuchando en el puerto ${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error('No se pudo iniciar music-api', 'Bootstrap', err);
  process.exit(1);
});
