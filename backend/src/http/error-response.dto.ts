import { ApiProperty } from '@nestjs/swagger';

import { ERROR_CODES, type ErrorCode } from '../errors/index.js';

export class ErrorDetailDto {
  @ApiProperty({ description: 'Ce qui est en cause : id de colonne, nom de paramètre...' })
  readonly field!: string;

  @ApiProperty()
  readonly message!: string;
}

export class ErrorBodyDto {
  @ApiProperty({
    enum: ERROR_CODES,
    description: 'Code stable, sur lequel le client peut se fonder',
  })
  readonly code!: ErrorCode;

  @ApiProperty()
  readonly message!: string;

  @ApiProperty({ type: [ErrorDetailDto] })
  readonly details!: ReadonlyArray<ErrorDetailDto>;

  @ApiProperty({
    description: 'Identifiant de la requête, repris dans les logs et le header X-Request-Id',
  })
  readonly requestId!: string;
}

// Documente l'enveloppe d'erreur uniforme produite par `AllExceptionsFilter`.
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  readonly error!: ErrorBodyDto;
}
