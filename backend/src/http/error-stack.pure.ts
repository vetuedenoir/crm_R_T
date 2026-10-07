const MAX_CAUSE_DEPTH = 5;

// Une AppError traduit une panne (base injoignable...) : sa cause est ce qui aide à la diagnostiquer,
// elle va donc dans les logs, jamais dans la réponse.
export function stackWithCauses(error: unknown, depth = 0): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const own = error.stack ?? error.message;
  if (error.cause === undefined || depth >= MAX_CAUSE_DEPTH) {
    return own;
  }
  return `${own}\nCaused by: ${stackWithCauses(error.cause, depth + 1)}`;
}
