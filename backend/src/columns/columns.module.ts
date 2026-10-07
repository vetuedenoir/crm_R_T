import { Module } from '@nestjs/common';

import { PersistenceModule } from '../persistence/index.js';

import { ColumnsController } from './columns.controller.js';
import { ColumnsService } from './columns.service.js';

@Module({
  imports: [PersistenceModule],
  controllers: [ColumnsController],
  providers: [ColumnsService],
})
export class ColumnsModule {}
