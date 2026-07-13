import React, { useState } from 'react';
import { collection, doc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceOrder, Safe, CostCenter, UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CheckCircle, Wrench, Clock, PenTool, AlertTriangle, BarChart3, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NumberDisplay } from '../lib/numberUtils';

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
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'center' | 'type'>('center');
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

  const todayStr = new Date().toISOString().split('T')[0];

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

  // Advanced calculations for analytics
  const delayedRecords = records.filter(r => r.status === 'جاري الصيانة' && r.expectedReturnDate && r.expectedReturnDate < todayStr);
  const delayedCount = delayedRecords.length;

  const costByCenter = React.useMemo(() => {
    const groups: { [key: string]: number } = {};
    records.forEach(r => {
      const centerName = getCostCenterName(r.costCenterId);
      groups[centerName] = (groups[centerName] || 0) + (r.cost || 0);
    });
    return Object.entries(groups)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [records, costCenters]);

  const costByType = React.useMemo(() => {
    const groups: { [key: string]: number } = {};
    records.forEach(r => {
      const type = r.type || 'أخرى';
      groups[type] = (groups[type] || 0) + (r.cost || 0);
    });
    return Object.entries(groups)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [records]);

  const maxCenterCost = Math.max(...costByCenter.map(c => c.cost), 1);
  const maxTypeCost = Math.max(...costByType.map(t => t.cost), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
      {/* Header section with Stats Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-indigo-600 animate-spin-slow" />
            إدارة الصيانة الخارجية والأسلحة
          </h2>
          <p className="text-slate-500 font-bold mt-2">متابعة صيانة وسن المعدات، الصواني والأسلحة وتكلفة مراكز التشغيل</p>
        </div>
        {(profile?.isAdmin || profile?.permissions?.maintenance) && (
          <Button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 w-full md:w-auto">
            <Plus size={20} />
            أمر صيانة جديد
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden hover:scale-[1.01] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">جاري الصيانة</p>
              <h3 className="text-3xl font-black text-slate-900">
                <NumberDisplay value={records.filter(r => r.status === 'جاري الصيانة').length} />
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden hover:scale-[1.01] transition-transform ${delayedCount > 0 ? 'ring-2 ring-red-500/20' : ''}`}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${delayedCount > 0 ? 'bg-rose-100 text-rose-600 animate-bounce' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">متأخرة عن العودة</p>
              <h3 className={`text-3xl font-black ${delayedCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                <NumberDisplay value={delayedCount} />
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden hover:scale-[1.01] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">مكتملة ومستلمة</p>
              <h3 className="text-3xl font-black text-slate-900">
                <NumberDisplay value={records.filter(r => r.status === 'مكتملة').length} />
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-indigo-600 text-white overflow-hidden hover:scale-[1.01] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-indigo-500/50 text-white rounded-2xl">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-200 mb-1">إجمالي التكلفة المصروفة</p>
              <h3 className="text-2xl font-black text-white">
                <NumberDisplay value={records.reduce((acc, curr) => acc + curr.cost, 0)} className="text-white" unit="ج.م" />
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Cost Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Distribution (Col 1) */}
        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white p-6 col-span-1 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              توزيع التكلفة والتحليل المالي
            </h4>
            <div className="flex gap-1">
              <button 
                onClick={() => setActiveAnalysisTab('center')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${activeAnalysisTab === 'center' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}
              >
                بالمراكز
              </button>
              <button 
                onClick={() => setActiveAnalysisTab('type')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${activeAnalysisTab === 'type' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}
              >
                بالنوع
              </button>
            </div>
          </div>

          <div className="space-y-4 h-[240px] overflow-y-auto pr-1">
            {activeAnalysisTab === 'center' ? (
              costByCenter.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-bold">لا تتوفر بيانات للتحليل المالي</p>
              ) : (
                costByCenter.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-700">{item.name}</span>
                      <NumberDisplay value={item.cost} className="font-bold text-slate-500" unit="ج.م" />
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(item.cost / maxCenterCost) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )
            ) : (
              costByType.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 font-bold">لا تتوفر بيانات للتحليل المالي</p>
              ) : (
                costByType.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-slate-700">{item.name}</span>
                      <NumberDisplay value={item.cost} className="font-bold text-slate-500" unit="ج.م" />
                    </div>
                    <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(item.cost / maxTypeCost) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </Card>

        {/* Detailed Orders Table (Col 2-3) */}
        <Card className="border-none shadow-xl shadow-slate-100/50 rounded-3xl bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="p-6 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-800">أوامر الصيانة المسجلة</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400">سجل عمليات الصيانة والسن المجدولة والمنفذة</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-right font-black text-slate-800">تاريخ الإرسال</TableHead>
                    <TableHead className="text-right font-black text-slate-800">المعدة / السلاح</TableHead>
                    <TableHead className="text-right font-black text-slate-800">المركز المستفيد</TableHead>
                    <TableHead className="text-right font-black text-slate-800">جهة الصيانة</TableHead>
                    <TableHead className="text-right font-black text-slate-800">العودة المتوقعة</TableHead>
                    <TableHead className="text-right font-black text-slate-800">الحالة</TableHead>
                    <TableHead className="text-right font-black text-slate-800">التكلفة</TableHead>
                    <TableHead className="text-center font-black text-slate-800">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold">لا توجد أوامر صيانة حالياً</TableCell>
                    </TableRow>
                  ) : (
                    [...records]
                      .sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime())
                      .map(record => {
                        const isOverdue = record.status === 'جاري الصيانة' && record.expectedReturnDate && record.expectedReturnDate < todayStr;
                        return (
                          <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold text-slate-500 text-xs">{record.sendDate}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl ${
                                  record.type.includes('صواني') ? 'bg-amber-50 text-amber-600' :
                                  record.type.includes('صفايح') ? 'bg-orange-50 text-orange-600' :
                                  'bg-indigo-50 text-indigo-600'
                                }`}>
                                  {record.type.includes('صواني') || record.type.includes('صفايح') ? <PenTool size={16} /> : <Wrench size={16} />}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-sm">{record.itemName}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{record.type}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-black text-slate-700 text-xs">{getCostCenterName(record.costCenterId)}</TableCell>
                            <TableCell className="font-bold text-slate-600 text-xs">{record.externalCenterName}</TableCell>
                            <TableCell className="font-mono text-slate-500 text-xs" dir="ltr">{record.expectedReturnDate}</TableCell>
                            <TableCell>
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse border border-rose-100">
                                  <AlertTriangle size={12} />
                                  متأخرة ⚠️
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${
                                  record.status === 'جاري الصيانة' 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {record.status}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-slate-950 text-xs">
                              <NumberDisplay value={record.cost} unit="ج.م" />
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                {record.status === 'جاري الصيانة' && (
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleComplete(record)} 
                                    className="text-emerald-600 hover:bg-emerald-50 w-8 h-8 p-0 rounded-lg"
                                    title="تأكيد العودة واستلام المعدة"
                                  >
                                    <CheckCircle size={18} />
                                  </Button>
                                )}
                                {(profile?.isAdmin || profile?.permissions?.canDelete) && (
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => handleDelete(record)} 
                                    className="text-rose-600 hover:bg-rose-50 w-8 h-8 p-0 rounded-lg"
                                    title="حذف"
                                  >
                                    <Trash2 size={18} />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Maintenance Order Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-8 border-none shadow-2xl" dir="rtl">
          <DialogHeader dir="rtl">
            <DialogTitle className="text-2xl font-black text-slate-900">إطلاق أمر صيانة خارجية جديد</DialogTitle>
            <CardDescription className="font-bold text-xs mt-1 text-slate-400">إرسال المعدات والأقلام والأسلحة للورش المتخصصة في مصر الجديدة أو دمياط للسن والتجديد</CardDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-right">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">نوع الصيانة</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as MaintenanceOrder['type'] })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              >
                <option value="معدة/ماكينة">معدة أو ماكينة</option>
                <option value="سن صواني">سن صواني</option>
                <option value="سن صفايح">سن صفايح</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">اسم المعدة / السلاح / الصينية</label>
              <input
                type="text"
                value={formData.itemName}
                onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 text-right"
                placeholder="مثال: مسدس رش، صينية قطعية 40 سم"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">مركز التكلفة (القسم المستفيد)</label>
              <select
                value={formData.costCenterId}
                onChange={e => setFormData({ ...formData, costCenterId: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              >
                {costCenters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">تاريخ الاستلام من القسم</label>
              <input
                type="date"
                value={formData.receiveDate}
                onChange={e => setFormData({ ...formData, receiveDate: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">ورشة الصيانة الخارجية</label>
              <input
                type="text"
                value={formData.externalCenterName}
                onChange={e => setFormData({ ...formData, externalCenterName: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 text-right"
                placeholder="ورشة السن أو توكيل الماكينة..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">تاريخ الإرسال الفعلي</label>
              <input
                type="date"
                value={formData.sendDate}
                onChange={e => setFormData({ ...formData, sendDate: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">تاريخ العودة المتوقع</label>
              <input
                type="date"
                value={formData.expectedReturnDate}
                onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600">التكلفة والرسوم المصاحبة (ج.م)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-slate-600">الخزنة / الحساب الصادر منه التكلفة</label>
              <select
                value={formData.safeId}
                onChange={e => setFormData({ ...formData, safeId: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              >
                <option value="">-- لا يوجد تكلفة نقدية حالية --</option>
                {safes.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.balance.toLocaleString()} ج.م)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-slate-600">تفاصيل العطل أو ملاحظات إضافية</label>
              <input
                type="text"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 text-right"
                placeholder="أكتب حالة العطل الفني..."
              />
            </div>
          </div>
          <DialogFooter className="mt-8 flex gap-3 flex-row justify-end" dir="rtl">
            <Button onClick={() => setShowAdd(false)} variant="ghost" className="h-12 px-6 rounded-xl font-bold">إلغاء</Button>
            <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-primary/20">حفظ وحجز المبلغ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
