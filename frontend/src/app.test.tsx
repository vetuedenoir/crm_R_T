import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './app';

describe('App', () => {
  it('affiche la liste des colonnes venant de l’API (critère de fin de la phase 8)', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'CRM' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Colonnes' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });
});
