import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AuditLog } from '../../../types';

export class AuditService {
  async logAction(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: Omit<AuditLog, 'id'> = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'auditLogs'), logEntry);
  }
}

export const auditService = new AuditService();
