import { err, ok, type Result } from '../../result.js';
import { assertNever } from '../assert-never.js';
import type { CellValue, StoredCell, ValidationError } from '../cell.js';
import type { ColumnTypeDefinition } from '../column-type-definition.js';
import type { ColumnTypeName } from '../column-type-name.js';

import { DATE_TYPE } from './date-type.pure.js';
import { NUMBER_TYPE } from './number-type.pure.js';
import { PHONE_TYPE } from './phone-type.pure.js';
import { TEXT_TYPE } from './text-type.pure.js';

// `satisfies` : ajouter un nom dans `COLUMN_TYPE_NAMES` sans l'enregistrer ici ne compile pas.
export const COLUMN_TYPES = {
  text: TEXT_TYPE,
  number: NUMBER_TYPE,
  date: DATE_TYPE,
  phone: PHONE_TYPE,
} as const satisfies { readonly [K in ColumnTypeName]: ColumnTypeDefinition<K, unknown> };

// Les deux fonctions ci-dessous sont les seuls `switch` sur le type : ils relient la valeur brute
// de chaque définition à l'union `CellValue`, et ne compilent plus dès qu'un type est oublié.
export function parseCellValue(
  type: ColumnTypeName,
  raw: unknown,
): Result<CellValue, ValidationError> {
  switch (type) {
    case 'text': {
      const parsed = COLUMN_TYPES.text.parse(raw);
      return parsed.ok ? ok({ type, value: parsed.value }) : err(parsed.error);
    }
    case 'number': {
      const parsed = COLUMN_TYPES.number.parse(raw);
      return parsed.ok ? ok({ type, value: parsed.value }) : err(parsed.error);
    }
    case 'date': {
      const parsed = COLUMN_TYPES.date.parse(raw);
      return parsed.ok ? ok({ type, value: parsed.value }) : err(parsed.error);
    }
    case 'phone': {
      const parsed = COLUMN_TYPES.phone.parse(raw);
      return parsed.ok ? ok({ type, value: parsed.value }) : err(parsed.error);
    }
    default:
      return assertNever(type);
  }
}

export function serializeCellValue(cell: CellValue): StoredCell {
  switch (cell.type) {
    case 'text':
      return COLUMN_TYPES.text.serialize(cell.value);
    case 'number':
      return COLUMN_TYPES.number.serialize(cell.value);
    case 'date':
      return COLUMN_TYPES.date.serialize(cell.value);
    case 'phone':
      return COLUMN_TYPES.phone.serialize(cell.value);
    default:
      return assertNever(cell);
  }
}
