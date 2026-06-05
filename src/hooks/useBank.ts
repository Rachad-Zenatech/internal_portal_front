import { useQuery } from '@tanstack/react-query';
import { getBanks, getBank } from '../services/index';
import type { Bank, Banks } from '../types/bank';

export const useBanks = () => {
  return useQuery<Banks, Error>({
    queryKey: ['banks'], // Unique key used to cache this specific request
    queryFn: getBanks,  // The actual function that returns a Promise
  });
};

export const useBank = (id: number) => {
    return useQuery<Bank, Error>({
      queryKey: ['banks', id], // Unique key used to cache this specific request
      queryFn: () => getBank(id),  // The actual function that returns a Promise
    });
}