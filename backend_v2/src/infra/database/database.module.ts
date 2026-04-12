import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENV } from '../config/env';
import { RepositoriesModule } from './repositories/repositories.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: ENV.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
    }),
    RepositoriesModule,
  ],
  exports: [TypeOrmModule, RepositoriesModule],
})
export class DatabaseModule {}
