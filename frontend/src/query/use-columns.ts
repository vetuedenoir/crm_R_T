import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchColumns, type Column } from '../api';

import { queryKeys } from './query-keys.pure';

export function useColumns(): UseQueryResult<ReadonlyArray<Column>> {
  return useQuery({
    queryKey: queryKeys.columns(),
    queryFn: ({ signal }) => fetchColumns(signal),
  });
}
