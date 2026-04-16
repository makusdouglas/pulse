import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  gymId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002', nullable: true })
  memberId: string | null;

  @ApiProperty({ example: 'churn_alert', enum: ['churn_alert', 'action_result', 'payment_alert', 'system'] })
  type: string;

  @ApiProperty({ example: 'Alerta de churn: Maria Silva' })
  title: string;

  @ApiPropertyOptional({ example: 'Score subiu para 72 (critico)', nullable: true })
  description: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  createdAt: Date;
}

export class LoadNotificationsResponse {
  @ApiProperty({ type: [NotificationItemDto] })
  notifications: NotificationItemDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  page_size: number;

  @ApiProperty({ example: 3 })
  unread_count: number;
}
