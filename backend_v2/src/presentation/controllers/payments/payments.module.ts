import { Module } from '@nestjs/common';
import { PaymentsUseCasesModule } from '../../../data/use-cases-implementation/payments/payments-use-cases.module';
import { LoadPaymentsController } from './load-payments/controller';

@Module({
  imports: [PaymentsUseCasesModule],
  controllers: [LoadPaymentsController],
})
export class PaymentsModule {}
