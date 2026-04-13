import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../../../domain/enums';
import { PaginationQuery } from '../../../../shared/pagination.dto';

export class LoadPaymentsRequest extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  member_id?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
