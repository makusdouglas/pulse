import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActionItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  memberId: string;

  @ApiProperty({ example: 'Maria Silva' })
  memberName: string;

  @ApiProperty({ example: 'retention_call' })
  actionType: string;

  @ApiProperty({ example: 'whatsapp', enum: ['whatsapp', 'email', 'phone', 'in_person', 'other'] })
  channel: string;

  @ApiPropertyOptional({ example: 'Oi Maria, sentimos sua falta!', nullable: true })
  message: string | null;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  sentAt: Date;

  @ApiPropertyOptional({ example: 'delivered', enum: ['delivered', 'read', 'replied', 'failed', 'pending'], nullable: true })
  result: string | null;
}

export class LoadActionsResponse {
  @ApiProperty({ type: [ActionItemDto] })
  actions: ActionItemDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  page_size: number;
}
