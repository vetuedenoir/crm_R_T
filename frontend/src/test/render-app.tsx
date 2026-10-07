import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '../query';
import { ToastProvider, describeError, useToasts } from '../ui';

// Même assemblage que `AppProviders`, avec un client neuf par test et des essais sans délai.
function TestQueryProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const { notify } = useToasts();
  const [client] = useState(() =>
    createQueryClient({
      onMutationError: (error) => {
        notify('error', describeError(error));
      },
      retryDelay: () => 0,
    }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function TestProviders({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <ToastProvider>
      <TestQueryProvider>{children}</TestQueryProvider>
    </ToastProvider>
  );
}

export function renderWithProviders(ui: ReactNode): RenderResult {
  return render(ui, { wrapper: TestProviders });
}
