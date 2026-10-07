import { describe, expect, it } from 'vitest';

import { buildColumn, buildContact } from '../mocks';

import type { CellAddress } from './cell-address.pure';
import {
  INITIAL_GRID_STATE,
  gridReducer,
  type GridAction,
  type GridState,
} from './grid-state.pure';

const A: CellAddress = { contactId: buildContact(1).id, columnId: buildColumn({ position: 0 }).id };
const B: CellAddress = { contactId: buildContact(2).id, columnId: buildColumn({ position: 1 }).id };

const ACTIVE_A: GridState = { active: A, editing: null };
const EDITING_A: GridState = { active: A, editing: { draft: 'Ada', error: null } };

describe('gridReducer', () => {
  it.each<readonly [string, GridState, GridAction, GridState]>([
    [
      'active une cellule',
      INITIAL_GRID_STATE,
      { type: 'activate', address: A },
      { active: A, editing: null },
    ],
    [
      'changer de cellule ferme l’édition',
      EDITING_A,
      { type: 'activate', address: B },
      { active: B, editing: null },
    ],
    [
      'reprendre la cellule active garde son édition',
      EDITING_A,
      { type: 'activate', address: A },
      EDITING_A,
    ],
    [
      'démarre l’édition avec le brouillon donné',
      ACTIVE_A,
      { type: 'start-edit', address: A, draft: 'Ada' },
      EDITING_A,
    ],
    [
      'démarrer l’édition d’une autre cellule la rend active',
      ACTIVE_A,
      { type: 'start-edit', address: B, draft: '' },
      { active: B, editing: { draft: '', error: null } },
    ],
    [
      'la frappe change le brouillon et efface l’erreur du serveur',
      { active: A, editing: { draft: 'Ad', error: 'Refusé' } },
      { type: 'change-draft', draft: 'Ada' },
      EDITING_A,
    ],
    [
      'la frappe sans édition est ignorée',
      ACTIVE_A,
      { type: 'change-draft', draft: 'x' },
      ACTIVE_A,
    ],
    ['termine l’édition en gardant la cellule active', EDITING_A, { type: 'stop-edit' }, ACTIVE_A],
    ['terminer sans édition ne change rien', ACTIVE_A, { type: 'stop-edit' }, ACTIVE_A],
    [
      'un refus du serveur rouvre l’éditeur avec la saisie et le message',
      ACTIVE_A,
      { type: 'commit-failed', address: B, draft: '12x', error: 'Nombre invalide' },
      { active: B, editing: { draft: '12x', error: 'Nombre invalide' } },
    ],
  ])('[R6] %s', (_label, state, action, expected) => {
    expect(gridReducer(state, action)).toEqual(expected);
  });

  it('[R6] rend la même référence quand rien ne change (pas de rendu inutile)', () => {
    expect(gridReducer(ACTIVE_A, { type: 'stop-edit' })).toBe(ACTIVE_A);
    expect(gridReducer(EDITING_A, { type: 'activate', address: A })).toBe(EDITING_A);
  });
});
