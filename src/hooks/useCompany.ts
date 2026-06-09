import { useQuery } from '@tanstack/react-query';
import { CompanyService } from '../services/index';
import type { Company, Companies } from '../types/company';

export const useCompanies = () => {
  return useQuery<Companies, Error>({
    queryKey: ['companies'], 
    queryFn: CompanyService.getCompanies, 
  });
};

export const useCompany = (id: number) => {
  return useQuery<Company, Error>({
    queryKey: ['companies', id],
    queryFn: () => CompanyService.getCompany(id),
    enabled: !!id, // Only run the query if an ID is provided
  });
};