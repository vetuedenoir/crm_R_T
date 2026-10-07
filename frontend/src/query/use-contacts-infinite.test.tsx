import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { EMPTY_CONTACTS_VIEW, type ContactsView } from '../api';
import { buildColumn, MOCK_CONTACT_COUNT } from '../mocks';
import { server } from '../mocks/server';
import { TestProviders } from '../test/render-app';

import { useContactsInfinite } from './use-contacts-infinite';

describe('useContactsInfinite', () => {
  it('[R2] charge la première page puis les suivantes, jusqu’à épuisement', async () => {
    const { result } = renderHook(() => useContactsInfinite(EMPTY_CONTACTS_VIEW), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.pages.map((page) => page.items.length)).toEqual([50]);
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });
    await act(() => result.current.fetchNextPage());
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(3);
    });

    expect(result.current.data?.pages.map((page) => page.offset)).toEqual([0, 50, 100]);
    expect(result.current.data?.pages.flatMap((page) => page.items)).toHaveLength(
      MOCK_CONTACT_COUNT,
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it('[R15] met tri et filtres dans la clé : changer de vue repart de la première page', async () => {
    const offsets: string[] = [];
    server.use(
      http.get('*/api/contacts', ({ request }) => {
        const url = new URL(request.url);
        offsets.push(
          `${url.searchParams.get('offset') ?? '?'}|${url.searchParams.get('sort') ?? '-'}`,
        );
        return HttpResponse.json({ items: [], total: 0, offset: 0, limit: 50 });
      }),
    );
    const column = buildColumn({ position: 4, type: 'number' });
    const sorted: ContactsView = { sort: { columnId: column.id, direction: 'desc' }, filters: [] };

    const { result, rerender } = renderHook(({ view }) => useContactsInfinite(view), {
      wrapper: TestProviders,
      initialProps: { view: EMPTY_CONTACTS_VIEW },
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    rerender({ view: sorted });
    await waitFor(() => {
      expect(offsets).toHaveLength(2);
    });

    expect(offsets).toEqual(['0|-', `0|${column.id}:desc`]);
  });
});
