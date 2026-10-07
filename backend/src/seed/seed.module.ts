import { Module } from '@nestjs/common';

import { PersistenceModule } from '../persistence/index.js';

import { SeedService } from './seed.service.js';

@Module({ imports: [PersistenceModule], providers: [SeedService], exports: [SeedService] })
export class SeedModule {}
