import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActionResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  memberId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  gymId: string;

  @ApiProperty({ example: 'retention_call' })
  actionType: string;

  @ApiProperty({ example: 'whatsapp', enum: ['whatsapp', 'email', 'phone', 'in_person', 'other'] })
  channel: string;

  @ApiPropertyOptional({ example: 'Oi Maria, sentimos sua falta!', nullable: true })
  message: string | null;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  sentAt: Date;

  @ApiPropertyOptional({ example: 'pending', enum: ['delivered', 'read', 'replied', 'failed', 'pending'], nullable: true })
  result: string | null;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  createdAt: Date;
}
