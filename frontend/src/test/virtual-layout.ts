import { vi } from 'vitest';

interface VirtualLayout {
  readonly viewportHeight: number;
  readonly rowHeight: number;
}

// jsdom ne fait pas de mise en page : toutes les hauteurs valent 0 et le virtualiseur ne rendrait aucune ligne.
// On lui donne donc des dimensions : les lignes (`data-index`) mesurent `rowHeight`, le reste `viewportHeight`.
// À restaurer avec `vi.restoreAllMocks()` (voir `setup.ts`).
export function mockVirtualLayout({ viewportHeight, rowHeight }: VirtualLayout): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset['index'] === undefined ? viewportHeight : rowHeight;
  });
}
