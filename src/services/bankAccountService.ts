// src/services/bankAccountService.ts
import type { BankAccount, BankAccounts } from '../types/bankAccount';
import.meta.env.VITE_API_BASE_URL;

export const getBankAccount = async (id: number) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/bank-accounts/${id}`).then((res) => res.json() as Promise<BankAccount>);
}

export const getBankAccounts = async () => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/bank-accounts`).then((res) => res.json() as Promise<BankAccounts>);
}