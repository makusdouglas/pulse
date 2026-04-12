import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { InfraModule } from '../../../infra/infra.module';
import { ImportUseCasesModule } from '../../../data/use-cases-implementation/import/import-use-cases.module';

@Module({
  imports: [InfraModule, ImportUseCasesModule],
  controllers: [ImportController],
})
export class ImportControllersModule {}
