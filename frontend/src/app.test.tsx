import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';
import { MOCK_CONTACT_COUNT } from './mocks';
import { mockVirtualLayout } from './test/virtual-layout';

describe('App', () => {
  beforeEach(() => {
    mockVirtualLayout({ viewportHeight: 320, rowHeight: 32 });
  });

  it('[R1] affiche la grille des contacts venant de l’API (critère de fin de la phase 10)', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'CRM' })).toBeInTheDocument();
    expect(await screen.findByRole('grid', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    expect(screen.getByText(`${String(MOCK_CONTACT_COUNT)} contacts`)).toBeInTheDocument();
  });
});
