import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENTITIES } from './entities/index.js';
import { CellRepository, ColumnRepository, ContactRepository } from './repositories/index.js';

const REPOSITORIES = [ColumnRepository, ContactRepository, CellRepository];

// `forFeature` déclare les entités à la connexion (`autoLoadEntities`) ; les modules métier n'importent
// que ce module pour accéder aux données.
@Module({
  imports: [TypeOrmModule.forFeature(ENTITIES)],
  providers: REPOSITORIES,
  exports: REPOSITORIES,
})
export class PersistenceModule {}
