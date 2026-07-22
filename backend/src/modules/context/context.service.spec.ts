import { ContextService } from './context.service';

describe('ContextService', () => {
  let service: ContextService;

  beforeEach(() => {
    service = new ContextService();
  });

  it('should override lower priority variables with higher priority variables', () => {
    const result = service.resolvePriorityVariables({
      swaggerDefaults: { tenantId: 'swagger-default', role: 'guest' },
      globalVariables: [{ key: 'tenantId', value: 'global-tenant', type: 'string' }],
      environmentVariables: [{ key: 'tenantId', value: 'env-tenant', type: 'string' }],
      datasetValues: { tenantId: 'dataset-tenant' },
      runtimeVariables: [{ key: 'tenantId', value: 'runtime-tenant', type: 'string' }],
    });

    expect(result.tenantId).toEqual('runtime-tenant');
    expect(result.role).toEqual('guest');
  });
});
