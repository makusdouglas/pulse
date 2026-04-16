import { Module } from '@nestjs/common';
import { ImportUseCasesModule } from '../../../data/use-cases-implementation/import/import-use-cases.module';
import { PreviewCsvController } from './preview-csv/controller';
import { DownloadTemplateController } from './download-template/controller';

@Module({
  imports: [ImportUseCasesModule],
  controllers: [PreviewCsvController, DownloadTemplateController],
})
export class ImportModule {}
