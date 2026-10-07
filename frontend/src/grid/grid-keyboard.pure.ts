import type { Direction } from './grid-navigation.pure';

// Les champs de `KeyboardEvent` dont dépend la décision : la fonction reste testable sans DOM.
export interface KeyPress {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

export type KeyMode = 'navigating' | 'editing';

export type KeyIntent =
  | { readonly kind: 'move'; readonly direction: Direction }
  // Tab valide l'édition en cours avant de changer de cellule.
  | { readonly kind: 'tab'; readonly direction: 'left' | 'right' }
  | { readonly kind: 'start-edit' }
  | { readonly kind: 'clear' };

const ARROW_DIRECTIONS: ReadonlyMap<string, Direction> = new Map([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
]);

function navigatingIntent(key: string): KeyIntent | null {
  const direction = ARROW_DIRECTIONS.get(key);
  if (direction !== undefined) {
    return { kind: 'move', direction };
  }
  switch (key) {
    case 'Enter':
      return { kind: 'start-edit' };
    case 'Delete':
    case 'Backspace':
      return { kind: 'clear' };
    default:
      return null;
  }
}

// Entrée et Échap pendant l'édition appartiennent à l'éditeur (`CellEditorProps`) ; les flèches y déplacent
// le curseur de saisie. Seule Tab concerne donc la grille. Les raccourcis avec Ctrl, Alt ou Méta sont ceux
// du navigateur : on n'y touche pas.
export function intentForKey(press: KeyPress, mode: KeyMode): KeyIntent | null {
  if (press.ctrlKey || press.metaKey || press.altKey) {
    return null;
  }
  if (press.key === 'Tab') {
    return { kind: 'tab', direction: press.shiftKey ? 'left' : 'right' };
  }
  return mode === 'editing' ? null : navigatingIntent(press.key);
}
