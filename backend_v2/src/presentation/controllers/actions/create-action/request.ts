import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ActionChannel } from '../../../../domain/enums';

export class CreateActionRequest {
  @ApiProperty()
  @IsUUID()
  member_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  action_type: string;

  @ApiProperty({ enum: ActionChannel })
  @IsEnum(ActionChannel)
  channel: ActionChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
