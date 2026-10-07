import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { MOCK_CONTACT_COUNT } from '../mocks';
import { server } from '../mocks/server';
import { renderWithProviders } from '../test/render-app';
import { mockVirtualLayout } from '../test/virtual-layout';

import { Grid } from './grid';

const ROW_HEIGHT = 32;
const VIEWPORT_HEIGHT = 320;

// Le conteneur qui défile est le parent de la grille (`role="grid"`).
function scroller(): HTMLElement {
  const { parentElement } = screen.getByRole('grid', { name: 'Contacts' });
  if (parentElement === null) {
    throw new Error('La grille n’a pas de conteneur');
  }
  return parentElement;
}

function scrollToRow(index: number): void {
  fireEvent.scroll(scroller(), { target: { scrollTop: index * ROW_HEIGHT } });
}

function renderedNames(): ReadonlyArray<string> {
  return screen
    .getAllByRole('row')
    .map((row) => within(row).queryAllByRole('gridcell')[0]?.textContent ?? '')
    .filter((name) => name.startsWith('Contact '));
}

function recordOffsets(): string[] {
  const offsets: string[] = [];
  server.use(
    http.get('*/api/contacts', ({ request }) => {
      offsets.push(new URL(request.url).searchParams.get('offset') ?? '?');
      return undefined;
    }),
  );
  return offsets;
}

beforeEach(() => {
  mockVirtualLayout({ viewportHeight: VIEWPORT_HEIGHT, rowHeight: ROW_HEIGHT });
});

describe('Grid', () => {
  it('[R1] affiche l’en-tête des colonnes, le compteur et les premiers contacts', async () => {
    renderWithProviders(<Grid />);

    expect(await screen.findByText('Contact 1')).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Nom', 'Entreprise', 'Téléphone', 'Date', 'Score']);
    expect(screen.getByText(`${String(MOCK_CONTACT_COUNT)} contacts`)).toBeInTheDocument();
    expect(screen.getAllByText('Société 1').length).toBeGreaterThan(0);
  });

  it('[R1] aligne les nombres à droite et laisse vides les cellules sans valeur', async () => {
    renderWithProviders(<Grid />);

    const firstRow = (await screen.findByText('Contact 1')).closest('[role="row"]');
    if (!(firstRow instanceof HTMLElement)) {
      throw new Error('Première ligne introuvable');
    }
    const cells = within(firstRow).getAllByRole('gridcell');

    expect(cells.map((cell) => cell.textContent)).toEqual(['Contact 1', 'Société 1', '', '', '1']);
    expect(cells[4]?.className).toContain('right');
    expect(cells[0]?.className).not.toContain('right');
  });

  it('[R14] ne met dans le DOM qu’un petit nombre de lignes, quel que soit le total', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    const rendered = renderedNames().length;

    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThan(MOCK_CONTACT_COUNT / 2);
    expect(screen.getByRole('grid')).toHaveAttribute(
      'aria-rowcount',
      String(MOCK_CONTACT_COUNT + 1),
    );
  });

  it('[R2] charge la page suivante en approchant du bas, puis affiche ses contacts', async () => {
    const offsets = recordOffsets();
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    expect(offsets).toEqual(['0']);

    scrollToRow(45);

    await waitFor(() => {
      expect(offsets).toEqual(['0', '50']);
    });
    scrollToRow(60);
    expect(await screen.findByText('Contact 61')).toBeInTheDocument();
    expect(screen.queryByText('Contact 1')).not.toBeInTheDocument();
  });

  it('[R2] montre des lignes squelette tant que la page visée n’est pas arrivée', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    scrollToRow(100);

    await waitFor(() => {
      expect(screen.getAllByRole('row', { busy: true }).length).toBeGreaterThan(0);
    });
    expect(await screen.findByText('Contact 101')).toBeInTheDocument();
    expect(screen.queryAllByRole('row', { busy: true })).toHaveLength(0);
  });

  it('[R2] atteint le dernier contact en enchaînant les pages, sans lignes en trop', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    scrollToRow(MOCK_CONTACT_COUNT);

    expect(await screen.findByText(`Contact ${String(MOCK_CONTACT_COUNT)}`)).toBeInTheDocument();
    expect(screen.queryAllByRole('row', { busy: true })).toHaveLength(0);
  });

  it('[R1] affiche un état vide quand il n’y a aucun contact', async () => {
    server.use(
      http.get('*/api/contacts', () =>
        HttpResponse.json({ items: [], total: 0, offset: 0, limit: 50 }),
      ),
    );
    renderWithProviders(<Grid />);

    expect(await screen.findByText('Aucun contact.')).toBeInTheDocument();
    expect(screen.getByText('0 contact')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
  });

  it('[R1] propose « Réessayer » après l’échec du premier chargement', async () => {
    server.use(
      http.get('*/api/contacts', () => new HttpResponse(null, { status: 404 }), { once: true }),
    );
    renderWithProviders(<Grid />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Élément introuvable');
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Contact 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('[R1] propose « Réessayer » quand les colonnes ne chargent pas', async () => {
    server.use(
      http.get('*/api/columns', () => new HttpResponse(null, { status: 404 }), { once: true }),
    );
    renderWithProviders(<Grid />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByText('Contact 1')).toBeInTheDocument();
  });

  it('[R2] garde les contacts affichés si une page suivante échoue, sans réessayer en boucle', async () => {
    const offsets = recordOffsets();
    let failedAttempts = 0;
    server.use(
      http.get('*/api/contacts', ({ request }) => {
        const isSecondPage = new URL(request.url).searchParams.get('offset') === '50';
        if (!isSecondPage || failedAttempts > 0) {
          return undefined;
        }
        failedAttempts += 1;
        return new HttpResponse(null, { status: 404 });
      }),
    );
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    scrollToRow(45);

    expect(await screen.findByRole('alert')).toHaveTextContent('Élément introuvable');
    expect(screen.getByText('Contact 46')).toBeInTheDocument();
    // Une seule tentative : l'effet ne relance pas seul le chargement qui vient d'échouer.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(failedAttempts).toBe(1);
    expect(offsets).toEqual(['0']);

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    scrollToRow(60);

    expect(await screen.findByText('Contact 61')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
