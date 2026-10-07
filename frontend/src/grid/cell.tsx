import type { ReactNode } from 'react';

import type { CellValue, Column } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';
import { classNames } from '../shared';

import styles from './cell.module.css';

interface CellProps {
  readonly column: Column;
  // `undefined` : la cellule est vide (pas d'entrée dans `cells`).
  readonly value: CellValue | undefined;
}

// Cellule en lecture seule ; l'édition arrive en phase 11.
export function Cell({ column, value }: CellProps): ReactNode {
  const type = COLUMN_TYPE_UI[column.type];
  const text = value === undefined ? '' : type.format(value);
  return (
    <div
      role="gridcell"
      className={classNames(styles['cell'], type.alignment === 'right' && styles['right'])}
      title={text === '' ? undefined : text}
    >
      {text}
    </div>
  );
}

export function SkeletonCell(): ReactNode {
  return (
    <div role="gridcell" className={styles['cell']}>
      <span className={styles['skeletonBar']} aria-hidden="true" />
    </div>
  );
}
