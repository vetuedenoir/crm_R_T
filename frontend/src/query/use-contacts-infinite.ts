import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import { fetchContactsPage, type ContactsPage, type ContactsView } from '../api';

import { nextPageOffset } from './next-page-offset.pure';
import { queryKeys } from './query-keys.pure';

// Pages successives pour le scroll infini (R2). `pageParam` est l'offset de la page demandée.
export function useContactsInfinite(
  view: ContactsView,
): UseInfiniteQueryResult<InfiniteData<ContactsPage, number>> {
  return useInfiniteQuery({
    queryKey: queryKeys.contacts(view),
    queryFn: ({ pageParam, signal }) => fetchContactsPage(view, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}
