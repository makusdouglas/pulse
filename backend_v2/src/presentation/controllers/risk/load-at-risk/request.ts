import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Tier } from '../../../../domain/enums';
import { PaginationQuery } from '../../../../shared/pagination.dto';

export class LoadAtRiskRequest extends PaginationQuery {
  @ApiPropertyOptional({ enum: Tier })
  @IsOptional()
  @IsEnum(Tier)
  tier?: Tier;
}
