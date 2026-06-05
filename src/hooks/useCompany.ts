import { useQuery } from '@tanstack/react-query';
import { getCompany, getCompanies } from '../services/index';
import type { Company, Companies } from '../types/company';

export const useCompanies = () => {
  return useQuery<Companies, Error>({
    queryKey: ['companies'], 
    queryFn: getCompanies, 
  });
};

export const useCompany = (id: number) => {
  return useQuery<Company, Error>({
    queryKey: ['companies', id],
    queryFn: () => getCompany(id),
  });
};