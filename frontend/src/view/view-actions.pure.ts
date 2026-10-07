import type { ColumnId, ContactsView, FilterSpec, SortDirection } from '../api';

// Un seul tri à la fois : choisir une colonne remplace le tri précédent. `null` retire le tri.
export function withSort(
  view: ContactsView,
  columnId: ColumnId,
  direction: SortDirection | null,
): ContactsView {
  return { ...view, sort: direction === null ? null : { columnId, direction } };
}

// Les filtres se combinent par ET (comme côté API) : en ajouter un ne peut que restreindre le résultat.
export function withFilter(view: ContactsView, filter: FilterSpec): ContactsView {
  return { ...view, filters: [...view.filters, filter] };
}

export function withoutFilterAt(view: ContactsView, index: number): ContactsView {
  return { ...view, filters: view.filters.filter((_filter, position) => position !== index) };
}
