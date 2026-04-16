import { ApiProperty } from '@nestjs/swagger';

export class ParseErrorDto {
  @ApiProperty({ example: 3 })
  row: number;

  @ApiProperty({ example: 'email' })
  field: string;

  @ApiProperty({ example: 'Invalid email format' })
  message: string;
}

export class PreviewCsvResponse {
  @ApiProperty({ example: 'members', enum: ['members', 'checkins', 'payments'] })
  entity_type: string;

  @ApiProperty({
    example: [{ name: 'Maria Silva', email: 'maria@email.com' }],
    description: 'Parsed rows as key-value objects',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  rows: Record<string, unknown>[];

  @ApiProperty({ type: [ParseErrorDto] })
  errors: ParseErrorDto[];

  @ApiProperty({ example: 150 })
  total_rows: number;
}
