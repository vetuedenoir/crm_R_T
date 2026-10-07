import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../mocks/server';
import { renderWithProviders } from '../test/render-app';

import { ColumnList } from './column-list';

describe('ColumnList', () => {
  it('affiche les colonnes de l’API avec le libellé de leur type', async () => {
    renderWithProviders(<ColumnList />);

    const items = await screen.findAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      'NomTexte',
      'EntrepriseTexte',
      'TéléphoneTéléphone',
      'DateDate',
      'ScoreNombre',
    ]);
  });

  it('indique le chargement tant que l’API n’a pas répondu', () => {
    renderWithProviders(<ColumnList />);

    expect(screen.getByRole('status')).toHaveTextContent('Chargement des colonnes');
  });

  it('propose « Réessayer » après une erreur de chargement, puis affiche les colonnes', async () => {
    server.use(
      http.get('*/api/columns', () => new HttpResponse(null, { status: 404 }), { once: true }),
    );
    renderWithProviders(<ColumnList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Élément introuvable');
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Entreprise')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
