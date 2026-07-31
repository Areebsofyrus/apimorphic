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
          const fieldLower = field.toLowerCase();
          const paramLower = param.toLowerCase();

          if (fieldLower === paramLower) {
            bestMatch = {
              paramName: param,
              suggestedDataset: dataset.datasetName,
              suggestedField: field,
              confidence: 1.0,
            };
            highestConfidence = 1.0;
          } else if (field.includes('.')) {
            const parts = fieldLower.split('.');
            const lastPart = parts[parts.length - 1];
            const parentPart = parts[parts.length - 2];
            const parentSingular = parentPart.endsWith('s') ? parentPart.slice(0, -1) : parentPart;

            if (
              paramLower === `${parentSingular}${lastPart}` ||
              paramLower === `${parentSingular}_${lastPart}` ||
              paramLower === `${parentPart}${lastPart}` ||
              paramLower === `${parentPart}_${lastPart}`
            ) {
              bestMatch = {
                paramName: param,
                suggestedDataset: dataset.datasetName,
                suggestedField: field,
                confidence: 0.95,
              };
              highestConfidence = 0.95;
            }
          } else if (
            highestConfidence < 0.8 &&
            (paramLower.includes(fieldLower) || fieldLower.includes(paramLower))
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
