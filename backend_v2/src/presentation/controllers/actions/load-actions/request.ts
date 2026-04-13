import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQuery } from '../../../../shared/pagination.dto';

export class LoadActionsRequest extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  member_id?: string;
}
