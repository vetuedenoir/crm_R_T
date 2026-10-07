import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { Column, ContactsView, ColumnTypeName } from '../api';
import { COLUMN_TYPE_UI, type ColumnTypeLogic } from '../column-types';

import { viewFromSearch, withViewSearch } from './view-url.pure';

// `replaceState` ne prévient personne : on émet notre propre événement pour que le rendu relise l'URL.
const VIEW_CHANGE_EVENT = 'crm:view-change';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(VIEW_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(VIEW_CHANGE_EVENT, onChange);
  };
}

function currentSearch(): string {
  return window.location.search;
}

function logicOf(type: ColumnTypeName): ColumnTypeLogic {
  return COLUMN_TYPE_UI[type];
}

export interface UrlView {
  readonly view: ContactsView;
  readonly setView: (view: ContactsView) => void;
}

// La vue (tri et filtres) vit dans l'URL : partageable et conservée au rechargement (R14). L'URL est la
// seule source de vérité, il n'y a pas d'état à synchroniser. `replaceState` : un clic de tri ou de filtre
// ne doit pas remplir l'historique du navigateur.
export function useUrlView(columns: ReadonlyArray<Column>): UrlView {
  const search = useSyncExternalStore(subscribe, currentSearch);
  const view = useMemo(() => viewFromSearch(search, columns, logicOf), [search, columns]);

  const setView = useCallback((next: ContactsView) => {
    const { pathname, search: previous, hash } = window.location;
    window.history.replaceState(null, '', `${pathname}${withViewSearch(previous, next)}${hash}`);
    window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
  }, []);

  return { view, setView };
}
