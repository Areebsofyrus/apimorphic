import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('stored_datasets')
export class StoredDatasetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  datasetName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceEndpoint?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  detectedFields!: string[];

  @Column({ type: 'jsonb', default: [] })
  records!: Array<Record<string, unknown>>;

  @Column({ type: 'int', default: 0 })
  totalRecords!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
