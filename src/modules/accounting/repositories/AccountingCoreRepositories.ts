import { BaseRepository } from '../../shared/BaseRepository';
import { Account, JournalEntry, JournalLine, FiscalPeriod, CostCenter, AccountingDocument } from '../../../types';

export class AccountRepository extends BaseRepository<Account> {
  constructor() { super('accounts'); }
  async findByCode(code: string): Promise<Account | null> {
    const results = await this.findWhere('code', '==', code);
    return results.length > 0 ? results[0] : null;
  }
}

export class JournalEntryRepository extends BaseRepository<JournalEntry> {
  constructor() { super('journalEntries'); }
}

export class JournalLineRepository extends BaseRepository<JournalLine> {
  constructor() { super('journalLines'); }
  async getByEntryId(entryId: string): Promise<JournalLine[]> {
    return await this.findWhere('entryId', '==', entryId);
  }
}

export class FiscalPeriodRepository extends BaseRepository<FiscalPeriod> {
  constructor() { super('fiscalPeriods'); }
}

export class CostCenterRepository extends BaseRepository<CostCenter> {
  constructor() { super('costCenters'); }
}

export class AccountingDocumentRepository extends BaseRepository<AccountingDocument> {
  constructor() { super('accountingDocuments'); }
}

export const accountRepo = new AccountRepository();
export const journalEntryRepo = new JournalEntryRepository();
export const journalLineRepo = new JournalLineRepository();
export const fiscalPeriodRepo = new FiscalPeriodRepository();
export const costCenterRepo = new CostCenterRepository();
export const accountingDocumentRepo = new AccountingDocumentRepository();
