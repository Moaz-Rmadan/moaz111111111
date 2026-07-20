import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { format, differenceInDays } from 'date-fns';
import { 
  Plus, Trash2, Calendar, Coins, Users, CreditCard, Clock, FileText, 
  CheckCircle2, TrendingUp, Filter, AlertCircle, Phone, ArrowDownLeft, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ByproductSale, Safe, UserProfile } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface ByproductSalesViewProps {
  safes: Safe[];
  profile: UserProfile | null;
}

export function ByproductSalesView({ safes, profile }: ByproductSalesViewProps) {
  const [sales, setSales] = useState<ByproductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Filters state
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const safeOptions = useMemo(() => {
    return safes.map(s => ({
      id: s.id,
      name: s.name,
      subtext: `رصيد: ${s.balance.toLocaleString()} ج.م`
    }));
  }, [safes]);

  // Collect installment transaction state
  const [collectionSafeIds, setCollectionSafeIds] = useState<{ [key: string]: string }>({});

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [materialType, setMaterialType] = useState<ByproductSale['materialType']>('نشارة');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('طن');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [safeId, setSafeId] = useState('');
  const [notes, setNotes] = useState('');

  // Form - Installment planner
  const [installments, setInstallments] = useState<{ dueDate: string; amount: number }[]>([]);
  const [quickInstallmentsCount, setQuickInstallmentsCount] = useState<number>(1);
  const [quickInterval, setQuickInterval] = useState<'weekly' | 'monthly'>('weekly');

  // Load Sales Data
  useEffect(() => {
    if (!profile) {
      return;
    }
    
    const hasAccess = profile.isAdmin || profile.permissions.finance || profile.permissions.reports;
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'byproductSales'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ByproductSale));
      setSales(list.sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    }, error => {
      console.error("Error loading byproduct sales:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile]);

  const totalAmountCalculated = useMemo(() => {
    return Number((quantity * unitPrice).toFixed(2));
  }, [quantity, unitPrice]);

  const remainingAmountCalculated = useMemo(() => {
    return Math.max(0, Number((totalAmountCalculated - paidAmount).toFixed(2)));
  }, [totalAmountCalculated, paidAmount]);

  // Helper to auto-generate installments equally
  const handleGenerateEqualInstallments = () => {
    const rem = remainingAmountCalculated;
    if (rem <= 0) return;
    const count = Number(quickInstallmentsCount) || 1;
    const part = Number((rem / count).toFixed(2));
    const list = [];
    
    let currentDate = new Date();
    for (let i = 0; i < count; i++) {
      if (quickInterval === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Handle floating point correction for last installment
      const installmentAmount = (i === count - 1) ? Number((rem - part * (count - 1)).toFixed(2)) : part;

      list.push({
        dueDate: format(currentDate, 'yyyy-MM-dd'),
        amount: installmentAmount
      });
    }
    setInstallments(list);
  };

  const handleAddInstallmentRow = () => {
    setInstallments([
      ...installments,
      { dueDate: format(new Date(), 'yyyy-MM-dd'), amount: 0 }
    ]);
  };

  const handleRemoveInstallmentRow = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleInstallmentChange = (index: number, field: 'dueDate' | 'amount', value: any) => {
    const updated = [...installments];
    if (field === 'amount') {
      updated[index].amount = Number(value) || 0;
    } else {
      updated[index].dueDate = value;
    }
    setInstallments(updated);
  };

  const totalInstallmentsPlanned = useMemo(() => {
    return installments.reduce((sum, inst) => sum + inst.amount, 0);
  }, [installments]);

  // Submit Handler
  const handleSaveSale = async () => {
    if (!customerName.trim()) {
      alert('يرجى إدخال اسم العميل');
      return;
    }
    if (quantity <= 0 || unitPrice <= 0) {
      alert('يرجى تحديد كمية وسعر وحدة صحيحين');
      return;
    }
    if (paidAmount < 0 || paidAmount > totalAmountCalculated) {
      alert('المبلغ المدفوع غير منطقي');
      return;
    }
    if (paidAmount > 0 && !safeId) {
      alert('يرجى اختيار الخزينة التي استلمت الدفعة المقدمة');
      return;
    }

    const rem = remainingAmountCalculated;
    if (rem > 0) {
      const plannedSum = Number(totalInstallmentsPlanned.toFixed(2));
      if (installments.length === 0) {
        alert('يرجى جدولة تواريخ استحقاق المبالغ المتبقية');
        return;
      }
      if (Math.abs(plannedSum - rem) > 0.05) {
        alert(`المجموع المجدول للدفعات (${plannedSum.toLocaleString()} ج.م) يجب أن يطابق تماماً المبلغ المتبقي الآجل (${rem.toLocaleString()} ج.م)`);
        return;
      }
    }

    try {
      const batch = writeBatch(db);
      const salesCollectionRef = collection(db, 'byproductSales');
      const newSaleRef = doc(salesCollectionRef);
      const saleId = newSaleRef.id;

      let paymentStatus: ByproductSale['paymentStatus'] = 'غير مسدد';
      if (paidAmount >= totalAmountCalculated) {
        paymentStatus = 'مسدد بالكامل';
      } else if (paidAmount > 0) {
        paymentStatus = 'مسدد جزئياً';
      }

      // Build scheduled payments structure
      const scheduledPayments = installments.map((inst, index) => ({
        id: `inst-${index}-${Date.now()}`,
        dueDate: inst.dueDate,
        amount: Number(inst.amount),
        status: 'pending' as const
      }));

      const saleData: ByproductSale = {
        id: saleId,
        customerName,
        customerPhone: customerPhone || undefined,
        date,
        materialType,
        quantity,
        unit,
        unitPrice,
        totalAmount: totalAmountCalculated,
        paidAmount,
        remainingAmount: rem,
        paymentStatus,
        notes: notes || undefined,
        safeId: paidAmount > 0 ? safeId : undefined,
        scheduledPayments: rem > 0 ? scheduledPayments : undefined
      };

      // Add byproduct sale record
      batch.set(newSaleRef, saleData);

      // Add financial transaction if paidAmount > 0
      if (paidAmount > 0) {
        const txRef = doc(collection(db, 'safeTransactions'));
        
        // Match standard category naming
        const categoryName = materialType === 'نشارة' ? 'مبيعات نشارة' : 
                             materialType === 'كسر خشب' ? 'خشب كسر' : 'مبيعات مخلفات';

        const txData = {
          safeId,
          date,
          type: 'مبيعات' as const,
          category: categoryName,
          amount: paidAmount,
          description: `مبيعات ${materialType} للعميل: ${customerName} (دفعة مقدمة) - كمية ${quantity} ${unit}`,
          relatedId: saleId,
          createdBy: profile?.name || 'مستلم'
        };

        batch.set(txRef, txData);

        // Update safe balance
        batch.update(doc(db, 'safes', safeId), {
          balance: increment(paidAmount)
        });
      }

      await batch.commit();

      // Reset Form
      setCustomerName('');
      setCustomerPhone('');
      setMaterialType('نشارة');
      setQuantity(0);
      setUnitPrice(0);
      setPaidAmount(0);
      setSafeId('');
      setNotes('');
      setInstallments([]);
      setShowAddForm(false);
      
      alert('تم تسجيل عملية البيع والتحصيل بنجاح!');
    } catch (error) {
      console.error("Error saving byproduct sale:", error);
      alert('حدث خطأ أثناء حفظ البيانات: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    }
  };

  // Collect Installment handler
  const handleCollectInstallment = async (sale: ByproductSale, installmentId: string) => {
    const selectedSafeId = collectionSafeIds[installmentId];
    if (!selectedSafeId) {
      alert('يرجى اختيار الخزينة لاستلام المبلغ قبل التحصيل');
      return;
    }

    const instIndex = sale.scheduledPayments?.findIndex(p => p.id === installmentId);
    if (instIndex === undefined || instIndex === -1) return;

    const installment = sale.scheduledPayments![instIndex];

    try {
      const batch = writeBatch(db);
      const safeTransactionsRef = collection(db, 'safeTransactions');
      const newTxRef = doc(safeTransactionsRef);

      const updatedPayments = [...(sale.scheduledPayments || [])];
      updatedPayments[instIndex] = {
        ...installment,
        status: 'collected',
        collectedDate: format(new Date(), 'yyyy-MM-dd'),
        collectedSafeId: selectedSafeId,
        safeTransactionId: newTxRef.id
      };

      const newPaidAmount = Number((sale.paidAmount + installment.amount).toFixed(2));
      const newRemainingAmount = Math.max(0, Number((sale.totalAmount - newPaidAmount).toFixed(2)));
      let newPaymentStatus: ByproductSale['paymentStatus'] = 'مسدد جزئياً';
      if (newRemainingAmount <= 0.05) {
        newPaymentStatus = 'مسدد بالكامل';
      }

      // Update sale
      batch.update(doc(db, 'byproductSales', sale.id), {
        scheduledPayments: updatedPayments,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      });

      // Safe transaction categories
      const categoryName = sale.materialType === 'نشارة' ? 'مبيعات نشارة' : 
                           sale.materialType === 'كسر خشب' ? 'خشب كسر' : 'مبيعات مخلفات';

      // Create transaction
      const txData = {
        safeId: selectedSafeId,
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'مبيعات' as const,
        category: categoryName,
        amount: installment.amount,
        description: `تحصيل دفعة مبيعات ${sale.materialType} للعميل: ${sale.customerName} - تاريخ الاستحقاق الأصلي ${installment.dueDate}`,
        relatedId: sale.id,
        createdBy: profile?.name || 'مستلم'
      };

      batch.set(newTxRef, txData);

      // Increment Safe
      batch.update(doc(db, 'safes', selectedSafeId), {
        balance: increment(installment.amount)
      });

      await batch.commit();
      alert('تم تحصيل الدفعة بنجاح وإثباتها في الخزينة والقيود المالية للشركة!');
    } catch (error) {
      console.error("Error collecting installment:", error);
      alert('حدث خطأ أثناء التحصيل: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    }
  };

  const handleDeleteSale = async (sale: ByproductSale) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟ عملية الحذف ستزيل السجل من كشف مبيعات الخردة ولكنها لن تعدل الحركات المالية التي تم ترحيلها للخزن مسبقاً لضمان سلامة الأرصدة التراكمية.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'byproductSales', sale.id));
      alert('تم حذف السجل بنجاح.');
    } catch (err) {
      console.error(err);
      alert('فشل عملية الحذف.');
    }
  };

  // KPIs calculations
  const totalSalesValue = useMemo(() => sales.reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const totalCollectedValue = useMemo(() => sales.reduce((sum, s) => sum + s.paidAmount, 0), [sales]);
  const totalRemainingValue = useMemo(() => sales.reduce((sum, s) => sum + s.remainingAmount, 0), [sales]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const overdueValue = useMemo(() => {
    return sales.reduce((sum, s) => {
      const saleOverdue = s.scheduledPayments?.filter(
        p => p.status === 'pending' && p.dueDate < todayStr
      ).reduce((pSum, p) => pSum + p.amount, 0) || 0;
      return sum + saleOverdue;
    }, 0);
  }, [sales, todayStr]);

  // Filter logic
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchMaterial = filterMaterial === 'all' || s.materialType === filterMaterial;
      const matchStatus = filterStatus === 'all' || s.paymentStatus === filterStatus;
      const matchSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.customerPhone && s.customerPhone.includes(searchTerm)) || 
                          (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchMaterial && matchStatus && matchSearch;
    });
  }, [sales, filterMaterial, filterStatus, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Intro and Control Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">مبيعات الخردة والمخلفات الصناعية</h2>
          <p className="text-slate-500 font-medium text-sm mt-0.5">تحصيل فوري وجدولة آجلة لبيع مخلفات المصنع (نشارة، كسر خشب، حديد خردة)</p>
        </div>
        
        <Button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setInstallments([]);
          }} 
          className="rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/20 h-11 px-6 hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus size={18} />
          {showAddForm ? 'إغلاق النموذج' : 'تسجيل عملية بيع جديدة'}
        </Button>
      </div>

      {/* KPI Cards Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="pt-6 relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">إجمالي قيمة المبيعات</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{totalSalesValue.toLocaleString()} <small className="text-xs">ج.م</small></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="pt-6 relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">إجمالي المبالغ المحصلة</p>
              <h3 className="text-xl font-black text-emerald-600 mt-1">{totalCollectedValue.toLocaleString()} <small className="text-xs">ج.م</small></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="pt-6 relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">إجمالي مستحقات العملاء (الآجل)</p>
              <h3 className="text-xl font-black text-indigo-600 mt-1">{totalRemainingValue.toLocaleString()} <small className="text-xs">ج.م</small></h3>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-xl shadow-slate-200/50 relative overflow-hidden group ${overdueValue > 0 ? 'bg-red-50/50 border border-red-100' : ''}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="pt-6 relative z-10 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${overdueValue > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertCircle size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">مستحقات متأخرة الدفع</p>
              <h3 className={`text-xl font-black mt-1 ${overdueValue > 0 ? 'text-red-600' : 'text-slate-600'}`}>{overdueValue.toLocaleString()} <small className="text-xs">ج.م</small></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Scrap Sale Form */}
      {showAddForm && (
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Coins className="text-primary" size={20} />
              تسجيل فاتورة بيع ومستحقات خردة / مواد فرعية
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Buyer Name */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">اسم المشتري / العميل <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Users className="absolute right-3 top-3 text-slate-400" size={16} />
                  <Input 
                    placeholder="اسم الشخص أو الشركة المشترية" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="h-11 pr-10 rounded-xl font-bold bg-slate-50 border-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Buyer Phone */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">رقم الهاتف (اختياري)</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 text-slate-400" size={16} />
                  <Input 
                    placeholder="رقم للتواصل وتتبع الدفعات" 
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="h-11 pr-10 rounded-xl font-bold bg-slate-50 border-none focus:bg-white text-right"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">تاريخ العملية <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-3 text-slate-400" size={16} />
                  <Input 
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-11 pr-10 rounded-xl font-bold bg-slate-50 border-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Material Type */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">نوع المادة المباعة <span className="text-red-500">*</span></label>
                <select 
                  value={materialType}
                  onChange={e => setMaterialType(e.target.value as ByproductSale['materialType'])}
                  className="w-full h-11 px-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-1 focus:ring-primary focus:bg-white"
                >
                  <option value="نشارة">نشارة (خشبية)</option>
                  <option value="كسر خشب">كسر خشب / فضلات</option>
                  <option value="خردة حديد">خردة حديد ومعادن</option>
                  <option value="مخلفات عامة">مخلفات مصنع عامة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">الكمية المباعة <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  step="any"
                  placeholder="الكمية" 
                  value={quantity || ''}
                  onChange={e => setQuantity(Math.max(0, Number(e.target.value)))}
                  className="h-11 rounded-xl font-bold bg-slate-50 border-none focus:bg-white text-left"
                />
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">الوحدة <span className="text-red-500">*</span></label>
                <Input 
                  placeholder="الوحدة (مثل: طن، شيكارة، سيارة، كيلو)" 
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="h-11 rounded-xl font-bold bg-slate-50 border-none focus:bg-white"
                />
              </div>

              {/* Unit Price */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">سعر الوحدة (ج.م) <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  step="any"
                  placeholder="سعر الوحدة" 
                  value={unitPrice || ''}
                  onChange={e => setUnitPrice(Math.max(0, Number(e.target.value)))}
                  className="h-11 rounded-xl font-bold bg-slate-50 border-none focus:bg-white text-left"
                />
              </div>

              {/* Paid Amount */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 block">المبلغ المدفوع فوراً (مقدم) <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  step="any"
                  placeholder="مثال: 0 للآجل بالكامل" 
                  value={paidAmount || ''}
                  onChange={e => setPaidAmount(Math.max(0, Number(e.target.value)))}
                  className="h-11 rounded-xl font-bold bg-slate-50 border-none focus:bg-white text-left"
                />
              </div>

              {/* Safe selection (only visible if paidAmount > 0) */}
              <div className={`space-y-2 transition-all duration-300 ${paidAmount > 0 ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
                <label className="text-xs font-black text-slate-500 block">الخزينة المستلمة للمقدم</label>
                <SearchableSelect 
                  options={safeOptions}
                  selectedValue={safeId}
                  onChange={setSafeId}
                  disabled={paidAmount === 0}
                  placeholder="اختر الخزينة..."
                />
              </div>

            </div>

            {/* Live Calculation Info Box */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/20 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-around items-center text-center gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400">إجمالي القيمة الفاتورة</span>
                <p className="text-2xl font-black text-slate-800 mt-1">{totalAmountCalculated.toLocaleString()} <span className="text-xs">ج.م</span></p>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden md:block" />
              <div>
                <span className="text-xs font-bold text-slate-400">الدفعة النقدية المستلمة</span>
                <p className="text-2xl font-black text-emerald-600 mt-1">{paidAmount.toLocaleString()} <span className="text-xs">ج.م</span></p>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden md:block" />
              <div>
                <span className="text-xs font-bold text-indigo-500">المتبقي الآجل (للجدولة)</span>
                <p className="text-2xl font-black text-indigo-700 mt-1">{remainingAmountCalculated.toLocaleString()} <span className="text-xs">ج.م</span></p>
              </div>
            </div>

            {/* Installment Scheduler Section (Only visible if remainingAmount > 0) */}
            {remainingAmountCalculated > 0 && (
              <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-slate-800 text-sm flex items-center gap-1">
                      <Clock size={16} className="text-indigo-600" />
                      مخطط وجدول التحصيلات المستقبلية (تواريخ معينة)
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">جدول الدفعات القادمة المستحقة على العميل وتواريخ سدادها</p>
                  </div>

                  {/* Auto Generator Tool */}
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 px-2">تقسيم تلقائي:</span>
                    <select 
                      value={quickInstallmentsCount}
                      onChange={e => setQuickInstallmentsCount(Number(e.target.value))}
                      className="h-8 px-1.5 bg-slate-50 rounded font-bold text-xs border-none"
                    >
                      <option value={1}>دفعة واحدة</option>
                      <option value={2}>دفعتين</option>
                      <option value={3}>3 دفعات</option>
                      <option value={4}>4 دفعات</option>
                      <option value={6}>6 دفعات</option>
                    </select>
                    <select 
                      value={quickInterval}
                      onChange={e => setQuickInterval(e.target.value as 'weekly' | 'monthly')}
                      className="h-8 px-1.5 bg-slate-50 rounded font-bold text-xs border-none"
                    >
                      <option value="weekly">أسبوعياً</option>
                      <option value="monthly">شهرياً</option>
                    </select>
                    <Button 
                      onClick={handleGenerateEqualInstallments}
                      type="button"
                      variant="outline"
                      className="h-8 text-xs font-black border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      توزيع
                    </Button>
                  </div>
                </div>

                {/* Installment List Inputs */}
                {installments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1">
                    {installments.map((inst, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative space-y-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">الدفعة {idx + 1}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveInstallmentRow(idx)}
                            className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 block">تاريخ الاستحقاق</label>
                            <Input 
                              type="date" 
                              value={inst.dueDate}
                              onChange={e => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                              className="h-9 px-2 font-bold text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 block">مبلغ الدفعة (ج.م)</label>
                            <Input 
                              type="number" 
                              value={inst.amount || ''}
                              onChange={e => handleInstallmentChange(idx, 'amount', e.target.value)}
                              className="h-9 px-2 font-black text-xs text-left"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white flex flex-col items-center justify-center">
                    <p className="text-xs font-black">لم يتم تخطيط أي دفعات آجلة بعد.</p>
                    <p className="text-[10px] text-slate-400 mt-1">يرجى الضغط على زر التوزيع التلقائي أو إضافة دفعات يدوياً.</p>
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={handleAddInstallmentRow}
                      className="text-xs font-black text-primary mt-2 flex items-center gap-1"
                    >
                      <Plus size={12} /> إضافة دفعة يدوية
                    </Button>
                  </div>
                )}

                {installments.length > 0 && (
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-xs font-bold">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddInstallmentRow}
                      className="h-8 text-xs font-black text-slate-600"
                    >
                      <Plus size={14} className="ml-1" /> إضافة دفعة إضافية
                    </Button>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400">إجمالي المجدول: <strong className="text-slate-700 font-black">{totalInstallmentsPlanned.toLocaleString()} ج.م</strong></span>
                      <span className="w-px h-4 bg-slate-200" />
                      <span>حالة الموازنة: {Math.abs(totalInstallmentsPlanned - remainingAmountCalculated) < 0.05 ? (
                        <span className="text-emerald-600 font-black flex items-center gap-0.5"><Check size={12} /> مضبوط ومتطابق</span>
                      ) : (
                        <span className="text-red-500 font-black">غير متطابق مع {remainingAmountCalculated.toLocaleString()} ج.م</span>
                      )}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 block">ملاحظات إضافية</label>
              <Input 
                placeholder="أية ملاحظات حول العقد، جودة المواد، أو شروط السداد" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-11 rounded-xl font-bold bg-slate-50 border-none focus:bg-white"
              />
            </div>

            {/* Buttons Row */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button 
                variant="ghost"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl font-bold text-slate-500 hover:bg-slate-100"
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleSaveSale}
                className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
              >
                حفظ وتسجيل الفاتورة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Filter and Records View */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
        
        {/* Table Filters Header */}
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-5">
          <CardTitle className="font-black text-lg flex items-center gap-2 text-slate-800">
            <FileText size={18} className="text-slate-500" />
            سجل مبيعات المواد الثانوية وجدولة التحصيل
          </CardTitle>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Customer */}
            <Input 
              placeholder="بحث باسم العميل، الملاحظات..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 w-48 text-xs font-bold bg-white"
            />

            {/* Material Filter */}
            <select 
              value={filterMaterial}
              onChange={e => setFilterMaterial(e.target.value)}
              className="h-9 px-2 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل المواد</option>
              <option value="نشارة">نشارة</option>
              <option value="كسر خشب">كسر خشب</option>
              <option value="خردة حديد">خردة حديد</option>
              <option value="مخلفات عامة">مخلفات عامة</option>
              <option value="أخرى">أخرى</option>
            </select>

            {/* Status Filter */}
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-2 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل حالات الدفع</option>
              <option value="مسدد بالكامل">مسدد بالكامل</option>
              <option value="مسدد جزئياً">مسدد جزئياً</option>
              <option value="غير مسدد">غير مسدد</option>
            </select>
          </div>
        </CardHeader>

        {/* Sales Table */}
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold">جاري تحميل كشوف المبيعات...</div>
          ) : filteredSales.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center justify-center">
              <AlertCircle size={40} className="text-slate-300 mb-2" />
              لا توجد عمليات مبيعات مطابقة لمعايير البحث والفرز
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-6"></TableHead>
                  <TableHead className="text-right font-black">التاريخ</TableHead>
                  <TableHead className="text-right font-black">العميل</TableHead>
                  <TableHead className="text-right font-black">المادة المباعة</TableHead>
                  <TableHead className="text-right font-black">الكمية</TableHead>
                  <TableHead className="text-right font-black">سعر الوحدة</TableHead>
                  <TableHead className="text-right font-black">الإجمالي</TableHead>
                  <TableHead className="text-right font-black">المحصل / المتبقي</TableHead>
                  <TableHead className="text-right font-black">حالة السداد</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map(sale => {
                  const isExpanded = expandedSaleId === sale.id;
                  return (
                    <React.Fragment key={sale.id}>
                      <TableRow className={`group cursor-pointer border-slate-50 hover:bg-slate-50/40 transition-colors ${isExpanded ? 'bg-blue-50/10' : ''}`}>
                        
                        {/* Expand Button */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                          {sale.scheduledPayments && sale.scheduledPayments.length > 0 ? (
                            isExpanded ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-slate-400" />
                          ) : null}
                        </TableCell>

                        {/* Date */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)} className="font-bold text-slate-500">{sale.date}</TableCell>
                        
                        {/* Customer */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800">{sale.customerName}</span>
                            {sale.customerPhone && (
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5 mt-0.5">
                                <Phone size={10} /> {sale.customerPhone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Material */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                          <Badge variant="secondary" className={`font-bold tracking-tight text-xs ${
                            sale.materialType === 'نشارة' ? 'bg-amber-100 text-amber-800' :
                            sale.materialType === 'كسر خشب' ? 'bg-orange-100 text-orange-800' :
                            sale.materialType === 'خردة حديد' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {sale.materialType}
                          </Badge>
                        </TableCell>

                        {/* Quantity */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)} className="font-bold text-slate-600">{sale.quantity.toLocaleString()} {sale.unit}</TableCell>
                        
                        {/* Unit Price */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)} className="font-bold text-slate-600">{sale.unitPrice.toLocaleString()} ج.م</TableCell>
                        
                        {/* Total Amount */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)} className="font-black text-slate-900 text-base">{sale.totalAmount.toLocaleString()} ج.م</TableCell>
                        
                        {/* Paid / Remaining */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-emerald-600">محصل: {sale.paidAmount.toLocaleString()}</span>
                            <span className="text-xs font-black text-indigo-600">متبقي: {sale.remainingAmount.toLocaleString()}</span>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                          <Badge className={`font-black text-[11px] ${
                            sale.paymentStatus === 'مسدد بالكامل' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                            sale.paymentStatus === 'مسدد جزئياً' ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100' : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }`}>
                            {sale.paymentStatus}
                          </Badge>
                          {sale.notes && (
                            <p className="text-[10px] text-slate-400 font-bold max-w-[150px] truncate mt-1" title={sale.notes}>{sale.notes}</p>
                          )}
                        </TableCell>

                        {/* Delete Row */}
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteSale(sale)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Installments Drawer / Subtable */}
                      {isExpanded && sale.scheduledPayments && sale.scheduledPayments.length > 0 && (
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                          <TableCell colSpan={10} className="p-6">
                            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-inner space-y-4">
                              <div className="flex items-center justify-between">
                                <h5 className="font-black text-slate-800 text-xs flex items-center gap-1">
                                  <Clock size={14} className="text-indigo-600" />
                                  جدول تتبع دفعات العميل ({sale.customerName}) المستحقة:
                                </h5>
                                <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-100 bg-indigo-50/30">
                                  {sale.scheduledPayments.filter(p => p.status === 'collected').length} من {sale.scheduledPayments.length} دفعات محصلة
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sale.scheduledPayments.map((payment) => {
                                  const isCollected = payment.status === 'collected';
                                  const isOverdue = !isCollected && payment.dueDate < todayStr;
                                  const daysDiff = differenceInDays(new Date(payment.dueDate), new Date(todayStr));

                                  return (
                                    <div 
                                      key={payment.id} 
                                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-sm transition-all ${
                                        isCollected ? 'border-emerald-100 bg-emerald-50/10' : 
                                        isOverdue ? 'border-red-100 bg-red-50/20' : 'border-slate-100 bg-slate-50/50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Calendar size={14} className="text-slate-400" />
                                          <span className="text-xs font-black text-slate-700">{payment.dueDate}</span>
                                        </div>
                                        <Badge className={`font-bold text-[10px] ${
                                          isCollected ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                                          isOverdue ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                                        }`}>
                                          {isCollected ? 'تم تحصيلها' : isOverdue ? 'متأخرة' : 'قيد الانتظار'}
                                        </Badge>
                                      </div>

                                      <div className="flex items-baseline justify-between">
                                        <span className="text-slate-400 text-[10px] font-bold">مبلغ الدفعة:</span>
                                        <span className="text-lg font-black text-slate-800">{payment.amount.toLocaleString()} <small className="text-xs">ج.م</small></span>
                                      </div>

                                      {/* Status Detail & Actions */}
                                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                                        {isCollected ? (
                                          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                            <CheckCircle2 size={12} />
                                            تم التحصيل بتاريخ {payment.collectedDate} على خزنة: {safes.find(s => s.id === payment.collectedSafeId)?.name || 'غير معروف'}
                                          </div>
                                        ) : (
                                          <>
                                            {/* Overdue/Days indicator */}
                                            <div className="text-[10px] font-bold">
                                              {isOverdue ? (
                                                <span className="text-red-500 animate-pulse">متأخرة السداد بـ {Math.abs(daysDiff)} يوم!</span>
                                              ) : (
                                                <span className="text-slate-400">متبقي {daysDiff} يوم على تاريخ الاستحقاق</span>
                                              )}
                                            </div>

                                            {/* Safe Selector & Collect Button */}
                                            <div className="flex gap-1.5 mt-1">
                                              <select 
                                                value={collectionSafeIds[payment.id] || ''}
                                                onChange={e => setCollectionSafeIds({
                                                  ...collectionSafeIds,
                                                  [payment.id]: e.target.value
                                                })}
                                                className="h-8 flex-1 px-1.5 bg-white border border-slate-200 rounded font-bold text-[10px] focus:ring-1 focus:ring-primary"
                                              >
                                                <option value="">حدد الخزينة المستلمة...</option>
                                                {safes.map(s => (
                                                  <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                              </select>
                                              
                                              <Button 
                                                onClick={() => handleCollectInstallment(sale, payment.id)}
                                                size="sm"
                                                className="h-8 font-black text-xs bg-emerald-600 text-white rounded-lg px-3 hover:bg-emerald-700 shadow-sm"
                                              >
                                                تحصيل الآن
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
