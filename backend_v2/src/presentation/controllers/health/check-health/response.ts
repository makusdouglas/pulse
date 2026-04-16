import { ApiProperty } from '@nestjs/swagger';

export class CheckHealthResponse {
  @ApiProperty({ example: 'ok' })
  status: string;
}
