import { createContext, useContext } from 'react';

import type { ToastKind } from './toast-reducer.pure';

export interface ToastApi {
  readonly notify: (kind: ToastKind, message: string) => void;
}

export const toastContext = createContext<ToastApi | null>(null);

export function useToasts(): ToastApi {
  const api = useContext(toastContext);
  if (api === null) {
    throw new Error('useToasts doit être appelé sous un <ToastProvider>');
  }
  return api;
}
