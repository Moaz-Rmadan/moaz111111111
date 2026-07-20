import React, { useState } from 'react';
import { 
  Plus, ArrowLeftRight, Calendar, User, Warehouse as WarehouseIcon, 
  FileText, Search, Trash2, Printer, Eye, X, ChevronDown, Check, AlertTriangle, ArrowRightLeft
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Warehouse, Item, WarehouseTransfer, UserProfile, WarehouseTransferItem } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WarehouseTransfersViewProps {
  warehouses: Warehouse[];
  items: Item[];
  transfers: WarehouseTransfer[];
  profile: UserProfile | null;
}

export function WarehouseTransfersView({ 
  warehouses, 
  items, 
  transfers, 
  profile 
}: WarehouseTransfersViewProps) {
  const [search, setSearch] = useState('');
  const [selectedFromWh, setSelectedFromWh] = useState('all');
  const [selectedToWh, setSelectedToWh] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<WarehouseTransfer | null>(null);

  // New Transfer Form State
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: '', quantity: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Source warehouse items filter (only items with current balance > 0)
  const availableSourceItems = items.filter(
    item => item.warehouseId === fromWarehouseId && item.currentBalance > 0
  );

  const handleAddRow = () => {
    setTransferItems([...transferItems, { itemId: '', quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = transferItems.filter((_, idx) => idx !== index);
    setTransferItems(updated.length > 0 ? updated : [{ itemId: '', quantity: 1 }]);
  };

  const handleItemChange = (index: number, itemId: string) => {
    const updated = [...transferItems];
    updated[index].itemId = itemId;
    // Set default quantity to 1 or max available if less than 1
    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem) {
      updated[index].quantity = Math.min(1, selectedItem.currentBalance);
    }
    setTransferItems(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...transferItems];
    updated[index].quantity = quantity;
    setTransferItems(updated);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fromWarehouseId || !toWarehouseId) {
      setErrorMessage('يرجى تحديد المخزن المرسل والمخزن المستلم.');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setErrorMessage('لا يمكن التحويل لنفس المخزن. يرجى اختيار مخزنين مختلفين.');
      return;
    }

    // Validate rows
    const validItems = transferItems.filter(ti => ti.itemId && ti.quantity > 0);
    if (validItems.length === 0) {
      setErrorMessage('يرجى إضافة صنف واحد على الأقل بكمية صالحة.');
      return;
    }

    // Check availability
    for (const ti of validItems) {
      const dbItem = items.find(i => i.id === ti.itemId);
      if (!dbItem) {
        setErrorMessage('أحد الأصناف المختارة غير موجود بالخادم.');
        return;
      }
      if (ti.quantity > dbItem.currentBalance) {
        setErrorMessage(`الكمية المطلوبة للصنف "${dbItem.name}" (${ti.quantity}) تتجاوز الرصيد المتاح حالياً (${dbItem.currentBalance}).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const itemsToRecord: WarehouseTransferItem[] = [];

      for (const ti of validItems) {
        const sourceItem = items.find(i => i.id === ti.itemId)!;
        
        // 1. Decrease source item balance
        const sourceItemRef = doc(db, 'items', sourceItem.id);
        const newSourceOutward = (sourceItem.outward || 0) + ti.quantity;
        const newSourceBalance = sourceItem.currentBalance - ti.quantity;
        const newSourceTotalValue = newSourceBalance * sourceItem.price;

        batch.update(sourceItemRef, {
          outward: newSourceOutward,
          currentBalance: newSourceBalance,
          totalValue: newSourceTotalValue
        });

        // 2. Increase destination item balance
        // Check if item already exists in target warehouse
        const destinationItem = items.find(i => 
          i.name.trim().toLowerCase() === sourceItem.name.trim().toLowerCase() && 
          i.unit.trim() === sourceItem.unit.trim() && 
          i.warehouseId === toWarehouseId
        );

        let destItemId = '';

        if (destinationItem) {
          destItemId = destinationItem.id;
          const destItemRef = doc(db, 'items', destinationItem.id);
          const newDestInward = (destinationItem.inward || 0) + ti.quantity;
          const newDestBalance = destinationItem.currentBalance + ti.quantity;
          const newDestTotalValue = newDestBalance * destinationItem.price;

          batch.update(destItemRef, {
            inward: newDestInward,
            currentBalance: newDestBalance,
            totalValue: newDestTotalValue
          });
        } else {
          // Create new Item document in target warehouse
          const newItemRef = doc(collection(db, 'items'));
          destItemId = newItemRef.id;

          const newItemData = {
            name: sourceItem.name,
            unit: sourceItem.unit,
            category: sourceItem.category,
            department: sourceItem.department,
            price: sourceItem.price,
            warehouseId: toWarehouseId,
            openingBalance: 0,
            inward: ti.quantity,
            outward: 0,
            returned: 0,
            wasted: 0,
            currentBalance: ti.quantity,
            safetyLimit: sourceItem.safetyLimit || 5,
            totalValue: ti.quantity * sourceItem.price
          };

          batch.set(newItemRef, newItemData);
        }

        itemsToRecord.push({
          sourceItemId: sourceItem.id,
          destinationItemId: destItemId,
          name: sourceItem.name,
          unit: sourceItem.unit,
          quantity: ti.quantity,
          price: sourceItem.price
        });
      }

      // 3. Create Transfer Document
      const transferRef = doc(collection(db, 'warehouseTransfers'));
      const transferData = {
        date: transferDate,
        fromWarehouseId,
        toWarehouseId,
        items: itemsToRecord,
        notes: notes.trim(),
        createdBy: profile?.name || 'مستخدم النظام'
      };

      batch.set(transferRef, transferData);

      // Commit write batch
      await batch.commit();

      // Reset Form and close modal
      setFromWarehouseId('');
      setToWarehouseId('');
      setNotes('');
      setTransferItems([{ itemId: '', quantity: 1 }]);
      setShowAddModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء حفظ عملية التحويل: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (transfer: WarehouseTransfer) => {
    const fromWhName = warehouses.find(w => w.id === transfer.fromWarehouseId)?.name || 'غير معروف';
    const toWhName = warehouses.find(w => w.id === transfer.toWarehouseId)?.name || 'غير معروف';
    const totalVal = transfer.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>بون تحويل مخزني #${transfer.id.slice(0, 8)}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 900; color: #1e293b; }
            .header p { margin: 5px 0 0 0; font-size: 14px; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 35px; }
            .meta-item { font-size: 15px; line-height: 1.8; }
            .meta-item strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px 15px; text-align: right; }
            th { background-color: #f1f5f9; color: #1e293b; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .total-section { margin-top: 30px; text-align: left; font-size: 18px; font-weight: 900; color: #0f172a; }
            .notes { margin-top: 40px; padding: 15px; border-right: 4px solid #1e293b; background: #f8fafc; }
            .notes-title { font-weight: bold; margin-bottom: 5px; color: #1e293b; }
            .footer-sigs { display: flex; justify-content: space-between; margin-top: 80px; }
            .sig-box { text-align: center; width: 200px; }
            .sig-line { border-top: 1px dashed #333; margin-top: 50px; }
            @media print {
              body { padding: 10px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>سند تحويل مخزني رسمي</h1>
            <p>المركز اللوجستي وإدارة المخازن المتكاملة</p>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item">
              <div><strong>رقم السند:</strong> #${transfer.id.slice(0, 8)}</div>
              <div><strong>تاريخ التحويل:</strong> ${transfer.date}</div>
              <div><strong>أمين المستودع:</strong> ${transfer.createdBy}</div>
            </div>
            <div class="meta-item" style="text-align: left;">
              <div><strong>المخزن المرسل (المصدر):</strong> ${fromWhName}</div>
              <div><strong>المخزن المستلم (الوجهة):</strong> ${toWhName}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 80px; text-align: center;">م</th>
                <th>اسم الصنف المحول</th>
                <th style="width: 100px;">الوحدة</th>
                <th style="width: 120px; text-align: center;">الكمية المحولة</th>
                <th style="width: 150px; text-align: left;">سعر الوحدة</th>
                <th style="width: 150px; text-align: left;">إجمالي القيمة</th>
              </tr>
            </thead>
            <tbody>
              ${transfer.items.map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.unit}</td>
                  <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                  <td style="text-align: left;">${item.price.toLocaleString()} ج.م</td>
                  <td style="text-align: left; font-weight: bold;">${(item.quantity * item.price).toLocaleString()} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            إجمالي القيمة التقديرية للشحنة: ${(totalVal).toLocaleString()} ج.م
          </div>

          ${transfer.notes ? `
            <div class="notes">
              <div class="notes-title">ملاحظات التحويل:</div>
              <div>${transfer.notes}</div>
            </div>
          ` : ''}

          <div class="footer-sigs">
            <div class="sig-box">
              <strong>أمين المخزن المرسل</strong>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <strong>سائق الشحنة / الناقل</strong>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <strong>مستلم المخزن المستلم</strong>
              <div class="sig-line"></div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter transfers
  const filteredTransfers = transfers.filter(t => {
    const fromWhName = warehouses.find(w => w.id === t.fromWarehouseId)?.name || '';
    const toWhName = warehouses.find(w => w.id === t.toWarehouseId)?.name || '';
    const itemsMatch = t.items.some(ti => ti.name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesSearch = fromWhName.toLowerCase().includes(search.toLowerCase()) || 
                          toWhName.toLowerCase().includes(search.toLowerCase()) || 
                          itemsMatch || 
                          t.id.toLowerCase().includes(search.toLowerCase());

    const matchesFrom = selectedFromWh === 'all' || t.fromWarehouseId === selectedFromWh;
    const matchesTo = selectedToWh === 'all' || t.toWarehouseId === selectedToWh;

    return matchesSearch && matchesFrom && matchesTo;
  });

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 pb-6 relative">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-primary font-black text-xs uppercase tracking-[0.3em] px-5 py-2.5 bg-primary/5 border border-primary/10 rounded-full w-fit shadow-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <ArrowRightLeft size={16} />
            التحويلات المخزنية البينية
          </div>
          <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 leading-[0.8]">
            حركات <br />
            <span className="text-slate-300">التحويل المخزني</span>
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-5">
          <Button 
            onClick={() => setShowAddModal(true)} 
            className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-2xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3"
          >
            <Plus size={22} strokeWidth={3} />
            إنشاء تحويل مخزني جديد
          </Button>
        </div>
      </div>

      {/* QUICK SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-3xl border border-slate-100 shadow-sm bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي عمليات التحويل</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{transfers.length}</p>
            </div>
            <ArrowLeftRight className="w-6 h-6 text-indigo-500" />
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border border-slate-100 shadow-sm bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي قيمة المواد المحولة</p>
              <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                {transfers.reduce((totalSum, t) => 
                  totalSum + t.items.reduce((sum, item) => sum + (item.quantity * item.price), 0), 0
                ).toLocaleString('ar-EG')} ج.م
              </p>
            </div>
            <WarehouseIcon className="w-6 h-6 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-6 rounded-3xl border border-slate-100 shadow-sm bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">أكثر مخزن إرسالاً</p>
              <p className="text-lg font-black text-slate-800 tracking-tight">
                {(() => {
                  const counts: Record<string, number> = {};
                  transfers.forEach(t => {
                    counts[t.fromWarehouseId] = (counts[t.fromWarehouseId] || 0) + 1;
                  });
                  let maxWhId = '';
                  let maxCount = 0;
                  Object.entries(counts).forEach(([id, count]) => {
                    if (count > maxCount) {
                      maxCount = count;
                      maxWhId = id;
                    }
                  });
                  return warehouses.find(w => w.id === maxWhId)?.name || 'لا يوجد بعد';
                })()}
              </p>
            </div>
            <FileText className="w-6 h-6 text-indigo-400" />
          </div>
        </Card>
      </div>

      {/* FILTER PLATFORM */}
      <div className="bg-white/50 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white/60 shadow-2xl shadow-slate-200/50 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 relative">
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
              <Search size={20} strokeWidth={2.5} />
            </div>
            <input 
              type="text"
              placeholder="بحث باسم المخزن، كود السند، أو اسم صنف محول..." 
              className="w-full h-16 pr-14 pl-5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <select
              value={selectedFromWh}
              onChange={e => setSelectedFromWh(e.target.value)}
              className="w-full h-16 px-5 rounded-2xl border border-slate-200 bg-white shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm"
            >
              <option value="all">المخزن المرسل: الكل</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedToWh}
              onChange={e => setSelectedToWh(e.target.value)}
              className="w-full h-16 px-5 rounded-2xl border border-slate-200 bg-white shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all text-sm"
            >
              <option value="all">المخزن المستلم: الكل</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* RECENT TRANSFERS LIST */}
        <div className="overflow-hidden border border-slate-100 bg-white rounded-3xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="p-5 font-black">رقم السند</th>
                  <th className="p-5 font-black">تاريخ التحويل</th>
                  <th className="p-5 font-black">من مخزن (المصدر)</th>
                  <th className="p-5 font-black">إلى مخزن (الوجهة)</th>
                  <th className="p-5 font-black">عدد الأصناف</th>
                  <th className="p-5 font-black">إجمالي القيمة التقديرية</th>
                  <th className="p-5 font-black text-center">أمين العهدة</th>
                  <th className="p-5 font-black text-left">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransfers.map((t) => {
                  const totalValue = t.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-mono font-black text-slate-500">#{t.id.slice(0, 8)}</td>
                      <td className="p-5 font-bold text-slate-700">{t.date}</td>
                      <td className="p-5">
                        <span className="inline-flex items-center gap-2 font-black text-slate-900 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl border border-red-100">
                          <WarehouseIcon size={14} />
                          {warehouses.find(w => w.id === t.fromWarehouseId)?.name || 'غير معروف'}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className="inline-flex items-center gap-2 font-black text-slate-900 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                          <WarehouseIcon size={14} />
                          {warehouses.find(w => w.id === t.toWarehouseId)?.name || 'غير معروف'}
                        </span>
                      </td>
                      <td className="p-5 font-bold text-slate-600">{t.items.length} أصناف</td>
                      <td className="p-5 font-black text-slate-900">{totalValue.toLocaleString()} ج.م</td>
                      <td className="p-5 text-center font-bold text-slate-500">{t.createdBy}</td>
                      <td className="p-5 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSelectedTransfer(t)}
                            className="h-10 w-10 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="عرض التفاصيل"
                          >
                            <Eye size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handlePrint(t)}
                            className="h-10 w-10 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="طباعة بون التحويل"
                          >
                            <Printer size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                      لا يوجد أي عمليات تحويل مخزني مطابقة للبحث أو الفلترة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* NEW TRANSFER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <ArrowLeftRight className="text-indigo-600" size={24} />
                    إنشاء بون تحويل مخزني جديد
                  </h3>
                  <p className="text-slate-400 font-bold text-sm mt-1">قم بتحويل المواد الخام أو المنتجات بين المستودعات والمخازن المختلفة.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="h-12 w-12 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitTransfer} className="flex-1 overflow-y-auto p-8 space-y-6">
                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-black flex items-center gap-3">
                    <AlertTriangle size={18} className="shrink-0" />
                    {errorMessage}
                  </div>
                )}

                {/* Warehouse and Date Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-600">المخزن المرسل (المصدر)</label>
                    <div className="relative">
                      <select
                        required
                        value={fromWarehouseId}
                        onChange={e => {
                          setFromWarehouseId(e.target.value);
                          // Reset transfer items if warehouse changed to avoid cross-warehouse errors
                          setTransferItems([{ itemId: '', quantity: 1 }]);
                        }}
                        className="w-full h-14 pr-4 pl-10 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm appearance-none"
                      >
                        <option value="">اختر المخزن المصدر...</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-600">المخزن المستلم (الوجهة)</label>
                    <div className="relative">
                      <select
                        required
                        value={toWarehouseId}
                        onChange={e => setToWarehouseId(e.target.value)}
                        className="w-full h-14 pr-4 pl-10 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm appearance-none"
                      >
                        <option value="">اختر المخزن الوجهة...</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-600">تاريخ التحويل</label>
                    <input
                      type="date"
                      required
                      value={transferDate}
                      onChange={e => setTransferDate(e.target.value)}
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Items Dynamic List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-black text-slate-800">الأصناف المراد تحويلها</h4>
                    <Button 
                      type="button"
                      disabled={!fromWarehouseId}
                      onClick={handleAddRow}
                      className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center gap-2"
                    >
                      <Plus size={14} />
                      إضافة صنف
                    </Button>
                  </div>

                  {!fromWarehouseId ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm">
                      يرجى تحديد المخزن المرسل أولاً لتتمكن من استعراض خاماته وأصنافه المتاحة للتحويل.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transferItems.map((row, index) => {
                        const selectedItemObj = items.find(i => i.id === row.itemId);
                        return (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            {/* Item Selector */}
                            <div className="md:col-span-6 space-y-1.5 text-right">
                              <label className="text-[10px] font-black text-slate-400 uppercase">اسم الصنف</label>
                              <div className="relative">
                                <select
                                  required
                                  value={row.itemId}
                                  onChange={e => handleItemChange(index, e.target.value)}
                                  className="w-full h-12 pr-4 pl-10 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm appearance-none"
                                >
                                  <option value="">اختر الصنف المراد تحويله...</option>
                                  {availableSourceItems.map(i => (
                                    <option key={i.id} value={i.id}>
                                      {i.name} (المتاح: {i.currentBalance} {i.unit})
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* Unit (Readonly info) */}
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase">الوحدة</label>
                              <div className="w-full h-12 rounded-xl border border-slate-150 bg-slate-100 flex items-center px-4 font-bold text-slate-600 text-sm">
                                {selectedItemObj?.unit || '-'}
                              </div>
                            </div>

                            {/* Quantity Input */}
                            <div className="md:col-span-3 space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase">الكمية المحولة</label>
                              <input
                                type="number"
                                required
                                min="0.01"
                                step="any"
                                max={selectedItemObj?.currentBalance || 99999}
                                value={row.quantity}
                                onChange={e => handleQuantityChange(index, Number(e.target.value))}
                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                              />
                            </div>

                            {/* Remove button */}
                            <div className="md:col-span-1 flex justify-center pb-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveRow(index)}
                                className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notes and Total summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-600">ملاحظات أو تفاصيل الشحنة / السائق</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="اكتب ملاحظات إضافية حول سبب النقل، اسم السائق، أو تفاصيل الشحن والتسليم..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100/60 p-6 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">الإجمالي المالي المقدر للتحويل</span>
                      <p className="text-3xl font-black text-indigo-900 mt-2">
                        {transferItems.reduce((sum, row) => {
                          const item = items.find(i => i.id === row.itemId);
                          return sum + (row.quantity * (item?.price || 0));
                        }, 0).toLocaleString()} <span className="text-xs font-bold text-indigo-600">ج.م</span>
                      </p>
                    </div>
                    <p className="text-slate-400 text-xs font-bold mt-2">يتم تسعير المواد بناءً على تكلفة المخزون الحالي تلقائياً لضبط الحسابات ومراكز التكلفة.</p>
                  </div>
                </div>

                {/* Submit button bar */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="h-14 px-8 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        جاري معالجة التحويل...
                      </>
                    ) : (
                      <>
                        <Check size={18} strokeWidth={3} />
                        تأكيد وترحيل السند
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED RECEIPT / DETAILS MODAL */}
      <AnimatePresence>
        {selectedTransfer && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
            >
              {/* Receipt Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full w-fit mb-2">
                    تفاصيل سند التحويل
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    تحويل مخزني رقم #{selectedTransfer.id.slice(0, 8)}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedTransfer(null)}
                  className="h-12 w-12 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Receipt Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">المصدر</span>
                    <span className="font-black text-slate-800">
                      {warehouses.find(w => w.id === selectedTransfer.fromWarehouseId)?.name || 'غير معروف'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">الوجهة</span>
                    <span className="font-black text-slate-800">
                      {warehouses.find(w => w.id === selectedTransfer.toWarehouseId)?.name || 'غير معروف'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">التاريخ</span>
                    <span className="font-black text-slate-800">{selectedTransfer.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">أمين المستودع</span>
                    <span className="font-black text-slate-800">{selectedTransfer.createdBy}</span>
                  </div>
                </div>

                {/* Receipt Items Table */}
                <div className="space-y-3">
                  <h4 className="font-black text-slate-800">الأصناف التي تم شحنها</h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                          <th className="p-4">اسم الصنف</th>
                          <th className="p-4">الوحدة</th>
                          <th className="p-4 text-center">الكمية المحولة</th>
                          <th className="p-4 text-left">التكلفة المفردة</th>
                          <th className="p-4 text-left">القيمة الإجمالية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedTransfer.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="p-4 font-black text-slate-950">{item.name}</td>
                            <td className="p-4 text-slate-500 font-bold">{item.unit}</td>
                            <td className="p-4 text-center font-black text-slate-800">{item.quantity}</td>
                            <td className="p-4 text-left text-slate-600 font-bold">{item.price.toLocaleString()} ج.م</td>
                            <td className="p-4 text-left font-black text-slate-900">{(item.quantity * item.price).toLocaleString()} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes and Grand Total */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4 border-t border-slate-100">
                  {selectedTransfer.notes ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                      <span className="text-slate-400 font-bold block mb-1">ملاحظات السند</span>
                      <p className="text-slate-700 font-bold">{selectedTransfer.notes}</p>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic font-bold">لا يوجد ملاحظات إضافية على هذا السند.</div>
                  )}

                  <div className="bg-emerald-50 text-emerald-900 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between text-left">
                    <span className="font-black text-sm">القيمة الكلية للسند</span>
                    <span className="text-2xl font-black">
                      {selectedTransfer.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer Controls */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <Button
                  onClick={() => setSelectedTransfer(null)}
                  variant="outline"
                  className="h-12 px-6 rounded-xl font-bold text-slate-600"
                >
                  إغلاق
                </Button>
                <Button
                  onClick={() => handlePrint(selectedTransfer)}
                  className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center gap-2"
                >
                  <Printer size={16} />
                  طباعة سند النقل
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
