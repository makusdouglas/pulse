import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { InfraModule } from '../../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [PaymentsController],
})
export class PaymentsControllersModule {}
