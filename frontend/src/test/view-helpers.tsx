import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';

import type { Column } from '../api';
import { DEFAULT_COLUMNS } from '../mocks';
import { server } from '../mocks/server';

function defaultColumn(position: number): Column {
  const column = DEFAULT_COLUMNS[position];
  if (column === undefined) {
    throw new Error(`Colonne ${String(position)} absente des colonnes par défaut`);
  }
  return column;
}

export const NAME_COLUMN = defaultColumn(0);
export const PHONE_COLUMN = defaultColumn(2);
export const DATE_COLUMN = defaultColumn(3);
export const SCORE_COLUMN = defaultColumn(4);

export const ROW_HEIGHT = 32;

// Enregistre les paramètres de chaque `GET /contacts`, puis laisse le handler par défaut répondre.
export function recordRequests(): URLSearchParams[] {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get('*/api/contacts', ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return undefined;
    }),
  );
  return requests;
}

export function lastRequest(requests: ReadonlyArray<URLSearchParams>): URLSearchParams {
  const last = requests.at(-1);
  if (last === undefined) {
    throw new Error('Aucune requête envoyée');
  }
  return last;
}

export function sentFilters(requests: ReadonlyArray<URLSearchParams>): unknown {
  return JSON.parse(lastRequest(requests).get('filters') ?? 'null');
}

export function header(name: string): HTMLElement {
  const found = screen
    .getAllByRole('columnheader')
    .find((candidate) => candidate.textContent === name);
  if (found === undefined) {
    throw new Error(`En-tête « ${name} » introuvable`);
  }
  return found;
}

// Le conteneur qui défile est le parent de la grille (`role="grid"`).
export function scroller(): HTMLElement {
  const { parentElement } = screen.getByRole('grid', { name: 'Contacts' });
  if (parentElement === null) {
    throw new Error('La grille n’a pas de conteneur');
  }
  return parentElement;
}

export async function sortBy(columnName: string, choice: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: `Trier ${columnName}` }));
  await userEvent.click(screen.getByRole('button', { name: choice }));
}

export async function chooseColumn(name: string, operator?: string): Promise<void> {
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Colonne du filtre' }), name);
  if (operator !== undefined) {
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Opérateur du filtre' }),
      operator,
    );
  }
}

export async function addFilter(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter le filtre' }));
}

export async function addNumberFilter(operator: string, value: string): Promise<void> {
  await chooseColumn('Score', operator);
  await userEvent.type(screen.getByRole('textbox', { name: 'Score' }), value);
  await addFilter();
}

export function operatorLabels(): ReadonlyArray<string> {
  const select = screen.getByRole('combobox', { name: 'Opérateur du filtre' });
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
}

// La barre de filtres a aussi des champs texte : l'éditeur de cellule se cherche dans la grille.
export function openEditor(): HTMLElement | null {
  return within(screen.getByRole('grid')).queryByRole('textbox');
}

// La barre de filtres précède la grille dans l'ordre de tabulation : on tabule jusqu'à elle.
export async function tabToGrid(): Promise<void> {
  const grid = screen.getByRole('grid');
  for (let attempt = 0; attempt < 20 && document.activeElement !== grid; attempt += 1) {
    await userEvent.tab();
  }
}
