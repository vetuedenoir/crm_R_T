import { memo, type ReactNode } from 'react';

import type { Column, ColumnId, Contact } from '../api';

import { Cell, SkeletonCell } from './cell';
import type { CellActions } from './grid-controller';
import type { Editing } from './grid-state.pure';
import styles from './row.module.css';

interface RowProps {
  readonly columns: ReadonlyArray<Column>;
  // Position de la ligne parmi les contacts, en partant de 0.
  readonly index: number;
  // Le virtualiseur mesure la hauteur réelle de la ligne : elle vient du CSS, pas du JavaScript.
  readonly measureRef: (node: HTMLDivElement | null) => void;
}

interface ContactRowProps extends RowProps {
  readonly contact: Contact;
  // Colonne active de cette ligne, `null` si la cellule active est ailleurs : une ligne qui n'est pas
  // concernée reçoit les mêmes props d'une frappe à l'autre, donc `memo` lui évite un rendu.
  readonly activeColumnId: ColumnId | null;
  readonly editing: Editing | null;
  readonly actions: CellActions;
}

// L'en-tête est la ligne 1 de la grille : le premier contact est donc la ligne 2 (aria-rowindex est base 1).
function ariaRowIndex(index: number): number {
  return index + 2;
}

export const ContactRow = memo(function ContactRow({
  columns,
  index,
  measureRef,
  contact,
  activeColumnId,
  editing,
  actions,
}: ContactRowProps): ReactNode {
  return (
    <div
      role="row"
      className={styles['row']}
      ref={measureRef}
      data-index={index}
      aria-rowindex={ariaRowIndex(index)}
    >
      {columns.map((column) => {
        const active = column.id === activeColumnId;
        return (
          <Cell
            key={column.id}
            column={column}
            contactId={contact.id}
            value={contact.cells[column.id]}
            active={active}
            editing={active ? editing : null}
            actions={actions}
          />
        );
      })}
    </div>
  );
});

// Ligne dont la page n'est pas encore arrivée : elle garde la hauteur d'une vraie ligne.
export const SkeletonRow = memo(function SkeletonRow({
  columns,
  index,
  measureRef,
}: RowProps): ReactNode {
  return (
    <div
      role="row"
      className={styles['row']}
      ref={measureRef}
      data-index={index}
      aria-rowindex={ariaRowIndex(index)}
      aria-busy="true"
    >
      {columns.map((column) => (
        <SkeletonCell key={column.id} />
      ))}
    </div>
  );
});
