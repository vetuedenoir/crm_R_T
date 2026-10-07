import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from './query';
import { ToastProvider, describeError, useToasts } from './ui';

function QueryProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const { notify } = useToasts();
  // Un seul client pour toute la vie de l'application : le cache serveur en dépend.
  const [client] = useState(() =>
    createQueryClient({
      onMutationError: (error) => {
        notify('error', describeError(error));
      },
    }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// Ordre des fournisseurs : les toasts d'abord, car le client de requêtes s'en sert pour signaler les échecs.
export function AppProviders({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <ToastProvider>
      <QueryProvider>{children}</QueryProvider>
    </ToastProvider>
  );
}
