import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

let shouldCrash = true;

function Fragile(): React.ReactNode {
  if (shouldCrash) {
    throw new Error('rendu cassé');
  }
  return <p>Contenu sain</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldCrash = true;
    // React journalise l'erreur attrapée : on évite de polluer la sortie des tests.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('affiche le contenu quand tout va bien', () => {
    shouldCrash = false;

    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Contenu sain')).toBeInTheDocument();
  });

  it('remplace seulement le sous-arbre en erreur, le reste de la page reste affiché', () => {
    render(
      <div>
        <p>En-tête</p>
        <ErrorBoundary message="La grille a rencontré une erreur.">
          <Fragile />
        </ErrorBoundary>
      </div>,
    );

    expect(screen.getByText('En-tête')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('La grille a rencontré une erreur.');
  });

  it('journalise l’erreur au lieu de l’avaler', () => {
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'rendu cassé' }),
      expect.any(String),
    );
  });

  it('« Réessayer » ré-affiche le contenu une fois le problème résolu', async () => {
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    );
    shouldCrash = false;

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('Contenu sain')).toBeInTheDocument();
  });
});
