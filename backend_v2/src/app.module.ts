import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InfraModule } from './infra/infra.module';
import { ControllersModule } from './presentation/controllers/controllers.module';

@Module({
  imports: [ScheduleModule.forRoot(), InfraModule, ControllersModule],
})
export class AppModule {}
