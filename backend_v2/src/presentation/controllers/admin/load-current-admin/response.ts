import { ApiProperty } from '@nestjs/swagger';

export class LoadCurrentAdminResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'admin@pulse.com' })
  email: string;

  @ApiProperty({ example: 'Admin User' })
  name: string;

  @ApiProperty({ example: 'superadmin', enum: ['superadmin', 'finance', 'support'] })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-15T10:30:00.000Z' })
  updatedAt: Date;
}
