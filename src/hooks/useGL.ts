import { useQuery } from '@tanstack/react-query';
import { GLService, type ConsolidatedMatrixResponse } from '../services/glService';

export const useConsolidatedMatrix = (period: string = "annual", year: number = 2026) => {
  return useQuery<ConsolidatedMatrixResponse, Error>({
    queryKey: ['consolidated-matrix', period, year],
    queryFn: () => GLService.getConsolidatedTrialBalanceMatrix(period, year),
  });
};
