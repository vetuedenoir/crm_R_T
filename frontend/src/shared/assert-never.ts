// Garde d'exhaustivité : un `switch` qui oublie un cas ne compile plus (RULES §3).
export function assertNever(value: never): never {
  throw new Error(`Cas non géré : ${JSON.stringify(value)}`);
}
