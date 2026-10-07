import type { ReactNode } from 'react';

import { AppProviders } from './app-providers';
import styles from './app.module.css';
import { ColumnList } from './columns';
import { ErrorBoundary } from './ui';

export function App(): ReactNode {
  return (
    <ErrorBoundary message="L'application a rencontré une erreur.">
      <AppProviders>
        <main className={styles['page']}>
          <h1 className={styles['title']}>CRM</h1>
          <section>
            <h2 className={styles['subtitle']}>Colonnes</h2>
            <ErrorBoundary>
              <ColumnList />
            </ErrorBoundary>
          </section>
        </main>
      </AppProviders>
    </ErrorBoundary>
  );
}
