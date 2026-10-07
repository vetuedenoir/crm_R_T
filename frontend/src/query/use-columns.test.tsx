import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../mocks/server';
import { TestProviders } from '../test/render-app';

import { useColumns } from './use-columns';

describe('useColumns', () => {
  it('charge les colonnes réelles de l’API, dans leur ordre', async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: TestProviders });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((column) => column.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it('retente une panne serveur passagère puis réussit', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/columns', () => {
        calls += 1;
        return calls === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json([]);
      }),
    );

    const { result } = renderHook(() => useColumns(), { wrapper: TestProviders });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(calls).toBe(2);
  });

  it('ne retente pas une erreur 404 : elle se reproduirait à l’identique', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/columns', () => {
        calls += 1;
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useColumns(), { wrapper: TestProviders });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(calls).toBe(1);
    expect(result.current.error?.kind).toBe('not-found');
  });

  it('abandonne après deux nouveaux essais sur une panne persistante', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/columns', () => {
        calls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useColumns(), { wrapper: TestProviders });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(calls).toBe(3);
  });
});
