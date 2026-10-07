import {
  useMemo,
  useReducer,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import type { Column, Contact } from '../api';
import { useUpdateCell } from '../query';
import { useLatest } from '../shared';

import { cellDomId } from './cell-address.pure';
import { createGridController, type CellActions } from './grid-controller';
import { INITIAL_GRID_STATE, gridReducer, type GridState } from './grid-state.pure';

interface GridEditingInput {
  readonly columns: ReadonlyArray<Column>;
  // Contacts chargés, dans l'ordre d'affichage.
  readonly contacts: ReadonlyArray<Contact>;
}

// Ce que l'élément `role="grid"` reçoit : focusable, il porte le clavier. La cellule active est désignée par
// `aria-activedescendant` plutôt que par le focus, que la virtualisation ferait perdre quand la ligne disparaît.
export interface GridProps {
  readonly ref: RefObject<HTMLDivElement | null>;
  readonly tabIndex: 0;
  readonly 'aria-activedescendant': string | undefined;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onFocus: (event: FocusEvent<HTMLElement>) => void;
}

export interface GridEditing {
  readonly state: GridState;
  readonly actions: CellActions;
  readonly gridProps: GridProps;
}

// Édition en cellule (R4, R6) : état d'interface (réducteur pur), clavier et envoi des modifications.
export function useGridEditing({ columns, contacts }: GridEditingInput): GridEditing {
  const [state, dispatch] = useReducer(gridReducer, INITIAL_GRID_STATE);
  const gridRef = useRef<HTMLDivElement>(null);
  const { mutateAsync } = useUpdateCell();
  const latest = useLatest({ state, columns, contacts });

  const controller = useMemo(
    () =>
      createGridController({
        dispatch,
        read: () => latest.current,
        submit: (variables, onError) => {
          // `mutateAsync` et non `mutate` : les callbacks de `mutate` sont perdus si une autre modification
          // part avant la réponse, et l'erreur de la première ne s'afficherait plus.
          mutateAsync(variables).catch(onError);
        },
        focusGrid: () => {
          gridRef.current?.focus({ preventScroll: true });
        },
      }),
    [latest, mutateAsync],
  );

  return {
    state,
    actions: controller.actions,
    gridProps: {
      ref: gridRef,
      tabIndex: 0,
      'aria-activedescendant': state.active === null ? undefined : cellDomId(state.active),
      onKeyDown: controller.onKeyDown,
      onFocus: controller.onFocus,
    },
  };
}
