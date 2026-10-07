import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TOAST_DURATION_MS } from './toast-list';
import { ToastProvider } from './toast-provider';
import { useToasts } from './use-toasts';

function Trigger(): React.ReactNode {
  const { notify } = useToasts();
  return (
    <button
      type="button"
      onClick={() => {
        notify('error', 'Suppression impossible');
      }}
    >
      Déclencher
    </button>
  );
}

function renderTrigger(): void {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche une erreur annoncée aux lecteurs d’écran', async () => {
    renderTrigger();

    await userEvent.click(screen.getByRole('button', { name: 'Déclencher' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Suppression impossible');
  });

  it('se ferme au clic sur la croix', async () => {
    renderTrigger();
    await userEvent.click(screen.getByRole('button', { name: 'Déclencher' }));

    await userEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disparaît seule après quelques secondes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderTrigger();
    await userEvent.click(screen.getByRole('button', { name: 'Déclencher' }));

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuse useToasts hors du fournisseur, avec un message clair', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Trigger />)).toThrow('<ToastProvider>');
  });
});
