import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { InfraModule } from '../../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [RiskController],
})
export class RiskControllersModule {}
