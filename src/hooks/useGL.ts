import { useQuery } from '@tanstack/react-query';
import { GLService, type ConsolidatedMatrixResponse } from '../services/glService';

export const useConsolidatedMatrix = () => {
  return useQuery<ConsolidatedMatrixResponse, Error>({
    queryKey: ['consolidated-matrix'],
    queryFn: GLService.getConsolidatedTrialBalanceMatrix,
  });
};
