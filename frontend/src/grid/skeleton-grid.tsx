import type { ReactNode } from 'react';

import type { Column } from '../api';

import styles from './grid-viewport.module.css';
import { HeaderRow, type HeaderSortProps } from './header-row';
import { SkeletonRow } from './row';

// Assez de lignes pour remplir un écran pendant le premier chargement.
const SKELETON_ROW_COUNT = 15;
const SKELETON_INDEXES: ReadonlyArray<number> = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_unused, index) => index,
);

function ignoreMeasure(): void {
  // Ces lignes ne sont pas virtualisées : personne n'a besoin de leur hauteur.
}

// Premier chargement (ou changement de vue) : la structure de la grille est déjà là, seules les valeurs manquent.
// L'en-tête reste actif : on peut changer de tri sans attendre.
export function SkeletonGrid({
  columns,
  ...sorting
}: HeaderSortProps & { readonly columns: ReadonlyArray<Column> }): ReactNode {
  return (
    <div className={styles['scroller']} aria-busy="true">
      <div className={styles['grid']}>
        <HeaderRow columns={columns} {...sorting} />
        {SKELETON_INDEXES.map((index) => (
          <SkeletonRow key={index} columns={columns} index={index} measureRef={ignoreMeasure} />
        ))}
      </div>
    </div>
  );
}
