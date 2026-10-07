import { CreateCellIndexes1760000000002 } from './create-cell-indexes.migration.js';
import { CreateSchema1760000000001 } from './create-schema.migration.js';
import { SeedDefaultColumns1760000000003 } from './seed-default-columns.migration.js';

// Liste explicite plutôt qu'un glob : fonctionne à l'identique en ESM compilé et sous Jest.
export const MIGRATIONS = [
  CreateSchema1760000000001,
  CreateCellIndexes1760000000002,
  SeedDefaultColumns1760000000003,
];
