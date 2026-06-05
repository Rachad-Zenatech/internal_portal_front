import { useQuery } from '@tanstack/react-query';
import { getChartOfAccount, getChartOfAccounts } from '../services/index';
import type { ChartOfAccount, ChartOfAccounts } from '../types/chartOfAccount';

export const useChartOfAccounts = () => {
  return useQuery<ChartOfAccounts, Error>({
    queryKey: ['chart-of-accounts'],
    queryFn: getChartOfAccounts,
  });
};

export const useChartOfAccount = (id: number) => {
  return useQuery<ChartOfAccount, Error>({
    queryKey: ['chart-of-accounts', id],
    queryFn: () => getChartOfAccount(id),
  });
};