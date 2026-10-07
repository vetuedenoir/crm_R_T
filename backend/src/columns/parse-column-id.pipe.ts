import { Injectable, type PipeTransform } from '@nestjs/common';

import type { ColumnId } from '../ids.pure.js';
import { parseColumnId } from '../ids.pure.js';

import { invalidField } from './column-errors.pure.js';

// Un id mal formé est refusé ici (422, champ `id`) plutôt qu'au contact de PostgreSQL.
@Injectable()
export class ParseColumnIdPipe implements PipeTransform<unknown, ColumnId> {
  transform(value: unknown): ColumnId {
    const parsed = parseColumnId(value);
    if (!parsed.ok) {
      throw invalidField('id', parsed.error);
    }
    return parsed.value;
  }
}
