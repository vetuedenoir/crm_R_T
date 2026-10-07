import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import type { SortDirection } from '../api';

import styles from './sort-menu.module.css';

interface SortMenuProps {
  readonly columnName: string;
  // Tri courant de cette colonne, `null` si elle n'est pas triée.
  readonly direction: SortDirection | null;
  readonly onChange: (direction: SortDirection | null) => void;
}

const CHOICES: ReadonlyArray<{ readonly direction: SortDirection | null; readonly label: string }> =
  [
    { direction: 'asc', label: 'Tri croissant' },
    { direction: 'desc', label: 'Tri décroissant' },
    { direction: null, label: 'Aucun tri' },
  ];

interface SortChoicesProps {
  readonly columnName: string;
  readonly direction: SortDirection | null;
  readonly onChoose: (direction: SortDirection | null) => void;
}

function SortChoices({ columnName, direction, onChoose }: SortChoicesProps): ReactNode {
  return (
    <div role="group" className={styles['menu']} aria-label={`Tri de ${columnName}`}>
      {CHOICES.map((choice) => (
        <button
          key={choice.label}
          type="button"
          className={styles['item']}
          aria-pressed={choice.direction === direction}
          onClick={() => {
            onChoose(choice.direction);
          }}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

interface SortTriggerProps {
  readonly ref: RefObject<HTMLButtonElement | null>;
  readonly columnName: string;
  readonly direction: SortDirection | null;
  readonly open: boolean;
  readonly onToggle: () => void;
}

// Le sens du tri est porté par `data-direction` : le CSS en tire l'indicateur, sans texte dans l'en-tête.
function SortTrigger({ ref, columnName, direction, open, onToggle }: SortTriggerProps): ReactNode {
  return (
    <button
      ref={ref}
      type="button"
      className={styles['trigger']}
      aria-label={`Trier ${columnName}`}
      aria-expanded={open}
      data-direction={direction ?? 'none'}
      onClick={onToggle}
    />
  );
}

// Ferme le menu au clic ailleurs : un menu resté ouvert masquerait les lignes sous l'en-tête.
function useCloseOnOutsidePress(
  open: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  close: () => void,
): void {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handlePress(event: PointerEvent): void {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) !== true) {
        close();
      }
    }
    document.addEventListener('pointerdown', handlePress);
    return () => {
      document.removeEventListener('pointerdown', handlePress);
    };
  }, [open, rootRef, close]);
}

// Menu d'en-tête de colonne (R7). Un « disclosure » (bouton + boutons à bascule) et non un `role="menu"` :
// ce rôle promet une navigation aux flèches que l'on n'implémente pas.
export function SortMenu({ columnName, direction, onChange }: SortMenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = (): void => {
    setOpen(false);
  };
  useCloseOnOutsidePress(open, rootRef, close);

  // Le clavier du menu ne remonte pas à la grille : en édition, elle prendrait Entrée pour une validation
  // de cellule et empêcherait le clic du bouton.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    event.stopPropagation();
    if (event.key === 'Escape' && open) {
      close();
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className={styles['root']} onKeyDown={handleKeyDown}>
      <SortTrigger
        ref={triggerRef}
        columnName={columnName}
        direction={direction}
        open={open}
        onToggle={() => {
          setOpen((current) => !current);
        }}
      />
      {open && (
        <SortChoices
          columnName={columnName}
          direction={direction}
          onChoose={(choice) => {
            onChange(choice);
            close();
          }}
        />
      )}
    </div>
  );
}
