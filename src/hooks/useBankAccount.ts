import { useQuery } from '@tanstack/react-query';
import { getBankAccount, getBankAccounts } from '../services/index';
import type { BankAccount, BankAccounts } from '../types/bankAccount';

export const useBankAccounts = () => {
  return useQuery<BankAccounts, Error>({
    queryKey: ['bank-accounts'], // Unique key used to cache this specific request
    queryFn: getBankAccounts,  // The actual function that returns a Promise
  });
};

export const useBankAccount = (id: number) => {
  return useQuery<BankAccount, Error>({
    queryKey: ['bank-accounts', id], // Unique key used to cache this specific request
    queryFn: () => getBankAccount(id),  // The actual function that returns a Promise
  });
}