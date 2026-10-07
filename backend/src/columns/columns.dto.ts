import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

import { COLUMN_TYPE_NAMES, MAX_COLUMN_NAME_LENGTH, type ColumnTypeName } from '../domain/index.js';

// Ces DTO ne valident que la *forme* (RULES §7) : les règles du nom (vide, longueur, doublon) sont
// dans le domaine pur, pour rester testables sans décorateurs.
export class CreateColumnDto {
  @ApiProperty({ maxLength: MAX_COLUMN_NAME_LENGTH, example: 'Ville' })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  readonly name!: string;

  @ApiProperty({ enum: COLUMN_TYPE_NAMES, description: 'Immuable après création' })
  @IsIn(COLUMN_TYPE_NAMES, {
    message: `Le type doit être l'un de : ${COLUMN_TYPE_NAMES.join(', ')}`,
  })
  readonly type!: ColumnTypeName;
}

export class UpdateColumnDto {
  @ApiProperty({ maxLength: MAX_COLUMN_NAME_LENGTH })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  readonly name!: string;

  // Accepté par la validation de forme pour que le service le refuse avec un message explicite
  // (422) plutôt que le générique « property type should not exist ».
  @ApiPropertyOptional({ description: 'Toujours refusé : le type est immuable', readOnly: true })
  @IsOptional()
  readonly type?: unknown;
}

export class ReorderColumnsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Tous les ids de colonnes, dans le nouvel ordre',
  })
  @IsArray({ message: 'ids doit être une liste' })
  @IsString({ each: true, message: 'Chaque identifiant doit être une chaîne de caractères' })
  readonly ids!: ReadonlyArray<string>;
}

export class ColumnDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty({ enum: COLUMN_TYPE_NAMES })
  readonly type!: ColumnTypeName;

  @ApiProperty({ description: 'Rang d’affichage, à partir de 0' })
  readonly position!: number;
}
