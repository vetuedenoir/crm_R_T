import { Module } from '@nestjs/common';

import { ConfigModule } from './config/index.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/index.js';
import { PersistenceModule } from './persistence/index.js';

// Les modules métier (colonnes, contacts...) s'ajoutent ici au fil des phases.
@Module({ imports: [ConfigModule, DatabaseModule, PersistenceModule, HealthModule] })
export class AppModule {}
