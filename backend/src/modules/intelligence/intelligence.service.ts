import { Injectable } from '@nestjs/common';

export interface SuggestedMapping {
  paramName: string;
  suggestedDataset: string;
  suggestedField: string;
  confidence: number;
}

@Injectable()
export class IntelligenceService {
  suggestMappings(
    requiredParams: string[],
    availableDatasets: Array<{ datasetName: string; fields: string[] }>,
  ): SuggestedMapping[] {
    const suggestions: SuggestedMapping[] = [];

    requiredParams.forEach((param) => {
      let bestMatch: SuggestedMapping | null = null;
      let highestConfidence = 0;

      availableDatasets.forEach((dataset) => {
        dataset.fields.forEach((field) => {
          // Exact match
          if (param.toLowerCase() === field.toLowerCase()) {
            bestMatch = {
              paramName: param,
              suggestedDataset: dataset.datasetName,
              suggestedField: field,
              confidence: 1.0,
            };
            highestConfidence = 1.0;
          } else if (
            highestConfidence < 0.8 &&
            (param.toLowerCase().includes(field.toLowerCase()) || field.toLowerCase().includes(param.toLowerCase()))
          ) {
            bestMatch = {
              paramName: param,
              suggestedDataset: dataset.datasetName,
              suggestedField: field,
              confidence: 0.8,
            };
            highestConfidence = 0.8;
          }
        });
      });

      if (bestMatch) {
        suggestions.push(bestMatch);
      }
    });

    return suggestions;
  }
}
