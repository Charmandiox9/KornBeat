/**
 * CLI de sincronización MongoDB -> Neo4j (paridad con `node sync-service.js`).
 * Uso: pnpm --filter @kornbeat/reco-api sync
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync/sync.module';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const syncService = app.get(SyncService);
  await syncService.fullSync();

  await app.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
