import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Db, MongoClient } from 'mongodb';
import { MONGO_CLIENT, MONGO_DB } from './sync.constants';

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<MongoClient> => {
        const uri = config.get<string>('reco.mongoUri');
        const client = new MongoClient(uri ?? 'mongodb://localhost:27017');
        await client.connect();
        return client;
      },
    },
    {
      provide: MONGO_DB,
      inject: [MONGO_CLIENT],
      useFactory: (client: MongoClient): Db => client.db('music_app'),
    },
  ],
  exports: [MONGO_CLIENT, MONGO_DB],
})
export class MongoModule {}
