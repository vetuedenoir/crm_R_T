const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR');

// En français, zéro et un sont au singulier.
export function formatContactCount(total: number): string {
  return `${NUMBER_FORMAT.format(total)} ${total < 2 ? 'contact' : 'contacts'}`;
}
