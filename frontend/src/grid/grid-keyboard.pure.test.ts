import { describe, expect, it } from 'vitest';

import { intentForKey, type KeyIntent, type KeyMode, type KeyPress } from './grid-keyboard.pure';

function press(key: string, modifiers: Partial<KeyPress> = {}): KeyPress {
  return { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...modifiers };
}

describe('intentForKey', () => {
  it.each<readonly [string, KeyPress, KeyMode, KeyIntent | null]>([
    ['flèche haut', press('ArrowUp'), 'navigating', { kind: 'move', direction: 'up' }],
    ['flèche bas', press('ArrowDown'), 'navigating', { kind: 'move', direction: 'down' }],
    ['flèche gauche', press('ArrowLeft'), 'navigating', { kind: 'move', direction: 'left' }],
    ['flèche droite', press('ArrowRight'), 'navigating', { kind: 'move', direction: 'right' }],
    ['Entrée démarre l’édition', press('Enter'), 'navigating', { kind: 'start-edit' }],
    ['Suppr vide la cellule', press('Delete'), 'navigating', { kind: 'clear' }],
    ['Retour arrière vide la cellule', press('Backspace'), 'navigating', { kind: 'clear' }],
    ['Tab va à droite', press('Tab'), 'navigating', { kind: 'tab', direction: 'right' }],
    [
      'Maj+Tab va à gauche',
      press('Tab', { shiftKey: true }),
      'navigating',
      { kind: 'tab', direction: 'left' },
    ],
    ['une lettre est ignorée', press('a'), 'navigating', null],
    ['Échap hors édition est ignoré', press('Escape'), 'navigating', null],
    [
      'Tab pendant l’édition valide puis avance',
      press('Tab'),
      'editing',
      { kind: 'tab', direction: 'right' },
    ],
    ['les flèches appartiennent au champ en édition', press('ArrowLeft'), 'editing', null],
    ['Entrée appartient à l’éditeur', press('Enter'), 'editing', null],
    ['Suppr appartient au champ en édition', press('Delete'), 'editing', null],
    [
      'Ctrl+flèche est laissé au navigateur',
      press('ArrowDown', { ctrlKey: true }),
      'navigating',
      null,
    ],
    ['Méta+Tab est laissé au système', press('Tab', { metaKey: true }), 'navigating', null],
    [
      'Alt+flèche est laissé au navigateur',
      press('ArrowLeft', { altKey: true }),
      'navigating',
      null,
    ],
  ])('[R6] %s', (_label, keyPress, mode, expected) => {
    expect(intentForKey(keyPress, mode)).toEqual(expected);
  });
});
