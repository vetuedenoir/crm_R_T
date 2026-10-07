import { Column, Entity, PrimaryColumn } from 'typeorm';

import type { ColumnTypeName } from '../../domain/index.js';

// Reflet brut de la table `columns` : les identifiants sont des `string`, ils ne deviennent nominaux
// (`ColumnId`) qu'au passage par `row-mapping.pure.ts`.
@Entity('columns')
export class ColumnEntity {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'enum', enum: ['text', 'number', 'date', 'phone'], enumName: 'column_type' })
  type!: ColumnTypeName;

  @Column({ type: 'int' })
  position!: number;

  // Réservé aux évolutions (options d'une liste, formule) : évite une migration plus tard.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  config!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
