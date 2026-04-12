import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiPropertyOptional } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { PaymentRepository } from '../../../data/protocols/payment-repository';
import { PaymentStatus } from '../../../domain/enums';
import { PaginationQuery } from '../../../shared/pagination.dto';

class ListPaymentsRequest extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  member_id?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiResponse({ status: 200, description: 'Paginated payments' })
  async list(@Req() req: Request, @Query() query: ListPaymentsRequest) {
    const gymId = (req as any).gymUuid;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;

    const { payments, total } = await this.paymentRepo.findByGym(gymId, {
      memberId: query.member_id,
      status: query.status,
      page,
      pageSize,
    });

    return { payments, total, page, page_size: pageSize };
  }
}
