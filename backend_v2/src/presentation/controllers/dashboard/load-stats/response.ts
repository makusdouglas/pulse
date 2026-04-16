import { ApiProperty } from '@nestjs/swagger';

export class TierCountsDto {
  @ApiProperty({ example: 5, description: 'Number of critical-risk members' })
  critical: number;

  @ApiProperty({ example: 12, description: 'Number of medium-risk members' })
  medium: number;

  @ApiProperty({ example: 8, description: 'Number of low-risk members' })
  low: number;

  @ApiProperty({ example: 75, description: 'Number of safe members' })
  safe: number;
}

export class RecentScoreDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  member_id: string;

  @ApiProperty({ example: 'Maria Silva' })
  member_name: string;

  @ApiProperty({ example: 72 })
  score: number;

  @ApiProperty({ example: 'critical', enum: ['critical', 'medium', 'low', 'safe'] })
  tier: string;
}

export class LoadStatsResponse {
  @ApiProperty({ example: 100 })
  total_members: number;

  @ApiProperty({ example: 85 })
  active_members: number;

  @ApiProperty({ example: 17 })
  at_risk_count: number;

  @ApiProperty({ type: TierCountsDto })
  tier_counts: TierCountsDto;

  @ApiProperty({ example: 28.5 })
  avg_score: number;

  @ApiProperty({ type: [RecentScoreDto] })
  recent_scores: RecentScoreDto[];
}
