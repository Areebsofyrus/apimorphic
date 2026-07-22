import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface VariableItem {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  secret?: boolean;
}

@Entity('test_contexts')
export class TestContextEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'jsonb', default: [] })
  globalVariables!: VariableItem[];

  @Column({ type: 'jsonb', default: [] })
  environmentVariables!: VariableItem[];

  @Column({ type: 'jsonb', default: [] })
  runtimeVariables!: VariableItem[];

  @Column({ type: 'jsonb', default: {} })
  headers!: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  authConfig?: {
    type: 'bearer' | 'basic' | 'apiKey';
    token?: string;
    username?: string;
    password?: string;
    apiKeyHeader?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
