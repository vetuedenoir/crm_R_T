import type { ColumnTypeName } from '../api';

import type { ColumnTypeUi } from './column-type-ui';
import { DATE_TYPE_UI } from './date-type';
import { NUMBER_TYPE_UI } from './number-type';
import { PHONE_TYPE_UI } from './phone-type';
import { TEXT_TYPE_UI } from './text-type';

// `satisfies` : ajouter un nom dans `COLUMN_TYPE_NAMES` sans l'enregistrer ici ne compile pas.
// Ajouter un type de colonne = un fichier `*-type.pure.ts` + `*-type.tsx` + une entrée ici.
export const COLUMN_TYPE_UI = {
  text: TEXT_TYPE_UI,
  number: NUMBER_TYPE_UI,
  date: DATE_TYPE_UI,
  phone: PHONE_TYPE_UI,
} as const satisfies { readonly [K in ColumnTypeName]: ColumnTypeUi<K> };
