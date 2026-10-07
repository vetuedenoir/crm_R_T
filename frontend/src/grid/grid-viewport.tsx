import type { ReactNode } from 'react';

import type { Column, Contact } from '../api';

import styles from './grid-viewport.module.css';
import { HeaderRow } from './header-row';
import type { GridEditing } from './use-grid-editing';
import { useGridVirtualizer } from './use-grid-virtualizer';
import { VirtualRows } from './virtual-rows';

interface GridViewportProps {
  readonly columns: ReadonlyArray<Column>;
  // Contacts déjà chargés, dans l'ordre ; les lignes suivantes sont des lignes squelette.
  readonly contacts: ReadonlyArray<Contact>;
  readonly total: number;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPageError: boolean;
  readonly onLoadMore: () => void;
  readonly editing: GridEditing;
}

// Seules les lignes proches de la zone visible existent dans le DOM (R2) ; la hauteur totale vient de `total`.
// Les lignes rendues restent dans le flux (marges haute et basse) plutôt qu'en position absolue : la grille
// garde ainsi la largeur de ses colonnes.
export function GridViewport({
  columns,
  contacts,
  editing,
  ...paging
}: GridViewportProps): ReactNode {
  const { scrollerRef, rowCount, items, measureRef, paddingTop, paddingBottom } =
    useGridVirtualizer({ loadedCount: contacts.length, ...paging });

  return (
    <div ref={scrollerRef} className={styles['scroller']}>
      <div
        role="grid"
        className={styles['grid']}
        aria-label="Contacts"
        aria-colcount={columns.length}
        aria-rowcount={rowCount + 1}
        {...editing.gridProps}
      >
        <HeaderRow columns={columns} />
        <VirtualRows
          items={items}
          columns={columns}
          contacts={contacts}
          measureRef={measureRef}
          editing={editing}
          paddingTop={paddingTop}
          paddingBottom={paddingBottom}
        />
      </div>
      {rowCount === 0 && (
        <p role="status" className={styles['empty']}>
          Aucun contact.
        </p>
      )}
    </div>
  );
}
