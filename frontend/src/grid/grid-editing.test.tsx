import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_COLUMNS } from '../mocks';
import { server } from '../mocks/server';
import { errorBody } from '../test/error-body';
import { renderWithProviders } from '../test/render-app';
import { mockVirtualLayout } from '../test/virtual-layout';

import { Grid } from './grid';

const [NAME, COMPANY, PHONE, , SCORE] = DEFAULT_COLUMNS.map((column) => column.id);
const NAME_COLUMN = 0;
const COMPANY_COLUMN = 1;
const PHONE_COLUMN = 2;
const SCORE_COLUMN = 4;

interface RecordedPatch {
  readonly contactId: string;
  readonly body: unknown;
}

// Enregistre les `PATCH` puis laisse le handler par défaut répondre (`undefined` : on passe au suivant).
function recordPatches(): RecordedPatch[] {
  const patches: RecordedPatch[] = [];
  server.use(
    http.patch('*/api/contacts/:id', async ({ request, params }) => {
      patches.push({ contactId: String(params['id']), body: await request.clone().json() });
      return undefined;
    }),
  );
  return patches;
}

// Les lignes se repèrent par leur rang (1 = premier contact) : pendant l'édition, le texte de la cellule disparaît.
async function rowOf(contactNumber: number): Promise<HTMLElement> {
  return waitFor(() => {
    const row = screen
      .getAllByRole('row')
      .find((candidate) => candidate.dataset['index'] === String(contactNumber - 1));
    if (row === undefined) {
      throw new Error(`Contact ${String(contactNumber)} pas encore affiché`);
    }
    return row;
  });
}

async function cellOf(contactNumber: number, column: number): Promise<HTMLElement> {
  const cell = within(await rowOf(contactNumber)).getAllByRole('gridcell')[column];
  if (cell === undefined) {
    throw new Error(`Colonne ${String(column)} introuvable`);
  }
  return cell;
}

// Ouvre l'éditeur de la cellule au clavier : clic pour l'activer, puis Entrée.
async function startEditing(contactNumber: number, column: number): Promise<HTMLElement> {
  await userEvent.click(await cellOf(contactNumber, column));
  await userEvent.keyboard('{Enter}');
  return within(await cellOf(contactNumber, column)).getByRole('textbox');
}

async function typeInto(editor: HTMLElement, text: string): Promise<void> {
  await userEvent.clear(editor);
  await userEvent.type(editor, text);
}

function activeCellId(): string | null {
  return screen.getByRole('grid').getAttribute('aria-activedescendant');
}

beforeEach(() => {
  mockVirtualLayout({ viewportHeight: 320, rowHeight: 32 });
});

describe('Grid : édition en cellule', () => {
  it('[R6] modifie une valeur au clavier : Entrée ouvre l’éditeur, Entrée valide', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    const editor = await startEditing(1, NAME_COLUMN);
    expect(editor).toHaveValue('Contact 1');
    await typeInto(editor, 'Ada Lovelace');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(patches).toHaveLength(1);
    expect(patches[0]?.body).toEqual({ values: { [String(NAME)]: 'Ada Lovelace' } });
    // Après la validation, le clavier revient à la grille : les flèches fonctionnent.
    expect(screen.getByRole('grid')).toHaveFocus();
  });

  it('[R6] ouvre l’éditeur d’un double-clic', async () => {
    renderWithProviders(<Grid />);

    await userEvent.dblClick(await cellOf(2, COMPANY_COLUMN));

    expect(within(await cellOf(2, COMPANY_COLUMN)).getByRole('textbox')).toHaveValue('Société 2');
  });

  it('[R6] affiche la nouvelle valeur sans attendre la réponse du serveur', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.patch('*/api/contacts/:id', async () => {
        await gate;
        return undefined;
      }),
    );
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Ada');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    release();
    await waitFor(() => {
      expect(screen.getByText('Ada')).toBeInTheDocument();
    });
  });

  it('[R6] annule avec Échap : l’ancienne valeur reste et rien n’est envoyé', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Brouillon');
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Contact 1')).toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it('[R6] cliquer dans le champ en cours d’édition ne valide pas la saisie', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    const editor = await startEditing(1, NAME_COLUMN);
    await typeInto(editor, 'Ada');
    await userEvent.click(editor);
    await userEvent.dblClick(editor);

    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue('Ada');
    expect(patches).toHaveLength(0);
  });

  it('[R6] n’envoie rien quand la valeur validée n’a pas changé', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await startEditing(1, NAME_COLUMN);
    await userEvent.keyboard('{Enter}');

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it('[R16] signale une saisie invalide dès la frappe et refuse de la valider', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    const editor = await startEditing(1, SCORE_COLUMN);
    await typeInto(editor, 'abc');

    expect(await screen.findByRole('alert')).toHaveTextContent('Le nombre est invalide');
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    await userEvent.keyboard('{Enter}');
    expect(editor).toBeInTheDocument();
    expect(patches).toHaveLength(0);

    await typeInto(editor, '42,5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('42,5')).toBeInTheDocument();
    expect(patches[0]?.body).toEqual({ values: { [String(SCORE)]: 42.5 } });
  });

  it('[R16] envoie un téléphone normalisé et affiche la valeur du serveur', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, PHONE_COLUMN), '06 12 34 56 78');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('06 12 34 56 78')).toBeInTheDocument();
    expect(patches[0]?.body).toEqual({ values: { [String(PHONE)]: '0612345678' } });
  });

  it('[R16] rejet du serveur : retour arrière, éditeur rouvert avec la saisie et le message', async () => {
    server.use(
      http.patch('*/api/contacts/:id', () =>
        HttpResponse.json(
          errorBody('VALIDATION_FAILED', 'Certaines valeurs sont invalides', [
            { field: String(SCORE), message: 'Le score doit être positif' },
          ]),
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, SCORE_COLUMN), '-5');
    await userEvent.keyboard('{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Le score doit être positif');
    // Un seul message, dans la cellule : pas de toast en doublon.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    const editor = within(await cellOf(1, SCORE_COLUMN)).getByRole('textbox');
    expect(editor).toHaveValue('-5');
    expect(editor).toHaveAttribute('aria-invalid', 'true');

    // La valeur affichée est revenue en arrière : annuler montre l'ancienne.
    await userEvent.keyboard('{Escape}');
    expect(within(await cellOf(1, SCORE_COLUMN)).queryByRole('textbox')).toBeNull();
    expect((await cellOf(1, SCORE_COLUMN)).textContent).toBe('1');
  });

  it('[R6] permet de corriger après un rejet sans retaper tout le texte', async () => {
    let calls = 0;
    server.use(
      http.patch('*/api/contacts/:id', () => {
        calls += 1;
        return calls > 1
          ? undefined
          : HttpResponse.json(errorBody('VALIDATION_FAILED', 'Valeur refusée'), { status: 422 });
      }),
    );
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Ada');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Valeur refusée');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('[R6] serveur injoignable : retour arrière et message dans la cellule', async () => {
    server.use(http.patch('*/api/contacts/:id', () => HttpResponse.error()));
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Ada');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur est injoignable');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Contact 1')).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });

  it('[R6] contact supprimé entre-temps : message « introuvable » dans la cellule', async () => {
    server.use(http.patch('*/api/contacts/:id', () => new HttpResponse(null, { status: 404 })));
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Ada');
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Élément introuvable');
  });

  it('[R6] Suppr vide la cellule active', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await userEvent.click(await cellOf(1, COMPANY_COLUMN));
    await userEvent.keyboard('{Delete}');

    await waitFor(async () => {
      expect((await cellOf(1, COMPANY_COLUMN)).textContent).toBe('');
    });
    expect(patches[0]?.body).toEqual({ values: { [String(COMPANY)]: null } });
  });

  it('[R6] Suppr sur une cellule déjà vide n’envoie rien', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await userEvent.click(await cellOf(1, PHONE_COLUMN));
    await userEvent.keyboard('{Delete}');

    expect(patches).toHaveLength(0);
  });
});

describe('Grid : navigation au clavier', () => {
  it('[R6] la première cellule devient active quand la grille reçoit le focus', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');

    await userEvent.tab();

    expect(screen.getByRole('grid')).toHaveFocus();
    const first = await cellOf(1, NAME_COLUMN);
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(activeCellId()).toBe(first.id);
  });

  it('[R6] les flèches déplacent la cellule active et s’arrêtent aux bords', async () => {
    renderWithProviders(<Grid />);
    await screen.findByText('Contact 1');
    await userEvent.tab();

    await userEvent.keyboard('{ArrowRight}{ArrowDown}');
    expect(activeCellId()).toBe((await cellOf(2, COMPANY_COLUMN)).id);

    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowLeft}{ArrowLeft}');
    expect(activeCellId()).toBe((await cellOf(1, NAME_COLUMN)).id);
    expect(within(await rowOf(1)).getAllByRole('gridcell', { selected: true })).toHaveLength(1);
  });

  it('[R6] Tab valide la saisie puis passe à la cellule de droite', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Ada');
    await userEvent.keyboard('{Tab}');

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(patches).toHaveLength(1);
    expect(activeCellId()).toBe((await cellOf(1, COMPANY_COLUMN)).id);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('[R16] Tab avec une saisie invalide garde l’éditeur ouvert', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    const editor = await startEditing(1, SCORE_COLUMN);
    await typeInto(editor, 'abc');
    await userEvent.keyboard('{Tab}');

    expect(editor).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Le nombre est invalide');
    expect(patches).toHaveLength(0);
  });

  it('[R6] cliquer une autre cellule valide la saisie en cours', async () => {
    const patches = recordPatches();
    renderWithProviders(<Grid />);

    await typeInto(await startEditing(1, NAME_COLUMN), 'Ada');
    await userEvent.click(await cellOf(3, COMPANY_COLUMN));

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(patches).toHaveLength(1);
    expect(activeCellId()).toBe((await cellOf(3, COMPANY_COLUMN)).id);
  });

  it('[R16] cliquer ailleurs avec une saisie invalide garde l’éditeur ouvert', async () => {
    renderWithProviders(<Grid />);

    const editor = await startEditing(1, SCORE_COLUMN);
    await typeInto(editor, 'abc');
    await userEvent.click(await cellOf(3, COMPANY_COLUMN));

    expect(editor).toBeInTheDocument();
    expect(activeCellId()).toBe((await cellOf(1, SCORE_COLUMN)).id);
  });
});
