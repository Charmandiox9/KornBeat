import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER } from './neo4j.constants';
import { Neo4jService } from './neo4j.service';

@Global()
@Module({
  providers: [
    {
      provide: NEO4J_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Driver => {
        const uri = config.get<string>('reco.neo4j.uri');
        const user = config.get<string>('reco.neo4j.user');
        const password = config.get<string>('reco.neo4j.password');
        return neo4j.driver(
          uri ?? 'bolt://localhost:7687',
          neo4j.auth.basic(user ?? 'neo4j', password ?? 'password'),
        );
      },
    },
    Neo4jService,
  ],
  exports: [NEO4J_DRIVER, Neo4jService],
})
export class Neo4jModule {}
