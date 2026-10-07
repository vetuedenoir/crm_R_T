import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { server } from '../mocks/server';

// Le premier rendu enchaîne deux requêtes (colonnes, puis contacts de la vue) : à froid, et avec toute la suite
// en parallèle, il dépasse parfois la seconde par défaut. Le délai ne ralentit que les tests qui échouent.
configure({ asyncUtilTimeout: 3000 });

// jsdom n'implémente pas `scrollIntoView` : la grille s'en sert pour garder la cellule active visible.
Element.prototype.scrollIntoView = () => undefined;

// `error` : une requête sans handler fait échouer le test au lieu de partir vers un vrai réseau.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  cleanup();
  // La vue (tri, filtres) vit dans l'URL : un test ne doit pas hériter de celle du précédent.
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
