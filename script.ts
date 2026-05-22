import fs from 'fs';

const file = 'src/App.tsx';
const lines = fs.readFileSync(file, 'utf-8').split('\n');

const before = lines.slice(0, 13034);
const after = lines.slice(13166);

const newLines = `  const handleGenerate = async () => {
    try {
      setIsImporting(true);
      const response = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees, attendance, transactions, loans, productionRecords, genData })
      });

      if (!response.ok) throw new Error('Failed to generate payrolls from backend');
      const { processedPayrolls } = await response.json();

      let batch = writeBatch(db);
      let opCount = 0;

      for (const p of processedPayrolls) {
        const newRef = doc(collection(db, 'payrolls'));
        batch.set(newRef, p);
        opCount++;
        if (opCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
      await batch.commit();
      setShowGenerate(false);
    } catch (err) { handleFirestoreError(err, 'write', 'payrolls'); } finally { setIsImporting(false); }
  };`;

fs.writeFileSync(file, [...before, newLines, ...after].join('\n'));
