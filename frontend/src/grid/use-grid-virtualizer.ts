import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useRef, type RefObject } from 'react';

import { virtualRowCount } from './grid-paging.pure';
import { useLoadMore } from './use-load-more';

// Hauteur de départ d'une ligne (2 rem à 16 px), avant mesure. La vraie hauteur vient de `--cell-height`.
const ESTIMATED_ROW_HEIGHT_PX = 32;
// Lignes rendues au-delà de la zone visible : évite les blancs au défilement rapide, et couvre la hauteur
// de l'en-tête collant, que le virtualiseur ne connaît pas.
const OVERSCAN_ROWS = 8;

export interface GridVirtualizerInput {
  readonly loadedCount: number;
  readonly total: number;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPageError: boolean;
  readonly onLoadMore: () => void;
}

export interface GridVirtualizer {
  readonly scrollerRef: RefObject<HTMLDivElement | null>;
  readonly rowCount: number;
  readonly items: ReadonlyArray<VirtualItem>;
  readonly measureRef: (node: HTMLDivElement | null) => void;
  // Hauteur des lignes non rendues avant et après : elles gardent à la barre de défilement sa taille réelle.
  readonly paddingTop: number;
  readonly paddingBottom: number;
}

// Virtualisation des lignes et déclenchement du chargement de la page suivante (R2).
export function useGridVirtualizer(input: GridVirtualizerInput): GridVirtualizer {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowCount = virtualRowCount(input);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT_PX,
    overscan: OVERSCAN_ROWS,
  });
  const items = virtualizer.getVirtualItems();
  const lastItem = items.at(-1);

  useLoadMore(
    {
      lastVisibleIndex: lastItem?.index ?? -1,
      loadedCount: input.loadedCount,
      hasNextPage: input.hasNextPage,
      isFetching: input.isFetchingNextPage,
      hasFetchError: input.hasNextPageError,
    },
    input.onLoadMore,
  );

  return {
    scrollerRef,
    rowCount,
    items,
    measureRef: virtualizer.measureElement,
    paddingTop: items[0]?.start ?? 0,
    paddingBottom: Math.max(0, virtualizer.getTotalSize() - (lastItem?.end ?? 0)),
  };
}
