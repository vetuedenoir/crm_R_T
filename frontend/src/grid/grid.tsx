import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo, type ReactNode } from 'react';

import type { Column, ColumnId, ContactsPage, ContactsView, SortDirection } from '../api';
import { useColumns, useContactsInfinite } from '../query';
import { ErrorState, describeError } from '../ui';
import { FilterBar, useUrlView, withFilter, withSort, withoutFilterAt } from '../view';

import { formatContactCount } from './contact-count.pure';
import { flattenPages, latestTotal } from './grid-paging.pure';
import { GridViewport } from './grid-viewport';
import styles from './grid.module.css';
import { SkeletonGrid } from './skeleton-grid';
import { useGridEditing } from './use-grid-editing';

interface SortProps {
  readonly view: ContactsView;
  readonly onSortChange: (columnId: ColumnId, direction: SortDirection | null) => void;
}

interface LoadedGridProps extends SortProps {
  readonly columns: ReadonlyArray<Column>;
  readonly query: UseInfiniteQueryResult<InfiniteData<ContactsPage, number>>;
  readonly pages: ReadonlyArray<ContactsPage>;
}

function LoadedGrid({ columns, query, pages, view, onSortChange }: LoadedGridProps): ReactNode {
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  const contacts = useMemo(() => flattenPages(pages), [pages]);
  const total = latestTotal(pages);
  const editing = useGridEditing({ columns, contacts });
  return (
    <>
      <p className={styles['counter']}>{formatContactCount(total)}</p>
      <GridViewport
        columns={columns}
        contacts={contacts}
        editing={editing}
        total={total}
        sort={view.sort}
        onSortChange={onSortChange}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        hasNextPageError={query.isFetchNextPageError}
        onLoadMore={loadMore}
      />
      {query.isFetchNextPageError && (
        <ErrorState message={describeError(query.error)} onRetry={loadMore} />
      )}
    </>
  );
}

interface ContactsBodyProps extends SortProps {
  readonly columns: ReadonlyArray<Column>;
  readonly query: UseInfiniteQueryResult<InfiniteData<ContactsPage, number>>;
}

// Un échec de rechargement en arrière-plan garde les données déjà affichées : seul un premier chargement
// raté remplace la grille par l'état d'erreur.
function ContactsBody({ columns, query, view, onSortChange }: ContactsBodyProps): ReactNode {
  if (query.data === undefined && query.isError) {
    return (
      <ErrorState
        message={describeError(query.error)}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (query.data === undefined) {
    return <SkeletonGrid columns={columns} sort={view.sort} onSortChange={onSortChange} />;
  }
  return (
    // Une grille neuve par vue : retour en haut du défilement (R15) et plus de cellule active sur un
    // contact qui ne figure peut-être plus dans le résultat.
    <LoadedGrid
      key={JSON.stringify(view)}
      columns={columns}
      query={query}
      pages={query.data.pages}
      view={view}
      onSortChange={onSortChange}
    />
  );
}

// La vue (tri, filtres) est dans l'URL et fait partie de la clé de requête : en changer repart de la page 1
// et le serveur trie et filtre tout le jeu de données (R15).
function ContactsGrid({ columns }: { readonly columns: ReadonlyArray<Column> }): ReactNode {
  const { view, setView } = useUrlView(columns);
  const query = useContactsInfinite(view);
  const onSortChange = (columnId: ColumnId, direction: SortDirection | null): void => {
    setView(withSort(view, columnId, direction));
  };
  return (
    <div className={styles['container']}>
      <FilterBar
        columns={columns}
        view={view}
        onAdd={(filter) => {
          setView(withFilter(view, filter));
        }}
        onRemove={(index) => {
          setView(withoutFilterAt(view, index));
        }}
      />
      <ContactsBody columns={columns} query={query} view={view} onSortChange={onSortChange} />
    </div>
  );
}

export function Grid(): ReactNode {
  const columns = useColumns();

  if (columns.data === undefined) {
    return columns.isError ? (
      <ErrorState
        message={describeError(columns.error)}
        onRetry={() => {
          void columns.refetch();
        }}
      />
    ) : (
      <p role="status">Chargement de la grille…</p>
    );
  }
  return <ContactsGrid columns={columns.data} />;
}
