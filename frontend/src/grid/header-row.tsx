import type { ReactNode } from 'react';

import type { Column } from '../api';
import { COLUMN_TYPE_LABELS } from '../columns';
import { classNames } from '../shared';

import cellStyles from './cell.module.css';
import styles from './header-row.module.css';

interface HeaderRowProps {
  readonly columns: ReadonlyArray<Column>;
}

// Collé en haut de la zone de défilement : il reste visible pendant que les lignes défilent (R1).
export function HeaderRow({ columns }: HeaderRowProps): ReactNode {
  return (
    <div role="rowgroup" className={styles['header']}>
      <div role="row" className={styles['row']} aria-rowindex={1}>
        {columns.map((column) => (
          <div
            key={column.id}
            role="columnheader"
            className={classNames(cellStyles['cell'], styles['columnHeader'])}
            title={`${column.name} (${COLUMN_TYPE_LABELS[column.type]})`}
          >
            {column.name}
          </div>
        ))}
      </div>
    </div>
  );
}
