// Assemble des classes CSS Modules (`string | undefined` avec `noUncheckedIndexedAccess`) en ignorant les absentes.
export function classNames(...names: ReadonlyArray<string | false | undefined>): string {
  return names.filter((name) => name !== undefined && name !== false && name !== '').join(' ');
}
