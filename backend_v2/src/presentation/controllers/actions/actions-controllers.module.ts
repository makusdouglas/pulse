import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller';
import { InfraModule } from '../../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [ActionsController],
})
export class ActionsControllersModule {}
