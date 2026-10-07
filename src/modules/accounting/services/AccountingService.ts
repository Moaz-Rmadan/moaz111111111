import { journalService } from './JournalService';
import { postingService } from './PostingService';
import { reversalService } from './ReversalService';
import { chartOfAccountsRepo, journalVoucherRepo } from '../repositories/AccountingRepository';
import { ChartOfAccount, JournalVoucher } from '../types';

export class AccountingService {
  get journal() { return journalService; }
  get posting() { return postingService; }
  get reversal() { return reversalService; }

  async postJournalVoucher(voucher: Omit<JournalVoucher, 'id'>, userId?: string): Promise<JournalVoucher> {
    return await journalVoucherRepo.create({
      ...voucher,
      status: 'POSTED',
      postedBy: userId,
      postedAt: new Date().toISOString()
    } as any);
  }

  async createAccount(acc: Omit<ChartOfAccount, 'id'>): Promise<ChartOfAccount> {
    return await chartOfAccountsRepo.create(acc);
  }
}

export const accountingService = new AccountingService();

