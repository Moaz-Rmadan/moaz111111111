import { doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export type DocumentPrefix = 'PO' | 'PR' | 'ISS' | 'WO' | 'SO' | 'REC' | 'PAY' | 'JV';

export class DocumentNumberService {
  /**
   * Generates a unique, atomic document number.
   * Format: PREFIX-YYYY-000001
   */
  async generateNextNumber(prefix: DocumentPrefix): Promise<string> {
    const year = new Date().getFullYear();
    const counterId = `${prefix}-${year}`;
    const counterRef = doc(db, 'documentCounters', counterId);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let nextValue = 1;
      if (counterDoc.exists()) {
        nextValue = counterDoc.data().nextValue + 1;
      }

      transaction.set(counterRef, { nextValue }, { merge: true });

      const paddedValue = nextValue.toString().padStart(6, '0');
      return `${prefix}-${year}-${paddedValue}`;
    });
  }
}

export const documentNumberService = new DocumentNumberService();
