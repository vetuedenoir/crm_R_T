import type { ReactNode } from 'react';

import type { Column, ColumnId, SortDirection, SortSpec } from '../api';
import { COLUMN_TYPE_LABELS } from '../columns';
import { classNames } from '../shared';

import cellStyles from './cell.module.css';
import styles from './header-row.module.css';
import { SortMenu } from './sort-menu';

export interface HeaderSortProps {
  readonly sort: SortSpec | null;
  readonly onSortChange: (columnId: ColumnId, direction: SortDirection | null) => void;
}

interface HeaderRowProps extends HeaderSortProps {
  readonly columns: ReadonlyArray<Column>;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

// Collé en haut de la zone de défilement : il reste visible pendant que les lignes défilent (R1).
export function HeaderRow({ columns, sort, onSortChange }: HeaderRowProps): ReactNode {
  return (
    <div role="rowgroup" className={styles['header']}>
      <div role="row" className={styles['row']} aria-rowindex={1}>
        {columns.map((column) => {
          const direction = sort?.columnId === column.id ? sort.direction : null;
          return (
            <div
              key={column.id}
              role="columnheader"
              className={classNames(cellStyles['cell'], styles['columnHeader'])}
              aria-sort={direction === null ? 'none' : ARIA_SORT[direction]}
              title={`${column.name} (${COLUMN_TYPE_LABELS[column.type]})`}
            >
              <span className={styles['name']}>{column.name}</span>
              <SortMenu
                columnName={column.name}
                direction={direction}
                onChange={(next) => {
                  onSortChange(column.id, next);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
