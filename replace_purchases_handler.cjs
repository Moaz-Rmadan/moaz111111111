const fs = require('fs');

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const startSig = 'const handleAdd = async () => {\n    if (!formData.supplierId || formData.selectedItems.some(i => !i.itemId || i.quantity <= 0)) return;';
const endSig = 'paymentStatus: \'نقدي\',\n        safeId: \'\',\n        notes: \'\'\n      });\n    } catch (err) {\n    }\n  };';

// Let's do a substring search
const startIndex = content.indexOf(startSig);
if (startIndex === -1) {
  // Try with spaces or tabs or slightly different signature
  console.error('Could not find start signature of purchases handleAdd');
  process.exit(1);
}

// Locate the endSig after the startIndex
const endIndex = content.indexOf(endSig, startIndex);
if (endIndex === -1) {
  console.error('Could not find end signature of purchases handleAdd');
  process.exit(1);
}

const finalEndIndex = endIndex + endSig.length;

const cleanPurchasesHandler = `const handleAdd = async () => {
    if (!formData.supplierId || formData.selectedItems.some(i => !i.itemId || i.quantity <= 0)) return;
    if (formData.paidAmount > 0 && !formData.safeId) {
      alert('يرجى اختيار الخزنة التي سيتم صرف المبلغ منها');
      return;
    }
    
    const invoiceTotal = formData.selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    try {
      const batch = writeBatch(db);
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      
      let safeTransactionId = '';
      if (formData.paidAmount > 0 && formData.safeId) {
        const txRef = doc(collection(db, 'safeTransactions'));
        safeTransactionId = txRef.id;
        
        batch.set(txRef, {
          safeId: formData.safeId,
          type: 'مشتريات',
          amount: Number(formData.paidAmount),
          description: \`دفعة مشتريات للمورد: \${supplier?.name}\`,
          category: 'خامات/مشتريات',
          createdBy: profile?.name || 'مستخدم'
        });
        
        // Update safe balance
        batch.update(doc(db, 'safes', formData.safeId), {
          balance: increment(-Number(formData.paidAmount))
        });
      }
      
      for (const selectedItem of formData.selectedItems) {
        const item = items.find(i => i.id === selectedItem.itemId);
        const itemTotal = selectedItem.quantity * selectedItem.unitPrice;
        
        // Purchase record
        const purchaseRef = doc(collection(db, 'purchases'));
        batch.set(purchaseRef, {
          supplierId: formData.supplierId,
          itemId: selectedItem.itemId,
          quantity: selectedItem.quantity,
          unitPrice: selectedItem.unitPrice,
          total: itemTotal,
          paidAmount: formData.paidAmount > 0 ? (formData.paidAmount * (itemTotal / invoiceTotal)) : 0, 
          paymentStatus: formData.paymentStatus,
          notes: formData.notes,
          date: formData.date || format(new Date(), 'yyyy-MM-dd'),
          unit: item?.unit || '',
          safeId: formData.safeId || null,
          safeTransactionId: safeTransactionId || null
        });
        
        // Update Item Stock
        const itemRef = doc(db, 'items', selectedItem.itemId);
        const currentTotalValue = (item?.totalValue || (item ? item.currentBalance * item.price : 0));
        const newTotalValue = currentTotalValue + itemTotal;
        const newQuantity = (item?.currentBalance || 0) + selectedItem.quantity;
        const newAveragePrice = newQuantity > 0 ? newTotalValue / newQuantity : selectedItem.unitPrice;
        
        batch.update(itemRef, {
          inward: increment(selectedItem.quantity),
          currentBalance: increment(selectedItem.quantity),
          totalValue: newTotalValue,
          price: newAveragePrice
        });
      }
      
      // Update Supplier Balance
      const supplierRef = doc(db, 'suppliers', formData.supplierId);
      const balanceChange = invoiceTotal - formData.paidAmount;
      batch.update(supplierRef, {
        totalPurchases: increment(invoiceTotal),
        totalPayments: increment(formData.paidAmount),
        balance: increment(balanceChange)
      });
      
      await batch.commit();
      setShowAdd(false);
      setFormData({
        supplierId: '',
        selectedItems: [{ itemId: '', quantity: 0, unitPrice: 0 }],
        paidAmount: 0,
        paymentStatus: 'نقدي',
        safeId: '',
        notes: ''
      });
    } catch (err) {
      console.error(err);
    }
  };`;

const before = content.substring(0, startIndex);
const after = content.substring(finalEndIndex);

fs.writeFileSync(file, before + cleanPurchasesHandler + after, 'utf8');
console.log('Successfully replaced purchases handleAdd handler!');
