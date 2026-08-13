import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiSpecEntity } from './api-spec.entity';
import { StoredDatasetEntity } from './stored-dataset.entity';
import { SmartMappingEntity } from './smart-mapping.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  geminiApiKey?: string | null;

  @Column({ type: 'varchar', length: 255, default: 'user' })
  role!: string;

  @OneToMany(() => ApiSpecEntity, (workspace) => workspace.user, { cascade: true })
  workspaces!: ApiSpecEntity[];

  @OneToMany(() => StoredDatasetEntity, (dataset) => dataset.user, { cascade: true })
  datasets!: StoredDatasetEntity[];

  @OneToMany(() => SmartMappingEntity, (mapping) => mapping.user, { cascade: true })
  mappings!: SmartMappingEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
