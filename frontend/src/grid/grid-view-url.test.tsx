import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/render-app';
import {
  ROW_HEIGHT,
  SCORE_COLUMN,
  addNumberFilter,
  header,
  lastRequest,
  recordRequests,
  sentFilters,
  sortBy,
} from '../test/view-helpers';
import { mockVirtualLayout } from '../test/virtual-layout';

import { Grid } from './grid';

beforeEach(() => {
  mockVirtualLayout({ viewportHeight: 320, rowHeight: ROW_HEIGHT });
});

describe('Grid : vue dans l’URL', () => {
  it('[R14] inscrit le tri et les filtres dans l’URL, et la vide quand la vue l’est', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await sortBy('Score', 'Tri décroissant');
    await screen.findByText('Contact 1');
    await addNumberFilter('est supérieur à', '10');
    await screen.findByText('Score est supérieur à 10');

    const params = new URLSearchParams(window.location.search);
    expect(params.get('sort')).toBe(`${SCORE_COLUMN.id}:desc`);
    expect(JSON.parse(params.get('filters') ?? 'null')).toEqual([
      { columnId: SCORE_COLUMN.id, operator: 'greaterThan', values: [10] },
    ]);

    await sortBy('Score', 'Aucun tri');
    await userEvent.click(
      screen.getByRole('button', { name: 'Retirer le filtre : Score est supérieur à 10' }),
    );
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('[R14] retrouve le tri et les filtres de l’URL au chargement, dès la première requête', async () => {
    const filter = [{ columnId: SCORE_COLUMN.id, operator: 'greaterThan', values: [10] }];
    window.history.replaceState(
      null,
      '',
      `/?sort=${SCORE_COLUMN.id}:desc&filters=${encodeURIComponent(JSON.stringify(filter))}`,
    );
    const requests = recordRequests();

    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    expect(lastRequest(requests).get('sort')).toBe(`${SCORE_COLUMN.id}:desc`);
    expect(sentFilters(requests)).toEqual(filter);
    expect(header('Score')).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByText('Score est supérieur à 10')).toBeInTheDocument();
  });

  it('[R14] ignore ce que l’URL contient d’invalide plutôt que d’envoyer une requête refusée', async () => {
    window.history.replaceState(
      null,
      '',
      `/?sort=inconnue:asc&filters=${encodeURIComponent('[{"columnId":"x","operator":"isEmpty"}]')}`,
    );
    const requests = recordRequests();

    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    expect(lastRequest(requests).has('sort')).toBe(false);
    expect(lastRequest(requests).has('filters')).toBe(false);
    expect(screen.queryByRole('list', { name: 'Filtres actifs' })).not.toBeInTheDocument();
  });

  it('garde les autres paramètres de l’URL en changeant de vue', async () => {
    window.history.replaceState(null, '', '/?autre=1');
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await sortBy('Score', 'Tri croissant');

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('autre')).toBe('1');
    });
    expect(new URLSearchParams(window.location.search).get('sort')).toBe(`${SCORE_COLUMN.id}:asc`);
  });
});
