import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/render-app';
import {
  ROW_HEIGHT,
  SCORE_COLUMN,
  header,
  lastRequest,
  recordRequests,
  scroller,
  sortBy,
} from '../test/view-helpers';
import { mockVirtualLayout } from '../test/virtual-layout';

import { Grid } from './grid';

beforeEach(() => {
  mockVirtualLayout({ viewportHeight: 320, rowHeight: ROW_HEIGHT });
});

describe('Grid : tri', () => {
  it('[R7] trie sur la colonne choisie, côté serveur, depuis le menu d’en-tête', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    expect(lastRequest(requests).has('sort')).toBe(false);

    await sortBy('Score', 'Tri décroissant');

    await waitFor(() => {
      expect(lastRequest(requests).get('sort')).toBe(`${SCORE_COLUMN.id}:desc`);
    });
    expect(lastRequest(requests).get('offset')).toBe('0');
  });

  it('[R7] indique le sens du tri dans l’en-tête, pour les lecteurs d’écran aussi', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    expect(header('Score')).toHaveAttribute('aria-sort', 'none');

    await sortBy('Score', 'Tri croissant');
    await screen.findByText('Contact 1');
    expect(header('Score')).toHaveAttribute('aria-sort', 'ascending');

    await sortBy('Score', 'Tri décroissant');
    await screen.findByText('Contact 1');
    expect(header('Score')).toHaveAttribute('aria-sort', 'descending');
    expect(header('Nom')).toHaveAttribute('aria-sort', 'none');
  });

  it('[R7] « Aucun tri » retire le tri', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await sortBy('Score', 'Tri croissant');
    await screen.findByText('Contact 1');

    await sortBy('Score', 'Aucun tri');

    await waitFor(() => {
      expect(lastRequest(requests).has('sort')).toBe(false);
    });
    expect(header('Score')).toHaveAttribute('aria-sort', 'none');
    expect(window.location.search).toBe('');
  });

  it('[R7] trier une autre colonne remplace le tri : un seul tri à la fois', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await sortBy('Score', 'Tri croissant');
    await screen.findByText('Contact 1');

    await sortBy('Nom', 'Tri décroissant');

    await waitFor(() => {
      expect(lastRequest(requests).get('sort')).toMatch(/:desc$/);
    });
    expect(header('Score')).toHaveAttribute('aria-sort', 'none');
    expect(header('Nom')).toHaveAttribute('aria-sort', 'descending');
  });

  it('[R15] revient en haut de la grille et repart de la première page', async () => {
    const requests = recordRequests();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    fireEvent.scroll(scroller(), { target: { scrollTop: 60 * ROW_HEIGHT } });
    expect(await screen.findByText('Contact 61')).toBeInTheDocument();

    await sortBy('Score', 'Tri décroissant');

    expect(await screen.findByText('Contact 1')).toBeInTheDocument();
    expect(screen.queryByText('Contact 61')).not.toBeInTheDocument();
    expect(lastRequest(requests).get('offset')).toBe('0');
  });

  it('[R15] revient en haut aussi quand la vue retrouvée est déjà en cache', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await sortBy('Score', 'Tri décroissant');
    await screen.findByText('Contact 1');
    fireEvent.scroll(scroller(), { target: { scrollTop: 60 * ROW_HEIGHT } });
    expect(await screen.findByText('Contact 61')).toBeInTheDocument();

    await sortBy('Score', 'Aucun tri');

    expect(await screen.findByText('Contact 1')).toBeInTheDocument();
    expect(screen.queryByText('Contact 61')).not.toBeInTheDocument();
  });

  it('[R7] le menu se ferme avec Échap et rend le focus à son bouton', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    const trigger = screen.getByRole('button', { name: 'Trier Score' });

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Tri croissant' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('[R7] le menu se ferme au clic ailleurs', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await userEvent.click(screen.getByRole('button', { name: 'Trier Score' }));

    await userEvent.click(screen.getByText('Contact 1'));

    expect(screen.queryByRole('button', { name: 'Tri croissant' })).not.toBeInTheDocument();
  });

  it('[R7] marque le choix courant du menu', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await sortBy('Score', 'Tri croissant');
    await screen.findByText('Contact 1');

    await userEvent.click(screen.getByRole('button', { name: 'Trier Score' }));

    expect(screen.getByRole('button', { name: 'Tri croissant' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Aucun tri' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
