import { useLayoutEffect, useRef, type RefObject } from 'react';

// Donne accès à la dernière valeur rendue (mise à jour avant tout événement suivant, d'où le layout effect) sans que le lecteur change d'identité à chaque rendu. Sert aux
// gestionnaires d'événements : ils lisent l'état courant, et les lignes mémoïsées qui les reçoivent ne se
// refont pas à chaque frappe.
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
