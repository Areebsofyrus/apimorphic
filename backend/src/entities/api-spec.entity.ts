import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';

export interface EndpointSpec {
  id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  parameters?: Array<{
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie' | 'body';
    required?: boolean;
    schema?: Record<string, unknown>;
  }>;
  security?: Array<Record<string, string[]>>;
}

@Entity('api_specs')
export class ApiSpecEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, (user) => user.workspaces, { onDelete: 'CASCADE', nullable: true })
  user?: UserEntity;

  @Column({ type: 'jsonb', default: [] })
  profiles!: Array<{ name: string; variables: Record<string, string> }>;

  @Column({ type: 'jsonb', default: {} })
  globalVariables!: Record<string, string>;

  @Column({ type: 'varchar', length: 255, default: '' })
  activeProfileName!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 50, default: '3.0.0' })
  version!: string;

  @Column({ type: 'varchar', length: 50 })
  sourceType!: 'swagger' | 'openapi' | 'postman';

  @Column({ type: 'varchar', length: 500, nullable: true })
  baseUrl?: string;

  @Column({ type: 'jsonb' })
  endpoints!: EndpointSpec[];

  @Column({ type: 'jsonb', nullable: true })
  rawSpec?: Record<string, unknown>;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  swaggerUrl?: string;

  @Column({ type: 'text', nullable: true })
  authToken?: string;

  @Column({ type: 'text', nullable: true })
  customHeaders?: string;

  @Column({ type: 'varchar', length: 10, default: 'POST' })
  preMethod!: 'POST' | 'GET';

  @Column({ type: 'text', nullable: true })
  preEndpoint?: string;

  @Column({ type: 'text', nullable: true })
  prePayload?: string;

  @Column({ type: 'text', nullable: true })
  preExtractKey?: string;

  @Column({ type: 'boolean', default: false })
  runPreEverytime!: boolean;

  @Column({ type: 'boolean', default: false })
  showSettings!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
