import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  memberId: string;

  @ApiProperty({ example: 'Maria Silva' })
  memberName: string;

  @ApiProperty({ example: 149.9 })
  amount: number;

  @ApiProperty({ example: '2024-06-15T00:00:00.000Z' })
  dueDate: Date;

  @ApiPropertyOptional({ example: '2024-06-14T15:30:00.000Z', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ example: 'paid', enum: ['pending', 'paid', 'overdue', 'cancelled'] })
  status: string;
}

export class LoadPaymentsResponse {
  @ApiProperty({ type: [PaymentItemDto] })
  payments: PaymentItemDto[];

  @ApiProperty({ example: 200 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  page_size: number;
}
