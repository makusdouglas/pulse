import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { ListPayments } from '../../../domain/use-cases/payments/list-payments';
import { ListPaymentsService } from './list-payments.service';

@Module({
  imports: [InfraModule],
  providers: [{ provide: ListPayments, useClass: ListPaymentsService }],
  exports: [ListPayments],
})
export class PaymentsUseCasesModule {}
