import type { ColumnId, ContactId } from '../ids.pure.js';
import { err, ok, type Result } from '../result.js';

import type { QueryColumn } from './build-contacts-query.pure.js';
import type { CellValue, StorageColumn, ValidationError } from './cell.js';
import type { ColumnTypeName } from './column-type-name.js';
import { COLUMN_TYPES, parseCellValue } from './column-types/registry.pure.js';
import type { CellRow, Contact } from './column.js';

// Une valeur illisible est une anomalie d'intégrité : on la signale au lieu de l'omettre en silence.
export interface AssembleError {
  readonly contactId: ContactId;
  readonly columnId: ColumnId;
  readonly message: string;
}

const ROW_FIELD_BY_STORAGE = {
  value_text: 'valueText',
  value_number: 'valueNumber',
  value_date: 'valueDate',
} as const satisfies Record<StorageColumn, keyof CellRow>;

// La ligne existe, donc la colonne de valeur propre au type doit être renseignée.
function parseRow(row: CellRow, type: ColumnTypeName): Result<CellValue, ValidationError> {
  const raw = row[ROW_FIELD_BY_STORAGE[COLUMN_TYPES[type].storage]];
  return raw === null || raw === undefined
    ? err({ message: 'La cellule existe mais sa valeur est absente' })
    : parseCellValue(type, raw);
}

// Regroupe les cellules par contact, dans l'ordre des ids reçus (celui de la page triée et filtrée).
export function assembleContacts(
  contactIds: ReadonlyArray<ContactId>,
  rows: ReadonlyArray<CellRow>,
  columns: ReadonlyArray<QueryColumn>,
): Result<ReadonlyArray<Contact>, AssembleError> {
  const types = new Map(columns.map((column) => [column.id, column.type] as const));
  const cellsByContact = new Map<ContactId, Map<ColumnId, CellValue>>(
    contactIds.map((id) => [id, new Map()] as const),
  );
  for (const row of rows) {
    const type = types.get(row.columnId);
    const cells = cellsByContact.get(row.contactId);
    // Les deux requêtes ne partagent pas de transaction : une colonne créée entre elles
    // n'est pas dans l'instantané `columns` du client, et ses cellules sont ignorées à dessein.
    if (type === undefined || cells === undefined) {
      continue;
    }
    const cell = parseRow(row, type);
    if (!cell.ok) {
      return err({ contactId: row.contactId, columnId: row.columnId, message: cell.error.message });
    }
    cells.set(row.columnId, cell.value);
  }
  return ok(
    contactIds.map((id) => ({ id, cells: Object.fromEntries(cellsByContact.get(id) ?? []) })),
  );
}
