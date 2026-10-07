import { describe, expect, it } from 'vitest';

import type { Column, ColumnTypeName, FilterOperator } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';
import { DEFAULT_COLUMNS } from '../mocks';

import {
  INITIAL_FILTER_DRAFT,
  buildFilter,
  filterDraftReducer,
  resolveDraft,
  type FilterDraft,
} from './filter-draft.pure';

const [NAME, , PHONE, DATE, SCORE] = DEFAULT_COLUMNS;
if (NAME === undefined || PHONE === undefined || DATE === undefined || SCORE === undefined) {
  throw new Error('Colonnes de test manquantes');
}

function operatorsFor(type: ColumnTypeName): ReadonlyArray<FilterOperator> {
  return COLUMN_TYPE_UI[type].filterOperators;
}

describe('filterDraftReducer', () => {
  const typed: FilterDraft = {
    columnId: SCORE.id,
    operator: 'between',
    values: ['1', '2'],
    error: 'Une valeur est requise',
  };

  it('changer de colonne efface l’opérateur et les valeurs, qui n’ont plus de sens', () => {
    const next = filterDraftReducer(typed, { type: 'select-column', columnId: NAME.id });

    expect(next).toEqual({ columnId: NAME.id, operator: null, values: [], error: null });
  });

  it('changer d’opérateur efface les valeurs et l’erreur', () => {
    const next = filterDraftReducer(typed, { type: 'select-operator', operator: 'equals' });

    expect(next).toEqual({ columnId: SCORE.id, operator: 'equals', values: [], error: null });
  });

  it('saisir une valeur efface l’erreur affichée', () => {
    const next = filterDraftReducer(typed, { type: 'change-values', values: ['3', ''] });

    expect(next.values).toEqual(['3', '']);
    expect(next.error).toBeNull();
  });

  it('garde la saisie quand le filtre est refusé', () => {
    const next = filterDraftReducer(
      { ...typed, error: null },
      { type: 'rejected', error: 'Le nombre est invalide' },
    );

    expect(next).toEqual({ ...typed, error: 'Le nombre est invalide' });
  });

  it('après un ajout, vide les valeurs mais garde colonne et opérateur', () => {
    const next = filterDraftReducer(typed, { type: 'filter-added' });

    expect(next).toEqual({ columnId: SCORE.id, operator: 'between', values: [], error: null });
  });
});

describe('resolveDraft', () => {
  it('propose la première colonne et son premier opérateur par défaut', () => {
    const resolved = resolveDraft(INITIAL_FILTER_DRAFT, DEFAULT_COLUMNS, operatorsFor);

    expect(resolved).toEqual({ column: NAME, operator: 'contains' });
  });

  it('garde un choix encore valide', () => {
    const draft: FilterDraft = { ...INITIAL_FILTER_DRAFT, columnId: SCORE.id, operator: 'between' };

    expect(resolveDraft(draft, DEFAULT_COLUMNS, operatorsFor)).toEqual({
      column: SCORE,
      operator: 'between',
    });
  });

  it('retombe sur le premier opérateur quand le type n’a pas celui choisi', () => {
    const draft: FilterDraft = { ...INITIAL_FILTER_DRAFT, columnId: DATE.id, operator: 'contains' };

    expect(resolveDraft(draft, DEFAULT_COLUMNS, operatorsFor)?.operator).toBe('equals');
  });

  it('retombe sur la première colonne quand celle choisie n’existe plus', () => {
    const draft: FilterDraft = { ...INITIAL_FILTER_DRAFT, columnId: PHONE.id };

    expect(resolveDraft(draft, [NAME], operatorsFor)?.column).toBe(NAME);
  });

  it('retourne `null` sans colonne', () => {
    expect(resolveDraft(INITIAL_FILTER_DRAFT, [], operatorsFor)).toBeNull();
  });
});

describe('buildFilter', () => {
  interface Case {
    readonly label: string;
    readonly column: Column;
    readonly operator: FilterOperator;
    readonly drafts: ReadonlyArray<string>;
  }

  function build({ column, operator, drafts }: Case): ReturnType<typeof buildFilter> {
    const typeUi = COLUMN_TYPE_UI[column.type];
    return buildFilter(column, operator, drafts, (op, values) =>
      typeUi.parseFilterValues(op, values),
    );
  }

  const valid: ReadonlyArray<Case & { readonly values: ReadonlyArray<string | number> }> = [
    { label: 'texte', column: NAME, operator: 'contains', drafts: ['  ada '], values: ['ada'] },
    {
      label: 'nombre (virgule)',
      column: SCORE,
      operator: 'greaterThan',
      drafts: ['10,5'],
      values: [10.5],
    },
    {
      label: 'nombre, entre',
      column: SCORE,
      operator: 'between',
      drafts: ['1', '9'],
      values: [1, 9],
    },
    {
      label: 'date',
      column: DATE,
      operator: 'before',
      drafts: ['2024-03-01'],
      values: ['2024-03-01'],
    },
    {
      label: 'téléphone (chiffres)',
      column: PHONE,
      operator: 'contains',
      drafts: ['06 12'],
      values: ['0612'],
    },
    { label: 'sans valeur', column: PHONE, operator: 'isEmpty', drafts: [], values: [] },
  ];

  it.each(valid)('[R16] construit un filtre valide : $label', (testCase) => {
    expect(build(testCase)).toEqual({
      ok: true,
      value: { columnId: testCase.column.id, operator: testCase.operator, values: testCase.values },
    });
  });

  const invalid: ReadonlyArray<Case & { readonly message: string }> = [
    {
      label: 'nombre invalide',
      column: SCORE,
      operator: 'equals',
      drafts: ['abc'],
      message: 'Le nombre est invalide',
    },
    {
      label: 'date impossible',
      column: DATE,
      operator: 'equals',
      drafts: ['2024-02-30'],
      message: "Cette date n'existe pas",
    },
    {
      label: 'champ laissé vide',
      column: SCORE,
      operator: 'equals',
      drafts: [''],
      message: 'Une valeur est requise',
    },
    {
      label: 'aucun champ rempli',
      column: SCORE,
      operator: 'between',
      drafts: [],
      message: 'Une valeur est requise',
    },
    {
      label: 'recherche vide',
      column: NAME,
      operator: 'contains',
      drafts: ['   '],
      message: 'La recherche ne peut pas être vide',
    },
  ];

  it.each(invalid)('[R16] refuse un filtre invalide : $label', (testCase) => {
    expect(build(testCase)).toEqual({ ok: false, error: testCase.message });
  });

  it('ignore les brouillons en trop quand l’opérateur en attend moins', () => {
    const result = build({ label: '', column: SCORE, operator: 'equals', drafts: ['5', '9'] });

    expect(result).toEqual({
      ok: true,
      value: { columnId: SCORE.id, operator: 'equals', values: [5] },
    });
  });
});
