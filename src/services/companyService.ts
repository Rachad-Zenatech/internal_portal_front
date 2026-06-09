// src/services/companyService.ts

import type { Company, Companies } from '../types/company';
import.meta.env.VITE_API_BASE_URL;

export const CompanyService = {
    async getCompany(id: number): Promise<Company> {
        const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/accounting/companies/${id}`
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
            errorData.detail || `Error ${response.status}: Failed to fetch company ${id}`
            );
        }

        return response.json();
    },
    async getCompanies(): Promise<Companies> {
        const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/accounting/companies`
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
            errorData.detail || `Error ${response.status}: Failed to fetch companies list`
            );
        }

        return response.json();
    }
}