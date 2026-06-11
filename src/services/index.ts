// src/services/index.ts
import { getBankAccount, getBankAccounts } from './bankAccountService';
import { bankService } from './bankService';
import { ChartOfAccountService } from './chartOfAccountService';


export { 
    getBankAccount, 
    getBankAccounts, 
    ChartOfAccountService,
    bankService
};