import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('execution_logs')
export class ExecutionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  endpointPath!: string;

  @Column({ type: 'varchar', length: 10 })
  httpMethod!: string;

  @Column({ type: 'varchar', length: 100 })
  scenarioName!: string;

  @Column({ type: 'varchar', length: 50 })
  generationRule!: string;

  @Column({ type: 'int' })
  statusCode!: number;

  @Column({ type: 'int' })
  responseTimeMs!: number;

  @Column({ type: 'boolean' })
  passed!: boolean;

  @Column({ type: 'jsonb' })
  requestPayload!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  responseBody?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  aiExplanation?: string;

  @CreateDateColumn()
  executedAt!: Date;
}
