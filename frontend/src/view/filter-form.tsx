import { useReducer, type Dispatch, type ReactNode, type SyntheticEvent } from 'react';

import type { Column, FilterOperator, FilterSpec } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';

import styles from './filter-bar.module.css';
import {
  INITIAL_FILTER_DRAFT,
  buildFilter,
  filterDraftReducer,
  resolveDraft,
  type FilterDraft,
  type FilterDraftAction,
  type ResolvedDraft,
} from './filter-draft.pure';
import { FILTER_OPERATOR_LABELS } from './operator-labels';

interface Option<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

interface OptionSelectProps<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
  readonly options: ReadonlyArray<Option<TValue>>;
  readonly onSelect: (value: TValue) => void;
}

// Une valeur d'`<option>` est toujours une chaîne : on retrouve l'option choisie plutôt que de forcer le type.
function OptionSelect<TValue extends string>({
  label,
  value,
  options,
  onSelect,
}: OptionSelectProps<TValue>): ReactNode {
  return (
    <select
      className={styles['select']}
      aria-label={label}
      value={value}
      onChange={(event) => {
        const chosen = options.find((option) => option.value === event.target.value);
        if (chosen !== undefined) {
          onSelect(chosen.value);
        }
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function operatorsFor(type: Column['type']): ReadonlyArray<FilterOperator> {
  return COLUMN_TYPE_UI[type].filterOperators;
}

interface FilterControlsProps {
  readonly columns: ReadonlyArray<Column>;
  readonly resolved: ResolvedDraft;
  readonly draft: FilterDraft;
  readonly dispatch: Dispatch<FilterDraftAction>;
}

// Colonne, opérateur (selon le type) et champs de saisie (selon l'opérateur).
function FilterControls({ columns, resolved, draft, dispatch }: FilterControlsProps): ReactNode {
  const { column, operator } = resolved;
  const typeUi = COLUMN_TYPE_UI[column.type];
  return (
    <>
      <OptionSelect
        label="Colonne du filtre"
        value={column.id}
        options={columns.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
        onSelect={(columnId) => {
          dispatch({ type: 'select-column', columnId });
        }}
      />
      <OptionSelect
        label="Opérateur du filtre"
        value={operator}
        options={typeUi.filterOperators.map((candidate) => ({
          value: candidate,
          label: FILTER_OPERATOR_LABELS[candidate],
        }))}
        onSelect={(next) => {
          dispatch({ type: 'select-operator', operator: next });
        }}
      />
      <typeUi.FilterInput
        operator={operator}
        values={draft.values}
        label={column.name}
        onChange={(values) => {
          dispatch({ type: 'change-values', values });
        }}
      />
    </>
  );
}

interface FilterFormProps {
  readonly columns: ReadonlyArray<Column>;
  readonly onAdd: (filter: FilterSpec) => void;
}

// Saisie d'un filtre. Il n'entre dans la vue que s'il est valide pour le type de la colonne (R16).
export function FilterForm({ columns, onAdd }: FilterFormProps): ReactNode {
  const [draft, dispatch] = useReducer(filterDraftReducer, INITIAL_FILTER_DRAFT);
  const resolved = resolveDraft(draft, columns, operatorsFor);
  if (resolved === null) {
    return null;
  }
  const { column, operator } = resolved;
  const typeUi = COLUMN_TYPE_UI[column.type];

  function handleSubmit(event: SyntheticEvent): void {
    event.preventDefault();
    const filter = buildFilter(column, operator, draft.values, (op, values) =>
      typeUi.parseFilterValues(op, values),
    );
    if (filter.ok) {
      onAdd(filter.value);
      dispatch({ type: 'filter-added' });
    } else {
      dispatch({ type: 'rejected', error: filter.error });
    }
  }

  return (
    <form className={styles['form']} onSubmit={handleSubmit}>
      <FilterControls columns={columns} resolved={resolved} draft={draft} dispatch={dispatch} />
      <button type="submit" className={styles['submit']}>
        Ajouter le filtre
      </button>
      {draft.error !== null && (
        <p role="alert" className={styles['error']}>
          {draft.error}
        </p>
      )}
    </form>
  );
}
