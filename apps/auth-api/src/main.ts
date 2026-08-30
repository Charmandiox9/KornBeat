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

  const corsOrigins = config.get<string[]>('auth.corsOrigins') ?? [];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Logging de requests solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalInterceptors(new LoggingInterceptor());
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KornBeat Auth API')
    .setDescription(
      'REST API de autenticación (JWT access + refresh, sesiones en Redis). Este servicio es solo REST; GraphQL vive en music-api y reco-api.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('auth/api-docs', app, swaggerDocument);

  const port = config.get<number>('auth.port') ?? 3001;
  await app.listen(port);
  Logger.log(`🚀 auth-api escuchando en el puerto ${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error('No se pudo iniciar auth-api', 'Bootstrap', err);
  process.exit(1);
});
