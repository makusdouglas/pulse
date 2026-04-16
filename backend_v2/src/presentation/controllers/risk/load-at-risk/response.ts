import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AtRiskMemberDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  member_id: string;

  @ApiProperty({ example: 'Maria Silva' })
  member_name: string;

  @ApiPropertyOptional({ example: 'maria@email.com', nullable: true })
  member_email: string | null;

  @ApiProperty({ example: 72 })
  score: number;

  @ApiProperty({ example: 'critical', enum: ['critical', 'medium', 'low', 'safe'] })
  tier: string;

  @ApiProperty({ example: ['14 dias sem treinar', 'Queda de frequencia de 40%'], type: [String] })
  reasons: string[];

  @ApiProperty({ example: '2024-06-15T00:00:00.000Z' })
  computed_at: Date;
}

export class AtRiskTierCountsDto {
  @ApiProperty({ example: 5 })
  critical: number;

  @ApiProperty({ example: 12 })
  medium: number;

  @ApiProperty({ example: 8 })
  low: number;

  @ApiProperty({ example: 75 })
  safe: number;
}

export class LoadAtRiskResponse {
  @ApiProperty({ type: [AtRiskMemberDto] })
  members: AtRiskMemberDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  page_size: number;

  @ApiProperty({ type: AtRiskTierCountsDto })
  tier_counts: AtRiskTierCountsDto;
}
