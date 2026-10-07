import type { ReactNode } from 'react';

import { useColumns } from '../query';
import { ErrorState, describeError } from '../ui';

import styles from './column-list.module.css';
import { COLUMN_TYPE_LABELS } from './column-type-labels';

// Premier consommateur réel de l'API (critère de fin de la phase 8) ; la grille le remplacera en phase 10.
export function ColumnList(): ReactNode {
  const columns = useColumns();

  if (columns.isPending) {
    return <p role="status">Chargement des colonnes…</p>;
  }
  if (columns.isError) {
    return (
      <ErrorState
        message={describeError(columns.error)}
        onRetry={() => {
          void columns.refetch();
        }}
      />
    );
  }
  return (
    <ul className={styles['list']} aria-label="Colonnes">
      {columns.data.map((column) => (
        <li key={column.id} className={styles['item']}>
          <span className={styles['name']}>{column.name}</span>
          <span className={styles['type']}>{COLUMN_TYPE_LABELS[column.type]}</span>
        </li>
      ))}
    </ul>
  );
}
