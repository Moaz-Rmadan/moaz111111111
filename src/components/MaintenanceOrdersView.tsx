import React, { useState } from 'react';
import { collection, doc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceOrder, Safe, CostCenter, UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, CheckCircle, Wrench, Clock, PenTool } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function MaintenanceOrdersView({ 
  records, 
  safes, 
  costCenters,
  profile 
}: { 
  records: MaintenanceOrder[], 
  safes: Safe[], 
  costCenters: CostCenter[],
  profile: UserProfile | null 
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceOrder | null>(null);
  const [formData, setFormData] = useState({ 
    type: 'معدة/ماكينة' as MaintenanceOrder['type'],
    itemName: '', 
    costCenterId: costCenters[0]?.id || '',
    receiveDate: new Date().toISOString().split('T')[0],
    externalCenterName: '',
    sendDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    cost: 0, 
    notes: '',
    safeId: ''
  });

  const handleAdd = async () => {
    if (!formData.itemName || !formData.costCenterId || !formData.externalCenterName || !formData.expectedReturnDate) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (formData.cost > 0 && !formData.safeId) {
      alert('يرجى اختيار الخزنة التي سيتم صرف المبلغ منها');
      return;
    }

    try {
      const batch = writeBatch(db);
      const recordRef = doc(collection(db, 'maintenanceOrders'));
      let safeTransactionId = '';

      if (formData.cost > 0 && formData.safeId) {
        const txRef = doc(collection(db, 'safeTransactions'));
        safeTransactionId = txRef.id;
        
        batch.set(txRef, {
          safeId: formData.safeId,
          date: formData.sendDate,
          type: 'مصروفات',
          amount: formData.cost,
          description: `صيانة خارجية (${formData.type}): ${formData.itemName}`,
          costCenterId: formData.costCenterId,
          createdBy: profile?.name || 'مستخدم'
        });

        const safeRef = doc(db, 'safes', formData.safeId);
        const safe = safes.find(s => s.id === formData.safeId);
        if (safe) {
          batch.update(safeRef, {
            balance: safe.balance - formData.cost
          });
        }
      }

      batch.set(recordRef, {
        ...formData,
        status: 'جاري الصيانة',
        safeTransactionId
      });

      await batch.commit();
      setShowAdd(false);
      setFormData({ 
        type: 'معدة/ماكينة',
        itemName: '', 
        costCenterId: costCenters[0]?.id || '',
        receiveDate: new Date().toISOString().split('T')[0],
        externalCenterName: '',
        sendDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        cost: 0, 
        notes: '',
        safeId: ''
      });
    } catch (err) {
      console.error("Error adding maintenance order:", err);
      alert('حدث خطأ أثناء الإضافة');
    }
  };

  const handleComplete = async (record: MaintenanceOrder) => {
    try {
      const recordRef = doc(db, 'maintenanceOrders', record.id);
      await updateDoc(recordRef, {
        status: 'مكتملة',
        actualReturnDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error("Error completing maintenance order:", err);
      alert('حدث خطأ أثناء التحديث');
    }
  };

  const handleDelete = async (record: MaintenanceOrder) => {
    if (!confirm('هل أنت متأكد من حذف أمر الصيانة؟')) return;
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'maintenanceOrders', record.id));

      if (record.safeId && record.safeTransactionId && record.cost > 0) {
        batch.delete(doc(db, 'safeTransactions', record.safeTransactionId));
        const safeRef = doc(db, 'safes', record.safeId);
        const safe = safes.find(s => s.id === record.safeId);
        if (safe) {
          batch.update(safeRef, {
            balance: safe.balance + record.cost
          });
        }
      }

      await batch.commit();
    } catch (err) {
      console.error("Error deleting maintenance order:", err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const getCostCenterName = (id: string) => {
    return costCenters.find(c => c.id === id)?.name || id;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900">الصيانة الخارجية</h2>
          <p className="text-slate-500 font-bold mt-2">إدارة أوامر الصيانة للمعدات والأسلحة والصواني</p>
        </div>
        {(profile?.isAdmin || profile?.permissions?.maintenance) && (
          <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2">
            <Plus size={20} />
            أمر صيانة جديد
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">جاري الصيانة</p>
              <h3 className="text-3xl font-black text-slate-900">{records.filter(r => r.status === 'جاري الصيانة').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">مكتملة</p>
              <h3 className="text-3xl font-black text-slate-900">{records.filter(r => r.status === 'مكتملة').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">إجمالي التكلفة</p>
              <h3 className="text-3xl font-black text-slate-900">
                {records.reduce((acc, curr) => acc + curr.cost, 0).toLocaleString()} <span className="text-lg text-slate-500">ج.م</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">التاريخ</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">النوع والمعدة</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">مركز التكلفة</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">مركز الصيانة</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">تاريخ العودة المتوقع</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">الحالة</TableHead>
                  <TableHead className="text-right py-5 px-6 font-black text-slate-700">التكلفة</TableHead>
                  <TableHead className="text-center py-5 px-6 font-black text-slate-700">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500 font-bold">لا توجد أوامر صيانة حالياً</TableCell>
                  </TableRow>
                ) : (
                  records.sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()).map(record => (
                    <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-4 px-6 font-bold text-slate-700">{record.sendDate}</TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${record.type === 'معدة/ماكينة' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                            {record.type === 'معدة/ماكينة' ? <Wrench size={18} /> : <PenTool size={18} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{record.itemName}</p>
                            <p className="text-xs font-bold text-slate-500">{record.type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 font-bold text-slate-700">{getCostCenterName(record.costCenterId)}</TableCell>
                      <TableCell className="py-4 px-6 font-bold text-slate-700">{record.externalCenterName}</TableCell>
                      <TableCell className="py-4 px-6 font-bold text-slate-700" dir="ltr">{record.expectedReturnDate}</TableCell>
                      <TableCell className="py-4 px-6">
                        <span className={`px-3 py-1.5 rounded-xl text-sm font-black ${
                          record.status === 'جاري الصيانة' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6 font-black text-slate-900">{record.cost.toLocaleString()}</TableCell>
                      <TableCell className="py-4 px-6 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {record.status === 'جاري الصيانة' && (
                            <Button variant="ghost" onClick={() => handleComplete(record)} className="text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl">
                              <CheckCircle size={20} />
                            </Button>
                          )}
                          {(profile?.isAdmin || profile?.permissions?.canDelete) && (
                            <Button variant="ghost" onClick={() => handleDelete(record)} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl">
                              <Trash2 size={20} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-8 border-none shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">أمر صيانة خارجية جديد</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نوع الصيانة</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as MaintenanceOrder['type'] })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="معدة/ماكينة">معدة أو ماكينة</option>
                <option value="سن صواني">سن صواني</option>
                <option value="سن صفايح">سن صفايح</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">اسم المعدة / السلاح</label>
              <input
                type="text"
                value={formData.itemName}
                onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="مثال: مسدس رش، صينية 40 سم"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">مركز التكلفة (المستلم منه)</label>
              <select
                value={formData.costCenterId}
                onChange={e => setFormData({ ...formData, costCenterId: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {costCenters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">تاريخ الاستلام من مركز التكلفة</label>
              <input
                type="date"
                value={formData.receiveDate}
                onChange={e => setFormData({ ...formData, receiveDate: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">مركز الصيانة الخارجي</label>
              <input
                type="text"
                value={formData.externalCenterName}
                onChange={e => setFormData({ ...formData, externalCenterName: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="مثال: ورشة المهندس محمود"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">تاريخ الإرسال للصيانة</label>
              <input
                type="date"
                value={formData.sendDate}
                onChange={e => setFormData({ ...formData, sendDate: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">تاريخ العودة المتوقع</label>
              <input
                type="date"
                value={formData.expectedReturnDate}
                onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">التكلفة (إن وجدت الآن)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">الخزنة (إذا تم إدخال تكلفة)</label>
              <select
                value={formData.safeId}
                onChange={e => setFormData({ ...formData, safeId: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">-- اختر الخزنة --</option>
                {safes.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.balance.toLocaleString()} ج.م)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">ملاحظات</label>
              <input
                type="text"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="أسباب العطل، تفاصيل الصيانة المطلوبة..."
              />
            </div>
          </div>
          <DialogFooter className="mt-8 flex gap-3">
            <Button onClick={() => setShowAdd(false)} variant="ghost" className="h-12 px-6 rounded-xl font-bold">إلغاء</Button>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-primary/20">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
