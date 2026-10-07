import type { ReactNode } from 'react';

import styles from './error-state.module.css';

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry: () => void;
}

// État d'erreur commun : le message et le bouton « Réessayer » (RULES §5).
export function ErrorState({ message, onRetry }: ErrorStateProps): ReactNode {
  return (
    <div className={styles['container']} role="alert">
      <p className={styles['message']}>{message}</p>
      <button type="button" className={styles['retry']} onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}
