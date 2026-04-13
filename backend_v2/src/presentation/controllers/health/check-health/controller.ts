import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CheckHealthSwagger } from './decorators';

@ApiTags('Health')
@Controller('health')
export class CheckHealthController {
  @Get()
  @CheckHealthSwagger()
  async handle() {
    return { status: 'ok' };
  }
}
