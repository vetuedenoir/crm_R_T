import { Column, Entity, PrimaryColumn } from 'typeorm';

// Un contact n'est qu'une identité : ses valeurs sont des lignes de `cells`.
@Entity('contacts')
export class ContactEntity {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
