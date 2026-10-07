import { useEffect } from 'react';

import { shouldFetchNextPage, type PagingState } from './grid-paging.pure';

// Demande la page suivante dès que la décision pure le juge utile. L'effet se relance à chaque changement
// de l'état : une page qui arrive peut laisser la zone visible encore sur des lignes squelette.
export function useLoadMore(state: PagingState, onLoadMore: () => void): void {
  const { lastVisibleIndex, loadedCount, hasNextPage, isFetching, hasFetchError } = state;
  useEffect(() => {
    if (
      shouldFetchNextPage({ lastVisibleIndex, loadedCount, hasNextPage, isFetching, hasFetchError })
    ) {
      onLoadMore();
    }
  }, [lastVisibleIndex, loadedCount, hasNextPage, isFetching, hasFetchError, onLoadMore]);
}
