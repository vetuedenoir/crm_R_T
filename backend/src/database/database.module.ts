import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { APP_CONFIG, type AppConfig } from '../config/index.js';

// Sans délai, une base figée bloquerait aussi `/api/health` et toute requête qui en dépend.
const DB_TIMEOUT_MS = 3000;
// Échec rapide si la base est absente (~3 s) : l'orchestrateur relance, plutôt qu'une attente silencieuse.
const DB_RETRY_ATTEMPTS = 3;
const DB_RETRY_DELAY_MS = 1000;

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        type: 'postgres',
        url: config.databaseUrl,
        autoLoadEntities: true,
        retryAttempts: DB_RETRY_ATTEMPTS,
        retryDelay: DB_RETRY_DELAY_MS,
        // Le schéma ne change que par migration (RULES §6).
        synchronize: false,
        extra: { connectionTimeoutMillis: DB_TIMEOUT_MS, statement_timeout: DB_TIMEOUT_MS },
      }),
    }),
  ],
})
export class DatabaseModule {}
