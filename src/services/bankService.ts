import type { Bank, Banks } from '../types/bank';
import.meta.env.VITE_API_BASE_URL;

export const getBank = async (id: number) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/banks/${id}`).then((res) => res.json() as Promise<Bank>);
}

export const getBanks = async () => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/banks`).then((res) => res.json() as Promise<Banks>);
}