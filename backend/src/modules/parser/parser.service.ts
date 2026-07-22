import { Injectable, BadRequestException } from '@nestjs/common';
import { Collection } from 'postman-collection';
import { EndpointSpec } from '../../entities/api-spec.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SwaggerParser = require('swagger-parser');

export interface ParsedApiResult {
  title: string;
  version: string;
  sourceType: 'swagger' | 'openapi' | 'postman';
  baseUrl?: string;
  endpoints: EndpointSpec[];
}

export interface EndpointDiffResult {
  added: EndpointSpec[];
  modified: EndpointSpec[];
  removed: EndpointSpec[];
  unchanged: EndpointSpec[];
}

@Injectable()
export class ParserService {
  async parseSwagger(input: string | Record<string, unknown>): Promise<ParsedApiResult> {
    try {
      let specToParse: any = input;
      if (typeof input === 'string') {
        const trimmed = input.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          specToParse = trimmed;
        } else {
          try {
            specToParse = JSON.parse(trimmed);
          } catch {
            specToParse = trimmed;
          }
        }
      }

      const api = await SwaggerParser.validate(specToParse);
      const title = api.info?.title || 'Parsed Swagger API';
      const version = api.info?.version || '1.0.0';

      const baseUrl =
        'servers' in api && api.servers && api.servers.length > 0
          ? api.servers[0].url
          : 'schemes' in api && api.schemes && api.host
          ? `${api.schemes[0]}://${api.host}${api.basePath || ''}`
          : undefined;

      const endpoints: EndpointSpec[] = [];

      if (api.paths) {
        Object.entries(api.paths).forEach(([pathStr, pathItemObj]) => {
          if (!pathItemObj) return;
          const pathItem = pathItemObj as Record<string, any>;
          const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

          methods.forEach((method) => {
            const operation = pathItem[method];
            if (!operation) return;

            const parameters: EndpointSpec['parameters'] = [];
            const rawParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];

            rawParams.forEach((param: any) => {
              parameters.push({
                name: param.name,
                in: param.in,
                required: param.required,
                schema: param.schema || { type: param.type },
              });
            });

            let requestSchema: Record<string, unknown> | undefined;
            if (operation.requestBody?.content) {
              const jsonContent = operation.requestBody.content['application/json'];
              if (jsonContent?.schema) {
                requestSchema = jsonContent.schema;
              }
            }

            let responseSchema: Record<string, unknown> | undefined;
            if (operation.responses) {
              const successRes = operation.responses['200'] || operation.responses['201'] || operation.responses['default'];
              if (successRes?.content?.['application/json']?.schema) {
                responseSchema = successRes.content['application/json'].schema;
              }
            }

            endpoints.push({
              id: `${method.toUpperCase()}_${pathStr}`,
              path: pathStr,
              method: method.toUpperCase(),
              summary: operation.summary,
              description: operation.description,
              parameters,
              requestSchema,
              responseSchema,
            });
          });
        });
      }

      return {
        title,
        version,
        sourceType: 'openapi' in api ? 'openapi' : 'swagger',
        baseUrl,
        endpoints,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse Swagger/OpenAPI spec: ${error.message}`);
    }
  }

  async parsePostmanCollection(jsonContent: Record<string, unknown>): Promise<ParsedApiResult> {
    try {
      const collection = new Collection(jsonContent);
      const title = collection.name || 'Postman Collection';
      const endpoints: EndpointSpec[] = [];

      collection.forEachItem((item: any) => {
        const request = item.request;
        if (!request) return;

        const pathStr = '/' + request.url.path.join('/');
        const method = request.method.toUpperCase();

        let requestSchema: Record<string, unknown> | undefined;
        if (request.body && request.body.raw) {
          try {
            requestSchema = JSON.parse(request.body.raw);
          } catch {
            requestSchema = { raw: request.body.raw };
          }
        }

        endpoints.push({
          id: `${method}_${pathStr}`,
          path: pathStr,
          method,
          summary: item.name,
          description: item.description?.toString(),
          requestSchema,
        });
      });

      return {
        title,
        version: '2.1.0',
        sourceType: 'postman',
        endpoints,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse Postman collection: ${error.message}`);
    }
  }

  detectEndpointChanges(oldEndpoints: EndpointSpec[], newEndpoints: EndpointSpec[]): EndpointDiffResult {
    const oldMap = new Map(oldEndpoints.map((ep) => [`${ep.method}_${ep.path}`, ep]));
    const newMap = new Map(newEndpoints.map((ep) => [`${ep.method}_${ep.path}`, ep]));

    const added: EndpointSpec[] = [];
    const modified: EndpointSpec[] = [];
    const unchanged: EndpointSpec[] = [];
    const removed: EndpointSpec[] = [];

    newEndpoints.forEach((newEp) => {
      const key = `${newEp.method}_${newEp.path}`;
      const oldEp = oldMap.get(key);
      if (!oldEp) {
        added.push(newEp);
      } else {
        const schemaChanged = JSON.stringify(oldEp.requestSchema || {}) !== JSON.stringify(newEp.requestSchema || {});
        if (schemaChanged) {
          modified.push(newEp);
        } else {
          unchanged.push(newEp);
        }
      }
    });

    oldEndpoints.forEach((oldEp) => {
      const key = `${oldEp.method}_${oldEp.path}`;
      if (!newMap.has(key)) {
        removed.push(oldEp);
      }
    });

    return { added, modified, removed, unchanged };
  }
}
