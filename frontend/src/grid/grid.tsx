import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo, type ReactNode } from 'react';

import { EMPTY_CONTACTS_VIEW, type Column, type ContactsPage, type ContactsView } from '../api';
import { useColumns, useContactsInfinite } from '../query';
import { ErrorState, describeError } from '../ui';

import { formatContactCount } from './contact-count.pure';
import { flattenPages, latestTotal } from './grid-paging.pure';
import { GridViewport } from './grid-viewport';
import styles from './grid.module.css';
import { SkeletonGrid } from './skeleton-grid';

interface GridProps {
  readonly view?: ContactsView;
}

interface LoadedGridProps {
  readonly columns: ReadonlyArray<Column>;
  readonly query: UseInfiniteQueryResult<InfiniteData<ContactsPage, number>>;
  readonly pages: ReadonlyArray<ContactsPage>;
}

function LoadedGrid({ columns, query, pages }: LoadedGridProps): ReactNode {
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  const contacts = useMemo(() => flattenPages(pages), [pages]);
  const total = latestTotal(pages);
  return (
    <div className={styles['container']}>
      <p className={styles['counter']}>{formatContactCount(total)}</p>
      <GridViewport
        columns={columns}
        contacts={contacts}
        total={total}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        hasNextPageError={query.isFetchNextPageError}
        onLoadMore={loadMore}
      />
      {query.isFetchNextPageError && (
        <ErrorState message={describeError(query.error)} onRetry={loadMore} />
      )}
    </div>
  );
}

// Tri et filtres arrivent par `view` (phase 12) : la grille ne fait que l'afficher.
// Un échec de rechargement en arrière-plan garde les données déjà affichées : seul un premier chargement
// raté remplace la grille par l'état d'erreur.
export function Grid({ view = EMPTY_CONTACTS_VIEW }: GridProps): ReactNode {
  const columns = useColumns();
  const contacts = useContactsInfinite(view);

  if (columns.data === undefined && columns.isError) {
    return (
      <ErrorState
        message={describeError(columns.error)}
        onRetry={() => {
          void columns.refetch();
        }}
      />
    );
  }
  if (contacts.data === undefined && contacts.isError) {
    return (
      <ErrorState
        message={describeError(contacts.error)}
        onRetry={() => {
          void contacts.refetch();
        }}
      />
    );
  }
  if (columns.data === undefined) {
    return <p role="status">Chargement de la grille…</p>;
  }
  if (contacts.data === undefined) {
    return <SkeletonGrid columns={columns.data} />;
  }
  return <LoadedGrid columns={columns.data} query={contacts} pages={contacts.data.pages} />;
}
