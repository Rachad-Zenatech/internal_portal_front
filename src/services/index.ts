// src/services/index.ts
import { CompanyService} from './companyService';
import { getBankAccount, getBankAccounts } from './bankAccountService';
import { getBank, getBanks } from './bankService';
import { ChartOfAccountService } from './chartOfAccountService';

export { 
    getBankAccount, 
    getBankAccounts, 
    getBank, 
    getBanks,
    ChartOfAccountService,
    CompanyService
};