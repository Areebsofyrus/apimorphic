import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Unique } from 'typeorm';
import { ApiSpecEntity } from './api-spec.entity';

@Entity('saved_test_cases')
@Unique(['workspace', 'endpointId', 'scenarioName'])
export class SavedTestCaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ApiSpecEntity, { onDelete: 'CASCADE', nullable: true })
  workspace?: ApiSpecEntity;

  @Column({ type: 'varchar', length: 255 })
  endpointId!: string;

  @Column({ type: 'varchar', length: 100 })
  scenarioName!: string;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  generationRule!: string;

  @Column({ type: 'varchar', length: 255, default: '200 OK' })
  expectedResult!: string;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  priority?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  assertions?: string[];

  @Column({ type: 'jsonb', nullable: true })
  pathParams?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  queryParams?: Record<string, string>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
