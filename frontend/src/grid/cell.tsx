import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

import type { CellValue, Column, ContactId } from '../api';
import { COLUMN_TYPE_UI } from '../column-types';
import { classNames } from '../shared';

import { cellDomId } from './cell-address.pure';
import styles from './cell.module.css';
import type { CellActions } from './grid-controller';
import type { Editing } from './grid-state.pure';

interface CellProps {
  readonly column: Column;
  readonly contactId: ContactId;
  // `undefined` : la cellule est vide (pas d'entrée dans `cells`).
  readonly value: CellValue | undefined;
  readonly active: boolean;
  // Non nul seulement pour la cellule en cours d'édition.
  readonly editing: Editing | null;
  readonly actions: CellActions;
}

// Garde la cellule active visible quand le clavier la déplace ; `scroll-margin` (CSS) la tient sous l'en-tête collant.
function useScrollIntoViewWhenActive(active: boolean): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [active]);
  return ref;
}

interface EditingContentProps {
  readonly column: Column;
  readonly contactId: ContactId;
  readonly editing: Editing;
  readonly actions: CellActions;
}

// Le message du serveur prime ; sinon la validation locale, qui répond à chaque frappe (R16).
function EditingContent({ column, contactId, editing, actions }: EditingContentProps): ReactNode {
  const type = COLUMN_TYPE_UI[column.type];
  const error = editing.error ?? type.validate(editing.draft);
  return (
    <>
      <type.Editor
        draft={editing.draft}
        label={column.name}
        invalid={error !== null}
        onDraftChange={actions.onDraftChange}
        onCommit={() => {
          actions.onCommit({ contactId, columnId: column.id }, editing.draft);
        }}
        onCancel={actions.onCancel}
      />
      {error !== null && (
        <p role="alert" className={styles['error']}>
          {error}
        </p>
      )}
    </>
  );
}

export function Cell({ column, contactId, value, active, editing, actions }: CellProps): ReactNode {
  const type = COLUMN_TYPE_UI[column.type];
  const ref = useScrollIntoViewWhenActive(active);
  const address = { contactId, columnId: column.id };
  const text = value === undefined ? '' : type.format(value);
  return (
    <div
      ref={ref}
      id={cellDomId(address)}
      role="gridcell"
      aria-selected={active}
      className={classNames(
        styles['cell'],
        type.alignment === 'right' && styles['right'],
        active && styles['active'],
        editing !== null && styles['editing'],
      )}
      title={text === '' || editing !== null ? undefined : text}
      onClick={() => {
        actions.onActivate(address);
      }}
      onDoubleClick={() => {
        actions.onStartEdit(address);
      }}
    >
      {editing === null ? (
        text
      ) : (
        <EditingContent column={column} contactId={contactId} editing={editing} actions={actions} />
      )}
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
