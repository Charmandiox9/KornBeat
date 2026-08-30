import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';
import { MINIO_CLIENT } from './minio.constants';

@Global()
@Module({
  providers: [
    MinioService,
    {
      provide: MINIO_CLIENT,
      useFactory: (service: MinioService) => service.getClient(),
      inject: [MinioService],
    },
  ],
  exports: [MinioService, MINIO_CLIENT],
})
export class MinioModule {}
