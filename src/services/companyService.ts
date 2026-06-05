// src/services/companyService.ts

import type { Company, Companies } from '../types/company';
import.meta.env.VITE_API_BASE_URL;

export const getCompany = async (id: number) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/companies/${id}`).then((res) => res.json() as Promise<Company>);
}

export const getCompanies = async () => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/companies`).then((res) => res.json() as Promise<Companies>);
}