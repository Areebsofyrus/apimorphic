import { ParserService } from './parser.service';
import { EndpointSpec } from '../../entities/api-spec.entity';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(() => {
    service = new ParserService();
  });

  it('should parse a valid OpenAPI 3.0 JSON spec', async () => {
    const sampleOpenApi = {
      openapi: '3.0.0',
      info: { title: 'Test Petstore', version: '1.0.0' },
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            responses: {
              '200': {
                description: 'A paged array of pets',
              },
            },
          },
        },
      },
    };

    const result = await service.parseSwagger(sampleOpenApi);
    expect(result.title).toEqual('Test Petstore');
    expect(result.endpoints.length).toEqual(1);
    expect(result.endpoints[0].path).toEqual('/pets');
    expect(result.endpoints[0].method).toEqual('GET');
  });

  it('should parse a valid Postman Collection JSON', async () => {
    const samplePostman = {
      info: {
        name: 'Sample Postman Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Get Users',
          request: {
            method: 'GET',
            url: {
              raw: 'http://example.com/users',
              host: ['http://example.com'],
              path: ['users'],
            },
          },
        },
      ],
    };

    const result = await service.parsePostmanCollection(samplePostman);
    expect(result.title).toEqual('Sample Postman Collection');
    expect(result.endpoints.length).toEqual(1);
    expect(result.endpoints[0].path).toEqual('/users');
    expect(result.endpoints[0].method).toEqual('GET');
  });

  it('should parse Postman Collection JSON with missing or incomplete URLs', async () => {
    const samplePostman = {
      info: {
        name: 'Postman Collection with Missing/Empty URLs',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Request with Missing URL',
          request: {
            method: 'POST',
          },
        },
        {
          name: 'Request with String URL (no path)',
          request: {
            method: 'GET',
            url: 'http://example.com',
          },
        },
        {
          name: 'Request with Object URL (no path)',
          request: {
            method: 'PUT',
            url: {
              raw: 'http://example.com',
            },
          },
        },
      ],
    };

    const result = await service.parsePostmanCollection(samplePostman);
    expect(result.title).toEqual('Postman Collection with Missing/Empty URLs');
    expect(result.endpoints.length).toEqual(3);
    
    expect(result.endpoints[0].path).toEqual('/');
    expect(result.endpoints[0].method).toEqual('POST');
    
    expect(result.endpoints[1].path).toEqual('/');
    expect(result.endpoints[1].method).toEqual('GET');
    
    expect(result.endpoints[2].path).toEqual('/');
    expect(result.endpoints[2].method).toEqual('PUT');
  });

  it('should detect added, modified, and removed endpoints', () => {
    const oldEndpoints: EndpointSpec[] = [
      { id: 'GET_/users', path: '/users', method: 'GET', summary: 'Get Users' },
      { id: 'DELETE_/users', path: '/users', method: 'DELETE', summary: 'Delete User' },
    ];

    const newEndpoints: EndpointSpec[] = [
      { id: 'GET_/users', path: '/users', method: 'GET', summary: 'Get Users', requestSchema: { type: 'object' } }, // modified
      { id: 'POST_/users', path: '/users', method: 'POST', summary: 'Create User' }, // added
    ];

    const diff = service.detectEndpointChanges(oldEndpoints, newEndpoints);
    expect(diff.added.length).toEqual(1);
    expect(diff.added[0].method).toEqual('POST');

    expect(diff.modified.length).toEqual(1);
    expect(diff.modified[0].method).toEqual('GET');

    expect(diff.removed.length).toEqual(1);
    expect(diff.removed[0].method).toEqual('DELETE');
  });
});
