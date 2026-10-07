import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/render-app';
import {
  DATE_COLUMN,
  NAME_COLUMN,
  PHONE_COLUMN,
  ROW_HEIGHT,
  SCORE_COLUMN,
  addFilter,
  addNumberFilter,
  chooseColumn,
  lastRequest,
  operatorLabels,
  recordRequests,
  sentFilters,
} from '../test/view-helpers';
import { mockVirtualLayout } from '../test/virtual-layout';

import { Grid } from './grid';

beforeEach(() => {
  mockVirtualLayout({ viewportHeight: 320, rowHeight: ROW_HEIGHT });
});

describe('Grid : filtres', () => {
  it('[R8] filtre un nombre côté serveur et affiche le filtre actif', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await addNumberFilter('est supérieur à', '10');

    await waitFor(() => {
      expect(sentFilters(requests)).toEqual([
        { columnId: SCORE_COLUMN.id, operator: 'greaterThan', values: [10] },
      ]);
    });
    expect(lastRequest(requests).get('offset')).toBe('0');
    const active = screen.getByRole('list', { name: 'Filtres actifs' });
    expect(within(active).getByText('Score est supérieur à 10')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Score' })).toHaveValue('');
  });

  it('[R8] combine plusieurs filtres, puis en retire un à la fois', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await addNumberFilter('est supérieur à', '10');
    await addNumberFilter('est inférieur à', '90');
    await waitFor(() => {
      expect(sentFilters(requests)).toHaveLength(2);
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Retirer le filtre : Score est supérieur à 10' }),
    );

    await waitFor(() => {
      expect(sentFilters(requests)).toEqual([
        { columnId: SCORE_COLUMN.id, operator: 'lessThan', values: [90] },
      ]);
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Retirer le filtre : Score est inférieur à 90' }),
    );

    await waitFor(() => {
      expect(lastRequest(requests).has('filters')).toBe(false);
    });
    expect(screen.queryByRole('list', { name: 'Filtres actifs' })).not.toBeInTheDocument();
  });

  it('[R8] filtre un texte avec « contient »', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await userEvent.type(screen.getByRole('textbox', { name: 'Nom' }), '  ada ');
    await addFilter();

    await waitFor(() => {
      expect(sentFilters(requests)).toEqual([
        { columnId: NAME_COLUMN.id, operator: 'contains', values: ['ada'] },
      ]);
    });
    expect(screen.getByText('Nom contient « ada »')).toBeInTheDocument();
  });

  it('[R16] filtre un téléphone sur les chiffres, quel que soit le format saisi', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await chooseColumn('Téléphone');
    await userEvent.type(screen.getByRole('textbox', { name: 'Téléphone' }), '06 12.34');
    await addFilter();

    await waitFor(() => {
      expect(sentFilters(requests)).toEqual([
        { columnId: PHONE_COLUMN.id, operator: 'contains', values: ['061234'] },
      ]);
    });
  });

  it('[R16] filtre une date entre deux bornes, affichées au format local', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await chooseColumn('Date', 'est entre');
    fireEvent.change(screen.getByLabelText('Date (minimum)'), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText('Date (maximum)'), { target: { value: '2024-12-31' } });
    await addFilter();

    await waitFor(() => {
      expect(sentFilters(requests)).toEqual([
        { columnId: DATE_COLUMN.id, operator: 'between', values: ['2024-01-01', '2024-12-31'] },
      ]);
    });
    expect(screen.getByText('Date est entre 01/01/2024 et 31/12/2024')).toBeInTheDocument();
  });

  it('[R16] « est vide » n’a pas de champ de saisie et filtre sans valeur', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await chooseColumn('Téléphone', 'est vide');
    expect(screen.queryByRole('textbox', { name: 'Téléphone' })).not.toBeInTheDocument();
    await addFilter();

    await waitFor(() => {
      expect(sentFilters(requests)).toEqual([
        { columnId: PHONE_COLUMN.id, operator: 'isEmpty', values: [] },
      ]);
    });
  });

  it.each([
    ['Nom', ['contient', 'est égal à', 'commence par', 'est vide', "n'est pas vide"]],
    [
      'Score',
      [
        'est égal à',
        'est différent de',
        'est supérieur à',
        'est supérieur ou égal à',
        'est inférieur à',
        'est inférieur ou égal à',
        'est entre',
        'est vide',
        "n'est pas vide",
      ],
    ],
    ['Date', ['est égal à', 'est avant', 'est après', 'est entre', 'est vide', "n'est pas vide"]],
    ['Téléphone', ['contient', 'est égal à', 'est vide', "n'est pas vide"]],
  ])('[R16] propose les opérateurs du type de « %s »', async (column, expected) => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await chooseColumn(column);

    expect(operatorLabels()).toEqual(expected);
  });

  it('[R16] refuse une valeur invalide pour le type, sans interroger le serveur', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    const before = requests.length;

    await addNumberFilter('est supérieur à', 'abc');

    expect(await screen.findByRole('alert')).toHaveTextContent('Le nombre est invalide');
    expect(screen.getByRole('textbox', { name: 'Score' })).toHaveValue('abc');
    expect(requests).toHaveLength(before);
    expect(screen.queryByRole('list', { name: 'Filtres actifs' })).not.toBeInTheDocument();
  });

  it('[R16] demande une valeur quand le champ est vide, et efface le message en corrigeant', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await chooseColumn('Score', 'est supérieur à');
    await addFilter();
    expect(await screen.findByRole('alert')).toHaveTextContent('Une valeur est requise');

    await userEvent.type(screen.getByRole('textbox', { name: 'Score' }), '5');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('[R16] deux champs pour « est entre » : un message tant que l’un manque', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await chooseColumn('Score', 'est entre');

    await userEvent.type(screen.getByRole('textbox', { name: 'Score (minimum)' }), '1');
    await addFilter();

    expect(await screen.findByRole('alert')).toHaveTextContent('Une valeur est requise');
    expect(screen.getByRole('textbox', { name: 'Score (maximum)' })).toBeInTheDocument();
  });
});
