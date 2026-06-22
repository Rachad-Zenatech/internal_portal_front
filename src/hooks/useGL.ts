import { useQuery } from '@tanstack/react-query';
import { GLService } from '../services/glService';
import type {
  CompanyGLCard,
  ConsolidatedMatrixResponse,
  TrialBalance,
} from '@/types/gl';

export const useConsolidatedMatrix = (period: string = "annual", year: number = 2026) => {
  return useQuery<ConsolidatedMatrixResponse, Error>({
    queryKey: ['consolidated-matrix', period, year],
    queryFn: () => GLService.getConsolidatedTrialBalanceMatrix(period, year),
  });
};

export const useCompanyCards = (period: string, year: number) => {
  return useQuery<CompanyGLCard[], Error>({
    queryKey: ['company-cards', period, year],
    queryFn: () => GLService.getCompanyCards({ period, year }),
  });
};

export const useTrialBalance = (companyId: number | null, period: string, year: number) => {
  return useQuery<TrialBalance, Error>({
    queryKey: ['trial-balance', companyId, period, year],
    queryFn: () => {
      if (companyId === null) throw new Error("Company ID is required");
      return GLService.getTrialBalance({ companyId, period, year });
    },
    enabled: companyId !== null,
  });
};
