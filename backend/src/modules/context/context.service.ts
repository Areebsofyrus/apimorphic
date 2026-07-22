import { Injectable } from '@nestjs/common';
import { VariableItem } from '../../entities/test-context.entity';

export interface MergedContext {
  variables: Record<string, string | number | boolean | unknown>;
  headers: Record<string, string>;
  authHeader?: { key: string; value: string };
}

@Injectable()
export class ContextService {
  resolvePriorityVariables(params: {
    swaggerDefaults?: Record<string, unknown>;
    globalVariables?: VariableItem[];
    environmentVariables?: VariableItem[];
    datasetValues?: Record<string, unknown>;
    runtimeVariables?: VariableItem[];
  }): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    // 1. Swagger Default (Lowest Priority)
    if (params.swaggerDefaults) {
      Object.assign(resolved, params.swaggerDefaults);
    }

    // 2. Global Variables
    if (params.globalVariables) {
      params.globalVariables.forEach((v) => {
        resolved[v.key] = v.value;
      });
    }

    // 3. Environment Variables
    if (params.environmentVariables) {
      params.environmentVariables.forEach((v) => {
        resolved[v.key] = v.value;
      });
    }

    // 4. Dataset Values
    if (params.datasetValues) {
      Object.assign(resolved, params.datasetValues);
    }

    // 5. Runtime Variables (Highest Priority)
    if (params.runtimeVariables) {
      params.runtimeVariables.forEach((v) => {
        resolved[v.key] = v.value;
      });
    }

    return resolved;
  }
}
