import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './contacts-params.pure.js';

// Borne qui garde `offset` dans les entiers de PostgreSQL et le JSON de la requête de taille raisonnable.
const MAX_OFFSET = 2_147_483_647;
const MAX_PARAM_LENGTH = 10_000;

// Ces DTO ne valident que la *forme* (RULES §7) : le contenu du tri, des filtres et des cellules est
// validé par le domaine pur, qui connaît les colonnes.
export class ListContactsQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset doit être un entier' })
  @Min(0, { message: 'offset doit être positif ou nul' })
  @Max(MAX_OFFSET, { message: `offset ne peut pas dépasser ${String(MAX_OFFSET)}` })
  readonly offset?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit doit être un entier' })
  @Min(1, { message: 'limit doit être supérieur ou égal à 1' })
  @Max(MAX_PAGE_SIZE, { message: `limit ne peut pas dépasser ${String(MAX_PAGE_SIZE)}` })
  readonly limit?: number;

  @ApiPropertyOptional({
    description: 'Tri sur toute la base : `<id de colonne>:asc` ou `<id de colonne>:desc`',
    example: '00000000-0000-4000-8000-000000000001:desc',
  })
  @IsOptional()
  @IsString({ message: 'sort doit être une chaîne de caractères' })
  @MaxLength(MAX_PARAM_LENGTH)
  readonly sort?: string;

  @ApiPropertyOptional({
    description:
      'Tableau JSON de filtres, combinés par ET : `[{"columnId": "...", "operator": "contains", "values": ["ada"]}]`',
  })
  @IsOptional()
  @IsString({ message: 'filters doit être une chaîne de caractères' })
  @MaxLength(MAX_PARAM_LENGTH)
  readonly filters?: string;
}

const VALUES_DESCRIPTION =
  'Valeurs par id de colonne. Chaque valeur est validée selon le type de sa colonne.';

export class CreateContactDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: VALUES_DESCRIPTION,
  })
  @IsOptional()
  @IsObject({ message: 'values doit être un objet' })
  readonly values?: Readonly<Record<string, unknown>>;
}

export class UpdateContactDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: `${VALUES_DESCRIPTION} \`null\` vide la cellule ; les colonnes absentes sont inchangées.`,
  })
  @IsObject({ message: 'values doit être un objet' })
  readonly values!: Readonly<Record<string, unknown>>;
}

export class ContactDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }] },
    description: 'Valeur de chaque cellule renseignée, par id de colonne',
  })
  readonly cells!: Readonly<Record<string, string | number>>;
}

export class ContactsPageDto {
  @ApiProperty({ type: [ContactDto] })
  readonly items!: ReadonlyArray<ContactDto>;

  @ApiProperty({ description: 'Nombre de contacts correspondant aux filtres, sur tout le jeu' })
  readonly total!: number;

  @ApiProperty()
  readonly offset!: number;

  @ApiProperty()
  readonly limit!: number;
}
