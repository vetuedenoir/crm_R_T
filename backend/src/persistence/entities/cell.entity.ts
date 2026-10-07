import { Column, Entity, PrimaryColumn } from 'typeorm';

// Une seule des trois colonnes de valeur est renseignée (CHECK en base). `numeric` revient en chaîne
// (pas d'arrondi flottant) et `date` en `YYYY-MM-DD` : le domaine les valide avant de les typer.
@Entity('cells')
export class CellEntity {
  @PrimaryColumn({ name: 'contact_id', type: 'uuid' })
  contactId!: string;

  @PrimaryColumn({ name: 'column_id', type: 'uuid' })
  columnId!: string;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText!: string | null;

  @Column({ name: 'value_number', type: 'numeric', nullable: true })
  valueNumber!: string | null;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate!: string | null;
}
