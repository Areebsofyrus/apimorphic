import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
