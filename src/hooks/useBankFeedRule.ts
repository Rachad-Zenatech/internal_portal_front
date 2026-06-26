import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BankFeedRule, BankFeedRuleCreate, BankFeedRuleUpdate } from '../types/bankFeedRule';
import { apiClient } from '../services/apiClient';

const ENDPOINT = '/configurations/bank-feed-rules';

export function useBankFeedRules() {
  return useQuery<BankFeedRule[]>({
    queryKey: ['bank-feed-rules'],
    queryFn: async () => apiClient.get<BankFeedRule[]>(ENDPOINT),
  });
}

export function useCreateBankFeedRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: BankFeedRuleCreate) => apiClient.post<BankFeedRule>(ENDPOINT, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-feed-rules'] });
    },
  });
}

export function useUpdateBankFeedRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, rule }: { id: number; rule: BankFeedRuleUpdate }) => 
      apiClient.put<BankFeedRule>(`${ENDPOINT}/${id}`, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-feed-rules'] });
    },
  });
}

export function useDeleteBankFeedRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete<{message: string}>(`${ENDPOINT}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-feed-rules'] });
    },
  });
}

export function useReplaceBankFeedRules() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rules: BankFeedRuleCreate[]) => apiClient.post<BankFeedRule[]>(`${ENDPOINT}/replace`, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-feed-rules'] });
    },
  });
}
