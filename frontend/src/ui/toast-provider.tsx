import { useCallback, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { ToastList } from './toast-list';
import { toastReducer } from './toast-reducer.pure';
import { toastContext, type ToastApi } from './use-toasts';

// React 19 : le contexte lui-même sert de fournisseur.
const ToastContext = toastContext;

export function ToastProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const nextId = useRef(0);

  const notify = useCallback<ToastApi['notify']>((kind, message) => {
    nextId.current += 1;
    dispatch({ type: 'added', toast: { id: String(nextId.current), kind, message } });
  }, []);
  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'dismissed', id });
  }, []);
  const api = useMemo<ToastApi>(() => ({ notify }), [notify]);

  return (
    <ToastContext value={api}>
      {children}
      <ToastList toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}
