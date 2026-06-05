// src/services/index.ts
import { getCompany, getCompanies } from './companyService';
import { getBankAccount, getBankAccounts } from './bankAccountService';
import { getBank, getBanks } from './bankService';
import {getChartOfAccounts, getChartOfAccount, insertChartOfAccount, deleteChartOfAccount} from './chartOfAccountService';

export { 
    getCompany, 
    getCompanies, 
    getBankAccount, 
    getBankAccounts, 
    getBank, 
    getBanks, 
    getChartOfAccounts, 
    getChartOfAccount,
    insertChartOfAccount,
    deleteChartOfAccount
};