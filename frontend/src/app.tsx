import type { ReactNode } from 'react';

import { EMPTY_CONTACTS_VIEW } from './api';
import { AppProviders } from './app-providers';
import styles from './app.module.css';
import { Grid } from './grid';
import { ErrorBoundary } from './ui';

export function App(): ReactNode {
  return (
    <ErrorBoundary message="L'application a rencontré une erreur.">
      <AppProviders>
        <main className={styles['page']}>
          <h1 className={styles['title']}>CRM</h1>
          <ErrorBoundary>
            <Grid view={EMPTY_CONTACTS_VIEW} />
          </ErrorBoundary>
        </main>
      </AppProviders>
    </ErrorBoundary>
  );
}
