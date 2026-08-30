import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { SyncGateway } from './sync.gateway';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class SyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
    private readonly syncGateway: SyncGateway,
    private readonly recoService: RecommendationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const intervalMinutes =
      this.configService.get<number>('reco.syncIntervalMinutes') ?? 30;

    if (this.configService.get<boolean>('reco.autoSyncOnStart')) {
      // Sincronización inicial diferida (paridad legacy: setTimeout 5s)
      setTimeout(() => {
        this.runSync().catch((err) =>
          this.logger.error('Error en sync inicial:', err),
        );
      }, 5000);
      this.logger.log(
        `AUTO_SYNC_ON_START=true — sync inicial en 5s, luego cada ${intervalMinutes} min`,
      );
    } else {
      this.logger.log(
        `AUTO_SYNC_ON_START=false — sync periódico cada ${intervalMinutes} min`,
      );
    }

    this.timer = setInterval(
      () => {
        this.runSync().catch((err) =>
          this.logger.error('Error en sync periódico:', err),
        );
      },
      intervalMinutes * 60 * 1000,
    );
  }

  private async runSync(): Promise<void> {
    if (this.running) {
      this.logger.warn('Ya hay una sincronización en curso; se omite.');
      return;
    }
    this.running = true;
    try {
      const stats = await this.syncService.fullSync();
      this.syncGateway.emitSyncCompleted(stats);
      const invalidadas = await this.recoService.invalidateCache();
      this.logger.log(
        `Sync emitido por WS: ${JSON.stringify(stats)} (${invalidadas} claves de caché invalidadas)`,
      );
    } finally {
      this.running = false;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
