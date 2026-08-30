import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import neo4j, {
  Driver,
  Integer,
  QueryResult,
  Record as Neo4jRecord,
  Session,
} from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j.constants';

export interface RunResult {
  records: Neo4jRecord[];
}

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver) {}

  async onModuleDestroy(): Promise<void> {
    await this.driver.close().catch(() => undefined);
  }

  /**
   * Ejecuta una query Cypher en una sesión por request (paridad legacy).
   */
  async run(
    cypher: string,
    params?: Record<string, unknown>,
  ): Promise<RunResult> {
    const session: Session = this.driver.session();
    try {
      const result: QueryResult = await session.run(cypher, params ?? {});
      return { records: result.records };
    } finally {
      await session.close();
    }
  }

  verify(): Promise<RunResult> {
    return this.run('RETURN 1');
  }

  int(value: number | string | Integer): Integer {
    return neo4j.int(value);
  }

  toNumber(value: Integer | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
