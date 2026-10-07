import { describe, expect, it } from 'vitest';

import type { CellValue, ColumnTypeName } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';

import { planCommit, type CommitPlan } from './cell-commit.pure';

describe('planCommit', () => {
  it.each<readonly [string, ColumnTypeName, CellValue | undefined, string, CommitPlan]>([
    ['texte modifié', 'text', 'Ada', 'Grace', { kind: 'update', value: 'Grace' }],
    ['texte inchangé', 'text', 'Ada', 'Ada', { kind: 'unchanged' }],
    ['texte sur cellule vide', 'text', undefined, 'Ada', { kind: 'update', value: 'Ada' }],
    ['brouillon vide sur cellule vide', 'text', undefined, '', { kind: 'unchanged' }],
    ['brouillon vide sur cellule remplie', 'text', 'Ada', '  ', { kind: 'update', value: null }],
    ['nombre à virgule', 'number', 12, '12,5', { kind: 'update', value: 12.5 }],
    ['nombre inchangé malgré une autre écriture', 'number', 12.5, '12,50', { kind: 'unchanged' }],
    [
      'nombre invalide',
      'number',
      12,
      'abc',
      { kind: 'invalid', message: 'Le nombre est invalide' },
    ],
    [
      'téléphone normalisé',
      'phone',
      undefined,
      '06 12 34 56 78',
      { kind: 'update', value: '0612345678' },
    ],
    [
      'téléphone inchangé une fois formaté',
      'phone',
      '0612345678',
      '06 12 34 56 78',
      { kind: 'unchanged' },
    ],
    ['date valide', 'date', undefined, '2024-02-29', { kind: 'update', value: '2024-02-29' }],
  ])('[R16] %s', (_label, type, previous, draft, expected) => {
    expect(planCommit(COLUMN_TYPE_UI[type], previous, draft)).toEqual(expected);
  });

  it('[R16] refuse un téléphone trop court avec le message du type', () => {
    const plan = planCommit(COLUMN_TYPE_UI.phone, undefined, '123');
    expect(plan.kind).toBe('invalid');
  });
});
