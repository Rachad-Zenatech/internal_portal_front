// src/services/index.ts
import { getCompany, getCompanies } from './companyService';
import { getBankAccount, getBankAccounts } from './bankAccountService';
import { getBank, getBanks } from './bankService';
import { chartOfAccountService } from './chartOfAccountService';

export { 
    getCompany, 
    getCompanies, 
    getBankAccount, 
    getBankAccounts, 
    getBank, 
    getBanks,
    chartOfAccountService
};