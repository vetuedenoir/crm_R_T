import { z } from 'zod';

// Ces schémas sont la frontière réseau (RULES §5) : une réponse n'est typée qu'après les avoir franchis.
// Les formats suivent les DTO du backend (`columns.dto.ts`, `contacts.dto.ts`), qui reste la source de vérité.

export const COLUMN_TYPE_NAMES = ['text', 'number', 'date', 'phone'] as const;

export const columnTypeNameSchema = z.enum(COLUMN_TYPE_NAMES);
export type ColumnTypeName = z.infer<typeof columnTypeNameSchema>;

// `guid` plutôt que `uuid` : le backend accepte tout UUID bien formé, pas seulement ceux de la RFC 9562.
export const columnIdSchema = z.guid().brand<'ColumnId'>();
export type ColumnId = z.infer<typeof columnIdSchema>;

export const contactIdSchema = z.guid().brand<'ContactId'>();
export type ContactId = z.infer<typeof contactIdSchema>;

export const columnSchema = z
  .object({
    id: columnIdSchema,
    name: z.string(),
    type: columnTypeNameSchema,
    position: z.number().int().nonnegative(),
  })
  .readonly();
export type Column = z.infer<typeof columnSchema>;

export const columnsSchema = z.array(columnSchema).readonly();

// Une cellule vide n'a pas d'entrée : `cells` ne contient que les valeurs renseignées.
export const cellValueSchema = z.union([z.string(), z.number()]);
export type CellValue = z.infer<typeof cellValueSchema>;

export const contactSchema = z
  .object({
    id: contactIdSchema,
    cells: z.record(z.string(), cellValueSchema).readonly(),
  })
  .readonly();
export type Contact = z.infer<typeof contactSchema>;

export const contactsPageSchema = z
  .object({
    items: z.array(contactSchema).readonly(),
    total: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
  })
  .readonly();
export type ContactsPage = z.infer<typeof contactsPageSchema>;

export const errorDetailSchema = z.object({ field: z.string(), message: z.string() }).readonly();
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

// `code` reste une chaîne : un code ajouté côté API ne doit pas empêcher de lire le reste de l'erreur.
export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(errorDetailSchema).readonly(),
    requestId: z.string(),
  }),
});
