import type { ReactNode } from 'react';

import type { Column, ContactsView, FilterSpec } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';

import styles from './filter-bar.module.css';
import { FilterForm } from './filter-form';
import { describeFilter } from './filter-label.pure';

interface FilterBarProps {
  readonly columns: ReadonlyArray<Column>;
  readonly view: ContactsView;
  readonly onAdd: (filter: FilterSpec) => void;
  readonly onRemove: (index: number) => void;
}

// Filtres actifs, chacun retirable. Un filtre dont la colonne a disparu n'a rien à afficher.
function ActiveFilters({ columns, view, onRemove }: Omit<FilterBarProps, 'onAdd'>): ReactNode {
  return (
    <ul className={styles['chips']} aria-label="Filtres actifs">
      {view.filters.map((filter, index) => {
        const column = columns.find((candidate) => candidate.id === filter.columnId);
        if (column === undefined) {
          return null;
        }
        const typeUi = COLUMN_TYPE_UI[column.type];
        const text = describeFilter(column.name, filter, (value) => typeUi.format(value));
        return (
          // L'index est la seule identité d'un filtre : deux filtres identiques sont permis.
          <li key={index} className={styles['chip']}>
            <span>{text}</span>
            <button
              type="button"
              className={styles['remove']}
              aria-label={`Retirer le filtre : ${text}`}
              onClick={() => {
                onRemove(index);
              }}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// Barre de filtres (R8) : saisie d'un filtre puis liste des filtres actifs, combinés par ET.
export function FilterBar({ columns, view, onAdd, onRemove }: FilterBarProps): ReactNode {
  return (
    <section className={styles['bar']} aria-label="Filtres">
      <FilterForm columns={columns} onAdd={onAdd} />
      {view.filters.length > 0 && (
        <ActiveFilters columns={columns} view={view} onRemove={onRemove} />
      )}
    </section>
  );
}
