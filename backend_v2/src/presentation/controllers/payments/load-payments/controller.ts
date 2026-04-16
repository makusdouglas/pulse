import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { ListPayments } from '../../../../domain/use-cases/payments/list-payments';
import { LoggedUser } from '../../../decorators';
import { LoadPaymentsSwagger } from './decorators';
import { LoadPaymentsRequest } from './request';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('payments')
export class LoadPaymentsController {
  constructor(private readonly listPayments: ListPayments) {}

  @Get()
  @LoadPaymentsSwagger()
  async handle(@LoggedUser() gymId: string, @Query() query: LoadPaymentsRequest) {
    const result = await this.listPayments.execute(gymId, {
      memberId: query.member_id,
      status: query.status,
      page: query.page,
      pageSize: query.page_size,
    });
    return {
      payments: result.payments,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    };
  }
}
