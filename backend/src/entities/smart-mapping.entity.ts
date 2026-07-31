import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('smart_mappings')
@Unique(['user', 'sourceField', 'datasetName', 'targetField'])
export class SmartMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, (user) => user.mappings, { onDelete: 'CASCADE', nullable: true })
  user?: UserEntity;

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
