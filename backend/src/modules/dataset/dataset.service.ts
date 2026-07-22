import { Injectable } from '@nestjs/common';

export type SelectionMode =
  | 'first'
  | 'last'
  | 'random'
  | 'every'
  | 'firstN'
  | 'randomN'
  | 'filtered';

@Injectable()
export class DatasetService {
  detectCollection(responseBody: unknown): { isCollection: boolean; records: Record<string, unknown>[] } {
    let records: Record<string, unknown>[] = [];

    if (Array.isArray(responseBody)) {
      records = responseBody.filter((item) => typeof item === 'object' && item !== null);
    } else if (typeof responseBody === 'object' && responseBody !== null) {
      // Check if response contains array property (e.g. { data: [...], items: [...] })
      const bodyObj = responseBody as Record<string, unknown>;
      const arrayKey = Object.keys(bodyObj).find((key) => Array.isArray(bodyObj[key]));
      if (arrayKey && Array.isArray(bodyObj[arrayKey])) {
        records = (bodyObj[arrayKey] as unknown[]).filter((item) => typeof item === 'object' && item !== null) as Record<string, unknown>[];
      }
    }

    return {
      isCollection: records.length > 0,
      records,
    };
  }

  extractRecordByMode(
    records: Record<string, unknown>[],
    mode: SelectionMode,
    options?: { count?: number; filterKey?: string; filterValue?: unknown },
  ): Record<string, unknown>[] {
    if (!records || records.length === 0) return [];

    switch (mode) {
      case 'first':
        return [records[0]];
      case 'last':
        return [records[records.length - 1]];
      case 'random':
        const randomIndex = Math.floor(Math.random() * records.length);
        return [records[randomIndex]];
      case 'every':
        return records;
      case 'firstN':
        return records.slice(0, options?.count || 1);
      case 'randomN':
        const n = options?.count || 1;
        const shuffled = [...records].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
      case 'filtered':
        if (!options?.filterKey) return records;
        return records.filter((r) => r[options.filterKey!] === options.filterValue);
      default:
        return [records[0]];
    }
  }
}
