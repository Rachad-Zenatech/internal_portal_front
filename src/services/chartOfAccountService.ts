import type { ChartOfAccount, ChartOfAccounts } from '../types/chartOfAccount';
import.meta.env.VITE_API_BASE_URL;

export const getChartOfAccount = async (id: number) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts/${id}`).then((res) => res.json() as Promise<ChartOfAccount>);
}

export const getChartOfAccounts = async () => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts`).then((res) => res.json() as Promise<ChartOfAccounts>);
}

export const insertChartOfAccount = async (chartOfAccount: ChartOfAccount) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(chartOfAccount)
    }).then((res) => res.json() as Promise<ChartOfAccount>);
}