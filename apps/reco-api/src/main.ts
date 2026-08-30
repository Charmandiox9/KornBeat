import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);

  const corsOrigins = config.get<string[]>('reco.corsOrigins') ?? [];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Logging de requests solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalInterceptors(new LoggingInterceptor());
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KornBeat Recommendations API')
    .setDescription(
      'API híbrida de recomendaciones (Neo4j): REST + GraphQL (/api/recommendations/graphql) + WebSocket (/socket.io/reco, namespace sync: evento sync:completed).',
    )
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/recommendations/api-docs', app, swaggerDocument);

  const port = config.get<number>('reco.port') ?? 3003;
  await app.listen(port);
  Logger.log(
    `📊 reco-api escuchando en el puerto ${port}`,
    'Bootstrap',
  );
}

bootstrap().catch((err) => {
  Logger.error('No se pudo iniciar reco-api', 'Bootstrap', err);
  process.exit(1);
});
