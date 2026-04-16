import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoadSettingsResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Academia Pulse' })
  name: string;

  @ApiProperty({ example: 'academia-pulse' })
  slug: string;

  @ApiPropertyOptional({ example: 'contato@academiapulse.com.br', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: 'org_2abc123', nullable: true })
  clerkOrgId: string | null;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  updatedAt: Date;
}
