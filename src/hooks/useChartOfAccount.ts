import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChartOfAccountService } from '../services/index';
import type { ChartOfAccount, ChartOfAccounts } from '../types/chartOfAccount';

export const useChartOfAccounts = () => {
  return useQuery<ChartOfAccounts, Error>({
    queryKey: ['chart-of-accounts'],
    queryFn: ChartOfAccountService.getChartOfAccounts,
  });
};

export const useChartOfAccount = (id: number) => {
  return useQuery<ChartOfAccount, Error>({
    queryKey: ['chart-of-accounts', id],
    queryFn: () => ChartOfAccountService.getChartOfAccount(id),
  });
};

export const useInsertChartOfAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // 1. Point it to the function we just built
    mutationFn: (data: ChartOfAccount) => ChartOfAccountService.insertChartOfAccount(data),
    
    // 2. What to do when the backend successfully saves the data
    onSuccess: () => {
      // THE MAGIC TRICK: Tell React Query that the existing table data is stale.
      // This will automatically trigger your getChartOfAccounts function in the background
      // and update your UI without requiring a page refresh!
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });
}

export const useDeleteChartOfAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => ChartOfAccountService.deleteChartOfAccount(id),
    onSuccess: () => {
      // Refresh the list after deleting
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });
};

export const useUpdateChartOfAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChartOfAccount) => ChartOfAccountService.updateChartOfAccount(data),
    onSuccess: () => {
      // Refresh the table data automatically
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });
};

export const useReplaceChartOfAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => ChartOfAccountService.repalceCOAFromExcel(file),
    onSuccess: () => {
      // Instantly refresh the table to show the new Excel data
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });
};