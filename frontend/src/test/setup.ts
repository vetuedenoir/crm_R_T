import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { server } from '../mocks/server';

// jsdom n'implémente pas `scrollIntoView` : la grille s'en sert pour garder la cellule active visible.
Element.prototype.scrollIntoView = () => undefined;

// `error` : une requête sans handler fait échouer le test au lieu de partir vers un vrai réseau.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
