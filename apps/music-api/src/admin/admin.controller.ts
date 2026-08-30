import { Controller, Post } from '@nestjs/common';
import { CountersService } from '../counters/counters.service';

@Controller('api/music/admin')
export class AdminController {
  constructor(private readonly countersService: CountersService) {}

  @Post('sync-counters')
  async syncCounters() {
    const synced = await this.countersService.syncAll();
    return {
      success: true,
      message: `${synced} contadores sincronizados`,
    };
  }
}
