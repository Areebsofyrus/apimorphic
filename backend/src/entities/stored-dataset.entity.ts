import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('stored_datasets')
@Unique(['user', 'datasetName'])
export class StoredDatasetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, (user) => user.datasets, { onDelete: 'CASCADE', nullable: true })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 100 })
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
