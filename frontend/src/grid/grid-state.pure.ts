import { assertNever } from '../shared';

import { sameAddress, type CellAddress } from './cell-address.pure';

export interface Editing {
  // Ce que l'utilisateur a tapé, avant toute validation.
  readonly draft: string;
  // Message du serveur à propos de ce brouillon ; effacé dès que le brouillon change.
  readonly error: string | null;
}

// État d'interface de la grille (RULES §8) : l'état serveur reste dans TanStack Query.
// On n'édite que la cellule active, d'où un seul `editing`.
export interface GridState {
  readonly active: CellAddress | null;
  readonly editing: Editing | null;
}

export type GridAction =
  | { readonly type: 'activate'; readonly address: CellAddress }
  | { readonly type: 'start-edit'; readonly address: CellAddress; readonly draft: string }
  | { readonly type: 'change-draft'; readonly draft: string }
  | { readonly type: 'stop-edit' }
  // Le serveur a refusé la valeur : on rouvre l'éditeur avec la saisie intacte et le message.
  | {
      readonly type: 'commit-failed';
      readonly address: CellAddress;
      readonly draft: string;
      readonly error: string;
    };

export const INITIAL_GRID_STATE: GridState = { active: null, editing: null };

export function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'activate':
      // Reprendre la cellule déjà active ne doit pas fermer son éditeur.
      return sameAddress(state.active, action.address)
        ? state
        : { active: action.address, editing: null };
    case 'start-edit':
      return { active: action.address, editing: { draft: action.draft, error: null } };
    case 'change-draft':
      return state.editing === null
        ? state
        : { ...state, editing: { draft: action.draft, error: null } };
    case 'stop-edit':
      return state.editing === null ? state : { ...state, editing: null };
    case 'commit-failed':
      return {
        active: action.address,
        editing: { draft: action.draft, error: action.error },
      };
    default:
      return assertNever(action);
  }
}
