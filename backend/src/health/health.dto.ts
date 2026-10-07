import { ApiProperty } from '@nestjs/swagger';

export class HealthReport {
  @ApiProperty({ enum: ['ok'] })
  readonly status!: 'ok';

  @ApiProperty({ enum: ['up'], description: 'État de la connexion à PostgreSQL' })
  readonly database!: 'up';
}
