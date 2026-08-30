/**
 * CLI de importación de música (paridad con importMusic.js legacy).
 * Uso: pnpm --filter @kornbeat/music-api import:music
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ImportService } from '../src/import/import.module';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const importService = app.get(ImportService);
  await importService.importMusic();

  await app.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error en importMusic:', err);
  process.exit(1);
});
