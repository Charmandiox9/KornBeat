import { Controller, Get } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Controller()
export class HealthController {
  constructor(private readonly neo4jService: Neo4jService) {}

  @Get('health')
  async health() {
    try {
      await this.neo4jService.verify();
      return { status: 'healthy', neo4j: 'connected' };
    } catch {
      return { status: 'unhealthy', neo4j: 'disconnected' };
    }
  }
}
