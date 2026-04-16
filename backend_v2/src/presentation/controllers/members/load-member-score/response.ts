import { ApiProperty } from '@nestjs/swagger';

export class ScoreSignalsDto {
  @ApiProperty({ example: 15, description: 'Days without training' })
  diasSemTreino: number;

  @ApiProperty({ example: 30, description: 'Frequency drop percentage' })
  quedaFrequencia: number;

  @ApiProperty({ example: 20, description: 'Payment delinquency score' })
  inadimplencia: number;

  @ApiProperty({ example: 10, description: 'Session duration drop' })
  quedaDuracao: number;

  @ApiProperty({ example: 5, description: 'Low frequency score' })
  baixaFrequencia: number;

  @ApiProperty({ example: 0, description: 'Payment history score' })
  historicoPagamento: number;

  @ApiProperty({ example: 0, description: 'New member score' })
  alunoNovo: number;
}

export class LoadMemberScoreResponse {
  @ApiProperty({ example: 72 })
  score: number;

  @ApiProperty({ example: 'critical', enum: ['critical', 'medium', 'low', 'safe'] })
  tier: string;

  @ApiProperty({ example: ['14 dias sem treinar', 'Queda de frequencia de 40%'], type: [String] })
  reasons: string[];

  @ApiProperty({ type: ScoreSignalsDto })
  signals: ScoreSignalsDto;

  @ApiProperty({ example: '2024-06-15' })
  computed_at: string;
}
