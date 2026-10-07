import type { KeyboardEvent, ReactNode } from 'react';

import { classNames } from '../shared';

import type { CellEditorProps } from './column-type-ui';
import type { InputAttrs } from './input-attrs';
import styles from './input-field.module.css';

interface InputEditorProps extends CellEditorProps {
  readonly attrs: InputAttrs;
}

// Éditeur commun aux quatre types : seul l'élément `<input>` change, d'où `attrs`.
export function InputEditor({
  attrs,
  draft,
  label,
  invalid,
  onDraftChange,
  onCommit,
  onCancel,
}: InputEditorProps): ReactNode {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <input
      className={classNames(styles['input'], attrs.alignment === 'right' && styles['alignRight'])}
      type={attrs.type}
      inputMode={attrs.inputMode}
      value={draft}
      aria-label={label}
      aria-invalid={invalid}
      // L'éditeur n'apparaît que quand l'utilisateur démarre une édition : il doit recevoir le clavier.
      autoFocus
      onChange={(event) => {
        onDraftChange(event.target.value);
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
