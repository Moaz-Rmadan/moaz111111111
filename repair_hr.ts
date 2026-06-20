import * as fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. Fix HR transactions mapping ---
const targetMapStr = `          <TableBody>\n              <TableRow key={tr.id} className="hover:bg-slate-50/50 transition-colors">`;
const replaceMapStr = `          <TableBody>\n            {filteredTransactions.map(tr => (\n              <TableRow key={tr.id} className="hover:bg-slate-50/50 transition-colors">`;

if (content.includes(targetMapStr)) {
  content = content.replace(targetMapStr, replaceMapStr);
  console.log('Successfully fixed HR transactions TableBody map loop!');
} else {
  console.log('Warning: target map string not found - checking if already corrected or needs search');
}

// --- 2. Fix HR transactions handlers' braces ---
const targetHandlersStr = `  const handleAdd = async () => {
    if (!formData.employeeId) return;
    
    let finalData = { ...formData };
    
    // If it's overtime, calculate the amount automatically
    if (formData.type === 'إضافي') {
      const emp = employees.find(e => e.id === formData.employeeId);
      if (emp && formData.overtimeHours > 0) {
        const hourlyRate = emp.dailyRate / 10;
        finalData.amount = formData.overtimeHours * formData.overtimeRate * hourlyRate;
        if (!finalData.description) {
          finalData.description = \`إضافي \${formData.overtimeHours} ساعة بمعدل \${formData.overtimeRate}\`;
        }
      }
    }

    if (finalData.amount <= 0 && finalData.type !== 'إضافي') return;

    try {
      await addDoc(collection(db, 'hrTransactions'), finalData);
      setShowAdd(false);
      setFormData({
        employeeId: '',
        type: 'مكافأة',
        amount: 0,
        description: '',
        overtimeHours: 0,
        overtimeRate: 1.5
      });
  } catch (err) { console.error(err); };

  const handleUpdate = async () => {
    if (!editingTransaction) return;
    
    let finalData = { ...editingTransaction };
    
    if (finalData.type === 'إضافي') {
      const emp = employees.find(e => e.id === finalData.employeeId);
      if (emp && finalData.overtimeHours && finalData.overtimeHours > 0) {
        const hourlyRate = emp.dailyRate / 10;
        finalData.amount = finalData.overtimeHours * (finalData.overtimeRate || 1.5) * hourlyRate;
      }
    }

    if (finalData.amount <= 0 && finalData.type !== 'إضافي') return;

    try {
      const { id, ...data } = finalData;
      await updateDoc(doc(db, 'hrTransactions', id), data);
      setEditingTransaction(null);
  } catch (err) { console.error(err); };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'hrTransactions', deletingId));
      setDeletingId(null);
  } catch (err) { console.error(err); };`;

const replaceHandlersStr = `  const handleAdd = async () => {
    if (!formData.employeeId) return;
    
    let finalData = { ...formData };
    
    // If it's overtime, calculate the amount automatically
    if (formData.type === 'إضافي') {
      const emp = employees.find(e => e.id === formData.employeeId);
      if (emp && formData.overtimeHours > 0) {
        const hourlyRate = emp.dailyRate / 10;
        finalData.amount = formData.overtimeHours * formData.overtimeRate * hourlyRate;
        if (!finalData.description) {
          finalData.description = \`إضافي \${formData.overtimeHours} ساعة بمعدل \${formData.overtimeRate}\`;
        }
      }
    }

    if (finalData.amount <= 0 && finalData.type !== 'إضافي') return;

    try {
      await addDoc(collection(db, 'hrTransactions'), finalData);
      setShowAdd(false);
      setFormData({
        employeeId: '',
        type: 'مكافأة',
        amount: 0,
        description: '',
        overtimeHours: 0,
        overtimeRate: 1.5
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editingTransaction) return;
    
    let finalData = { ...editingTransaction };
    
    if (finalData.type === 'إضافي') {
      const emp = employees.find(e => e.id === finalData.employeeId);
      if (emp && finalData.overtimeHours && finalData.overtimeHours > 0) {
        const hourlyRate = emp.dailyRate / 10;
        finalData.amount = finalData.overtimeHours * (finalData.overtimeRate || 1.5) * hourlyRate;
      }
    }

    if (finalData.amount <= 0 && finalData.type !== 'إضافي') return;

    try {
      const { id, ...data } = finalData;
      await updateDoc(doc(db, 'hrTransactions', id), data);
      setEditingTransaction(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'hrTransactions', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };`;

// Normalize line endings before matching to avoid CRLF / LF mismatches
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetHandlersStr.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  content = normContent.replace(normTarget, replaceHandlersStr);
  console.log('Successfully replaced and fixed HR handlers!');
} else {
  console.log('Warning: Target handlers string not found with direct match!');
}

// --- 3. Fix Payroll try-catch-finally swap ---
const targetPayrollStr = `            payMethod: emp.payMethod || 'daily'
          });
        }
      finally { setIsImporting(false); }
    } catch (err) { console.error(err); };`;

const replacePayrollStr = `            payMethod: emp.payMethod || 'daily'
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsImporting(false);
      }`;

const normPayrollTarget = targetPayrollStr.replace(/\r\n/g, '\n');
const normContent2 = content.replace(/\r\n/g, '\n');

if (normContent2.includes(normPayrollTarget)) {
  content = normContent2.replace(normPayrollTarget, replacePayrollStr);
  console.log('Successfully fixed Payroll try-catch-finally ordering!');
} else {
  console.log('Warning: Target Payroll order string not found!');
}

fs.writeFileSync(filePath, content, 'utf8');
