import type { VirtualItem } from '@tanstack/react-virtual';
import type { ReactNode } from 'react';

import type { Column, Contact } from '../api';

import { ContactRow, SkeletonRow } from './row';
import type { GridEditing } from './use-grid-editing';

interface VirtualRowsProps {
  readonly items: ReadonlyArray<VirtualItem>;
  readonly columns: ReadonlyArray<Column>;
  readonly contacts: ReadonlyArray<Contact>;
  readonly measureRef: (node: HTMLDivElement | null) => void;
  readonly editing: GridEditing;
  // Hauteur des lignes non rendues avant et après : elles gardent à la barre de défilement sa taille réelle.
  readonly paddingTop: number;
  readonly paddingBottom: number;
}

// Une ligne dont le contact n'est pas encore chargé est une ligne squelette.
export function VirtualRows({
  items,
  columns,
  contacts,
  measureRef,
  editing,
  paddingTop,
  paddingBottom,
}: VirtualRowsProps): ReactNode {
  return (
    <div role="rowgroup" style={{ paddingTop, paddingBottom }}>
      {items.map((item) => {
        const contact = contacts[item.index];
        const { active } = editing.state;
        return contact === undefined ? (
          <SkeletonRow
            key={`skeleton-${String(item.index)}`}
            columns={columns}
            index={item.index}
            measureRef={measureRef}
          />
        ) : (
          <ContactRow
            key={contact.id}
            contact={contact}
            columns={columns}
            index={item.index}
            measureRef={measureRef}
            activeColumnId={active?.contactId === contact.id ? active.columnId : null}
            editing={active?.contactId === contact.id ? editing.state.editing : null}
            actions={editing.actions}
          />
        );
      })}
    </div>
  );
}
