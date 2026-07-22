import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('saved_test_cases')
export class SavedTestCaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
