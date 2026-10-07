import { Module } from '@nestjs/common';

import { ConfigModule } from '../config/index.js';
import { DatabaseModule } from '../database/database.module.js';

import { SeedModule } from './seed.module.js';

// Contexte de la commande `npm run seed` : mêmes configuration et base que l'API, mais sans serveur HTTP.
@Module({ imports: [ConfigModule, DatabaseModule, SeedModule] })
export class SeedCommandModule {}
