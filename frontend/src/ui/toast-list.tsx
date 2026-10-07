import { useEffect, type ReactNode } from 'react';

import { classNames } from '../shared';

import styles from './toast-list.module.css';
import type { Toast } from './toast-reducer.pure';

export const TOAST_DURATION_MS = 6000;

interface ToastItemProps {
  readonly toast: Toast;
  readonly onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps): ReactNode {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, TOAST_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  return (
    <li
      className={classNames(styles['toast'], styles[toast.kind])}
      role={toast.kind === 'error' ? 'alert' : 'status'}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        className={styles['close']}
        aria-label="Fermer la notification"
        onClick={() => {
          onDismiss(toast.id);
        }}
      >
        ×
      </button>
    </li>
  );
}

interface ToastListProps {
  readonly toasts: ReadonlyArray<Toast>;
  readonly onDismiss: (id: string) => void;
}

export function ToastList({ toasts, onDismiss }: ToastListProps): ReactNode {
  return (
    <ul className={styles['list']} aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </ul>
  );
}
