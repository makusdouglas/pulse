import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENV } from '../../config/env';
import { SeedsModule } from './seeds.module';
import { SeedRunner } from './seed.runner';
import { GymEntity } from '../entities/gym.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: ENV.DATABASE_URL,
      entities: [GymEntity],
      synchronize: false,
    }),
    SeedsModule,
  ],
})
class SeedAppModule {}

async function bootstrap() {
  const logger = new Logger('SeedCLI');

  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.replace('--only=', '').split(',') : undefined;

  const app = await NestFactory.createApplicationContext(SeedAppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const runner = app.get(SeedRunner);
    await runner.execute(only);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
