import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppError } from '../errors/index.js';

import type { HealthReport } from './health.dto.js';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  // Un `SELECT 1` prouve que l'API sait joindre la base : c'est ce que l'orchestrateur doit savoir.
  async check(): Promise<HealthReport> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (cause) {
      throw new AppError('UNAVAILABLE', 'Base de données indisponible', [], { cause });
    }
    return { status: 'ok', database: 'up' };
  }
}
