import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('smart_mappings')
export class SmartMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  targetField!: string;

  @Column({ type: 'varchar', length: 100 })
  datasetName!: string;

  @Column({ type: 'varchar', length: 100 })
  sourceField!: string;

  @Column({ type: 'boolean', default: true })
  userApproved!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
