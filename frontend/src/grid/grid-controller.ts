import type { Dispatch, FocusEvent, KeyboardEvent } from 'react';

import type { CellValue, Column, Contact } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';
import type { UpdateCellVariables } from '../query';

import { sameAddress, type CellAddress } from './cell-address.pure';
import { planCommit } from './cell-commit.pure';
import { cellErrorMessage } from './cell-error.pure';
import { intentForKey, type KeyIntent } from './grid-keyboard.pure';
import { addressAt, neighbor, type Direction, type GridLayout } from './grid-navigation.pure';
import type { GridAction, GridState } from './grid-state.pure';

// Ce que le contrôleur lit au moment de l'événement : l'état courant, pas celui du rendu qui l'a créé.
export interface GridSnapshot {
  readonly state: GridState;
  readonly columns: ReadonlyArray<Column>;
  readonly contacts: ReadonlyArray<Contact>;
}

export interface GridControllerDeps {
  readonly dispatch: Dispatch<GridAction>;
  readonly read: () => GridSnapshot;
  // Envoie la modification ; `onError` reçoit l'échec (refus du serveur, réseau coupé).
  readonly submit: (variables: UpdateCellVariables, onError: (error: unknown) => void) => void;
  readonly focusGrid: () => void;
}

// Actions que les cellules déclenchent. Elles sont stables : lire l'état se fait par `read`.
export interface CellActions {
  readonly onActivate: (address: CellAddress) => void;
  readonly onStartEdit: (address: CellAddress) => void;
  readonly onDraftChange: (draft: string) => void;
  readonly onCommit: (address: CellAddress, draft: string) => void;
  readonly onCancel: () => void;
}

export interface GridController {
  readonly actions: CellActions;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLElement>) => void;
}

interface Target {
  readonly column: Column;
  readonly previous: CellValue | undefined;
}

function findTarget({ columns, contacts }: GridSnapshot, address: CellAddress): Target | null {
  const column = columns.find((candidate) => candidate.id === address.columnId);
  const contact = contacts.find((candidate) => candidate.id === address.contactId);
  return column === undefined || contact === undefined
    ? null
    : { column, previous: contact.cells[column.id] };
}

function layoutOf({ columns, contacts }: GridSnapshot): GridLayout {
  return { rowIds: contacts.map((contact) => contact.id), columnIds: columns.map((c) => c.id) };
}

function leaveEdit({ dispatch, focusGrid }: GridControllerDeps): void {
  dispatch({ type: 'stop-edit' });
  focusGrid();
}

// Valide la saisie. Retourne `false` si l'éditeur reste ouvert (valeur invalide) : le message est déjà
// affiché par la cellule, l'utilisateur corrige ou annule.
function commit(deps: GridControllerDeps, address: CellAddress, draft: string): boolean {
  const target = findTarget(deps.read(), address);
  const plan =
    target === null ? null : planCommit(COLUMN_TYPE_UI[target.column.type], target.previous, draft);
  if (plan?.kind === 'invalid') {
    return false;
  }
  leaveEdit(deps);
  if (target !== null && plan?.kind === 'update') {
    const variables = { ...address, value: plan.value, previous: target.previous };
    deps.submit(variables, (error) => {
      deps.dispatch({
        type: 'commit-failed',
        address,
        draft,
        error: cellErrorMessage(error, address.columnId),
      });
    });
  }
  return true;
}

// Valide l'édition en cours avant de quitter la cellule ; `false` si elle doit rester ouverte.
function commitActive(deps: GridControllerDeps): boolean {
  const { state } = deps.read();
  return state.active === null || state.editing === null
    ? true
    : commit(deps, state.active, state.editing.draft);
}

function startEdit(deps: GridControllerDeps, address: CellAddress): void {
  const snapshot = deps.read();
  const target = findTarget(snapshot, address);
  const alreadyEditing =
    snapshot.state.editing !== null && sameAddress(snapshot.state.active, address);
  if (target !== null && !alreadyEditing) {
    const draft = COLUMN_TYPE_UI[target.column.type].toDraft(target.previous);
    deps.dispatch({ type: 'start-edit', address, draft });
  }
}

function move(deps: GridControllerDeps, direction: Direction): void {
  const snapshot = deps.read();
  const target = neighbor(layoutOf(snapshot), snapshot.state.active, direction);
  if (target !== null) {
    deps.dispatch({ type: 'activate', address: target });
  }
}

function tab(deps: GridControllerDeps, direction: 'left' | 'right', event: KeyboardEvent): void {
  const snapshot = deps.read();
  const atEdge = neighbor(layoutOf(snapshot), snapshot.state.active, direction) === null;
  // Hors édition, Tab au bord de la grille laisse le focus quitter la grille (accessibilité).
  if (snapshot.state.editing === null && atEdge) {
    return;
  }
  event.preventDefault();
  if (commitActive(deps)) {
    move(deps, direction);
  }
}

function runIntent(deps: GridControllerDeps, intent: KeyIntent, event: KeyboardEvent): void {
  if (intent.kind === 'tab') {
    tab(deps, intent.direction, event);
    return;
  }
  event.preventDefault();
  const { active } = deps.read().state;
  if (intent.kind === 'move') {
    move(deps, intent.direction);
  } else if (active !== null) {
    // Vider la cellule, c'est valider un brouillon vide.
    if (intent.kind === 'start-edit') {
      startEdit(deps, active);
    } else {
      commit(deps, active, '');
    }
  }
}

function handleKeyDown(deps: GridControllerDeps, event: KeyboardEvent<HTMLElement>): void {
  const mode = deps.read().state.editing === null ? 'navigating' : 'editing';
  // Hors édition, les touches venues d'un autre élément (bouton, lien) ne sont pas pour la grille.
  if (mode === 'navigating' && event.target !== event.currentTarget) {
    return;
  }
  const intent = intentForKey(event, mode);
  if (intent !== null) {
    runIntent(deps, intent, event);
  }
}

// Arriver dans la grille au clavier doit montrer où l'on est : la première cellule devient active.
function handleFocus(deps: GridControllerDeps, event: FocusEvent<HTMLElement>): void {
  const snapshot = deps.read();
  if (event.target !== event.currentTarget || snapshot.state.active !== null) {
    return;
  }
  const first = addressAt(layoutOf(snapshot), 0, 0);
  if (first !== null) {
    deps.dispatch({ type: 'activate', address: first });
  }
}

export function createGridController(deps: GridControllerDeps): GridController {
  return {
    actions: {
      onActivate: (address) => {
        // Un clic dans le champ en cours d'édition remonte à sa cellule : ce n'est pas un changement de cellule.
        if (!sameAddress(deps.read().state.active, address) && commitActive(deps)) {
          deps.dispatch({ type: 'activate', address });
        }
      },
      onStartEdit: (address) => {
        startEdit(deps, address);
      },
      onDraftChange: (draft) => {
        deps.dispatch({ type: 'change-draft', draft });
      },
      onCommit: (address, draft) => {
        commit(deps, address, draft);
      },
      onCancel: () => {
        leaveEdit(deps);
      },
    },
    onKeyDown: (event) => {
      handleKeyDown(deps, event);
    },
    onFocus: (event) => {
      handleFocus(deps, event);
    },
  };
}
