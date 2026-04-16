import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  gymId: string;

  @ApiProperty({ example: 'Maria Silva' })
  name: string;

  @ApiPropertyOptional({ example: 'maria@email.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  phone: string | null;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  enrolledAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'cancelled'] })
  status: string;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  updatedAt: Date;
}

export class LoadMembersResponse {
  @ApiProperty({ type: [MemberItemDto] })
  members: MemberItemDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  page_size: number;
}
