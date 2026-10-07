// Garde d'exhaustivité : le compilateur refuse l'appel tant qu'un cas de l'union n'est pas traité.
export function assertNever(value: never): never {
  throw new Error(`Cas non traité : ${JSON.stringify(value)}`);
}
