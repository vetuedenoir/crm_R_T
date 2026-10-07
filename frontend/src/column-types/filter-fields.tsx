import type { ReactNode } from 'react';

import { classNames } from '../shared';

import type { FilterInputProps } from './column-type-ui';
import { FILTER_OPERATOR_ARITY } from './filter-arity.pure';
import type { InputAttrs } from './input-attrs';
import styles from './input-field.module.css';

interface FilterFieldsProps extends FilterInputProps {
  readonly attrs: InputAttrs;
}

const BETWEEN_LABELS: ReadonlyArray<string> = ['minimum', 'maximum'];

function fieldLabel(label: string, arity: number, index: number): string {
  return arity === 2 ? `${label} (${BETWEEN_LABELS[index] ?? ''})` : label;
}

// Autant de champs que l'opérateur attend de valeurs : aucun pour « est vide », deux pour « entre ».
export function FilterFields({
  attrs,
  operator,
  values,
  label,
  onChange,
}: FilterFieldsProps): ReactNode {
  const arity = FILTER_OPERATOR_ARITY[operator];

  return (
    <div className={styles['fields']}>
      {Array.from({ length: arity }, (_unused, index) => (
        <input
          key={index}
          className={classNames(
            styles['input'],
            attrs.alignment === 'right' && styles['alignRight'],
          )}
          type={attrs.type}
          inputMode={attrs.inputMode}
          value={values[index] ?? ''}
          aria-label={fieldLabel(label, arity, index)}
          onChange={(event) => {
            const next = Array.from({ length: arity }, (_ignored, i) => values[i] ?? '');
            next[index] = event.target.value;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}
