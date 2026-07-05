const fs = require('fs');

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const startSig = 'const handleAuditSafe = async () => {';
const endSig = 'const handleCreateSettlement = async () => {';

const startIndex = content.indexOf(startSig);
const endIndex = content.indexOf(endSig);

if (startIndex === -1 || endIndex === -1) {
  console.error(`Could not find signatures! start=${startIndex}, end=${endIndex}`);
  process.exit(1);
}

console.log(`Found safe audit handler between indexes ${startIndex} and ${endIndex}`);

const newSafeAuditBlock = `const handleAuditSafe = async () => {
    if (!auditForm.safeId) return;
    const safe = safes.find(s => s.id === auditForm.safeId);
    if (!safe) return;
    const physical = Number(auditForm.physicalBalance);
    const system = safe.balance;
    const diff = physical - system;
    try {
      const batch = writeBatch(db);
      const auditRef = doc(collection(db, 'safeAudits'));
      
      batch.set(auditRef, {
        safeId: auditForm.safeId,
        systemBalance: system,
        physicalBalance: physical,
        difference: diff,
        notes: auditForm.notes,
        createdBy: profile?.name || 'مستخدم'
      });

      // If there is a difference, create a corrective transaction and update safe balance
      if (diff !== 0) {
        const txRef = doc(collection(db, 'safeTransactions'));
        batch.set(txRef, {
          safeId: auditForm.safeId,
          type: 'جرد',
          amount: Math.abs(diff),
          description: diff > 0 ? 'تسوية جرد (زيادة)' : 'تسوية جرد (عجز)',
          category: 'تسوية خزنة',
          createdBy: profile?.name || 'مستخدم',
          relatedId: auditRef.id
        });
        batch.update(doc(db, 'safes', auditForm.safeId), {
          balance: physical // Force update to physical balance
        });
      }

      await batch.commit();
      setShowAudit(false);
      setAuditForm({ safeId: '', physicalBalance: 0, notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  `;

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

fs.writeFileSync(file, before + newSafeAuditBlock + after, 'utf8');
console.log('Successfully replaced safe audit block!');
