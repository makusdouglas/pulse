import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InfraModule } from './infra/infra.module';
import { ControllersModule } from './presentation/controllers/controllers.module';
import { JobsModule } from './infra/jobs/jobs.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InfraModule,
    ControllersModule,
    JobsModule,
  ],
})
export class AppModule {}
