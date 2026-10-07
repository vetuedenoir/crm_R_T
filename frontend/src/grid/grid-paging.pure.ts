import type { Contact, ContactsPage } from '../api';

// Nombre de lignes avant la fin des données chargées à partir duquel on demande la page suivante :
// la page arrive avant que l'utilisateur n'atteigne les lignes squelette.
export const PREFETCH_THRESHOLD = 10;

export function flattenPages(pages: ReadonlyArray<ContactsPage>): ReadonlyArray<Contact> {
  return pages.flatMap((page) => page.items);
}

// Le total de la dernière page est le plus récent : c'est lui qui reflète les ajouts et suppressions.
export function latestTotal(pages: ReadonlyArray<ContactsPage>): number {
  return pages.at(-1)?.total ?? 0;
}

export interface VirtualRowCountInput {
  readonly loadedCount: number;
  readonly total: number;
  readonly hasNextPage: boolean;
}

// La barre de défilement est dimensionnée par `total` (R2). Quand plus rien n'est à charger, on s'arrête à
// ce qui est chargé : si des contacts ont disparu en cours de route, des lignes squelette resteraient à vie.
export function virtualRowCount({ loadedCount, total, hasNextPage }: VirtualRowCountInput): number {
  return hasNextPage ? Math.max(total, loadedCount) : loadedCount;
}

export interface PagingState {
  // Index de la dernière ligne rendue par le virtualiseur, -1 s'il n'y en a aucune.
  readonly lastVisibleIndex: number;
  readonly loadedCount: number;
  readonly hasNextPage: boolean;
  readonly isFetching: boolean;
  // Après un échec on n'insiste pas tout seul : sans cela, une API en panne serait martelée en boucle.
  // L'utilisateur relance avec « Réessayer ».
  readonly hasFetchError: boolean;
}

export function shouldFetchNextPage(state: PagingState): boolean {
  if (!state.hasNextPage || state.isFetching || state.hasFetchError) {
    return false;
  }
  return state.lastVisibleIndex >= state.loadedCount - PREFETCH_THRESHOLD;
}
