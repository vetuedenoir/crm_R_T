import { apiRequest } from './api-client';
import { columnsSchema, type Column } from './schemas';

export function fetchColumns(signal?: AbortSignal): Promise<ReadonlyArray<Column>> {
  return apiRequest('/columns', columnsSchema, signal === undefined ? {} : { signal });
}
