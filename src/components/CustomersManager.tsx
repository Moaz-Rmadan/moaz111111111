import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SearchableSelect } from './SearchableSelect';
import { Customer, CustomerPayment, Safe, UserProfile, SalesOrder } from '../types';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  FileText,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Briefcase,
  LayoutGrid,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CustomersManagerProps {
  customers: Customer[];
  customerPayments: CustomerPayment[];
  safes: Safe[];
  salesOrders: SalesOrder[];
  profile: UserProfile | null;
}

export function CustomersManager({ customers, customerPayments, safes, salesOrders, profile }: CustomersManagerProps) {
  const customerOptions = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      name: c.name,
      subtext: c.balance > 0 ? `${c.balance.toLocaleString('ar-EG')} ج` : ''
    }));
  }, [customers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    type: 'أفراد',
    status: 'نشط',
    balance: 0,
    creditLimit: 0,
    taxId: '',
    notes: ''
  });

  const [paymentData, setPaymentData] = useState<Partial<CustomerPayment>>({
    customerId: '',
    amount: 0,
    paymentMethod: 'نقدي',
    safeId: safes[0]?.id || '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.phone.includes(searchTerm) ||
                           (c.taxId && c.taxId.includes(searchTerm));
      const matchesType = typeFilter === 'الكل' || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, typeFilter]);

  const totalDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const activeCount = customers.filter(c => c.status === 'نشط').length;

  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.phone) {
      alert('يرجى إدخال اسم العميل ورقم الهاتف على الأقل');
      return;
    }
    
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), {
          ...formData
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      resetFormData();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('حدث خطأ أثناء حفظ بيانات العميل');
    }
  };

  const handleSavePayment = async () => {
    if (!paymentData.customerId || !paymentData.amount || paymentData.amount <= 0) {
      alert('يرجى اختيار العميل وإدخال مبلغ صحيح');
      return;
    }
    
    try {
      const customer = customers.find(c => c.id === paymentData.customerId);
      if (!customer) return;

      const paymentRef = await addDoc(collection(db, 'customerPayments'), {
        ...paymentData,
        date: paymentData.date || new Date().toISOString().split('T')[0]
      });

      await updateDoc(doc(db, 'customers', customer.id), {
        balance: (customer.balance || 0) - (paymentData.amount || 0)
      });

      if (paymentData.safeId) {
        await addDoc(collection(db, 'safeTransactions'), {
          safeId: paymentData.safeId,
          date: paymentData.date,
          type: 'مبيعات',
          amount: paymentData.amount,
          description: `سداد من العميل: ${customer.name}${paymentData.notes ? ' - ' + paymentData.notes : ''}`,
          relatedId: paymentRef.id,
          category: 'إيرادات مبيعات',
          createdBy: profile?.name || 'Unknown'
        });

        const safe = safes.find(s => s.id === paymentData.safeId);
        if (safe) {
          await updateDoc(doc(db, 'safes', safe.id), {
            balance: (safe.balance || 0) + (paymentData.amount || 0)
          });
        }
      }

      setShowPaymentModal(false);
      setPaymentData({
        customerId: '',
        amount: 0,
        paymentMethod: 'نقدي',
        safeId: safes[0]?.id || '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      type: 'أفراد',
      status: 'نشط',
      balance: 0,
      creditLimit: 0,
      taxId: '',
      notes: ''
    });
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">العملاء والشركات</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">إدارة جهات الاتصال والمستحقات المالية</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={() => setShowPaymentModal(true)} variant="outline" className="flex-1 md:flex-none font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 h-11 rounded-xl shadow-sm">
            <CreditCard size={18} className="ml-2" />
            تحصيل دفعة
          </Button>
          <Button onClick={() => { resetFormData(); setEditingCustomer(null); setShowAddModal(true); }} className="flex-1 md:flex-none font-bold h-11 rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700">
            <Plus size={18} className="ml-2" />
            عميل جديد
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "إجمالي العملاء", value: customers.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
          { title: "عملاء نشطين", value: activeCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { title: "إجمالي المديونيات لنا", value: `${totalDebt.toLocaleString('ar-EG')} ج.م`, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          { title: "أرصدة دائنة (مقدمة)", value: `${totalCredit.toLocaleString('ar-EG')} ج.م`, icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" }
        ].map((stat, i) => (
          <Card key={i} className={cn("border shadow-sm rounded-2xl overflow-hidden", stat.border)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">{stat.title}</p>
                <h3 className="text-xl font-black text-slate-800">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-2 items-center justify-between">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar p-1">
          {['الكل', 'أفراد', 'شركات', 'مقاولين', 'تجار', 'مهندسين ديكور'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all",
                typeFilter === type 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto px-1">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="بحث بالاسم، الجوال..."
              className="pl-4 pr-10 bg-slate-50 border-transparent focus:bg-white transition-colors rounded-xl h-10 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-colors", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-2 rounded-lg transition-colors", viewMode === 'table' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
            <Users size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">لا توجد نتائج</h3>
          <p className="text-sm font-bold text-slate-500">جرب البحث بكلمات مختلفة أو أضف عميلاً جديداً.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredCustomers.map(customer => (
              <motion.div
                key={customer.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group cursor-pointer" onClick={() => setViewingCustomer(customer)}>
                  <div className="h-16 bg-gradient-to-br from-slate-50 to-slate-100 relative">
                    <div className="absolute -bottom-6 right-4 w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-indigo-600 text-lg">
                      {customer.name.substring(0, 1)}
                    </div>
                    <Badge variant="outline" className={cn(
                      "absolute top-4 left-4 font-bold border-0 text-[10px]",
                      customer.status === 'نشط' ? 'bg-emerald-100 text-emerald-700' :
                      customer.status === 'محظور' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                    )}>
                      {customer.status}
                    </Badge>
                  </div>
                  <CardContent className="pt-8 p-4">
                    <h3 className="font-black text-slate-800 text-lg mb-1 truncate">{customer.name}</h3>
                    <p className="text-xs font-bold text-slate-500 mb-4">{customer.type}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate" dir="ltr">{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                    </div>

                    <div className={cn(
                      "p-3 rounded-xl flex items-center justify-between",
                      customer.balance > 0 ? "bg-rose-50" : customer.balance < 0 ? "bg-emerald-50" : "bg-slate-50"
                    )}>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {customer.balance > 0 ? 'رصيد مدين' : customer.balance < 0 ? 'رصيد دائن' : 'مُصفى'}
                      </span>
                      <span className={cn(
                        "font-black text-sm",
                        customer.balance > 0 ? "text-rose-700" : customer.balance < 0 ? "text-emerald-700" : "text-slate-700"
                      )}>
                        {Math.abs(customer.balance).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 font-bold text-xs h-8 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setFormData(customer); setShowAddModal(true); }}
                      >
                        <Edit2 size={14} className="mr-1.5" />
                        تعديل
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 font-bold text-xs h-8 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}
                      >
                        <Trash2 size={14} className="mr-1.5" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-500 h-12 uppercase tracking-wider text-xs">العميل</TableHead>
                  <TableHead className="font-black text-slate-500 h-12 uppercase tracking-wider text-xs">التصنيف</TableHead>
                  <TableHead className="font-black text-slate-500 h-12 uppercase tracking-wider text-xs">التواصل</TableHead>
                  <TableHead className="font-black text-slate-500 h-12 uppercase tracking-wider text-xs">الرصيد المالي</TableHead>
                  <TableHead className="font-black text-slate-500 h-12 uppercase tracking-wider text-xs">الحالة</TableHead>
                  <TableHead className="font-black text-slate-500 h-12 uppercase tracking-wider text-xs text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow key={customer.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setViewingCustomer(customer)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                          {customer.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-black text-slate-800">{customer.name}</div>
                          {customer.taxId && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">س.ت: {customer.taxId}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold bg-white text-[10px]">
                        {customer.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm font-bold text-slate-600">
                        <div className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /><span dir="ltr">{customer.phone}</span></div>
                        {customer.email && <div className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /><span>{customer.email}</span></div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={cn("font-black text-sm", customer.balance > 0 ? 'text-rose-600' : customer.balance < 0 ? 'text-emerald-600' : 'text-slate-500')}>
                          {Math.abs(customer.balance).toLocaleString('ar-EG')} ج.م
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {customer.balance > 0 ? 'عليه (مدين)' : customer.balance < 0 ? 'له (دائن)' : 'مُصفى'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "font-bold border-0 text-[10px]",
                        customer.status === 'نشط' ? 'bg-emerald-100 text-emerald-700' :
                        customer.status === 'محظور' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                      )}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8 rounded-lg" onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setFormData(customer); setShowAddModal(true); }}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 rounded-lg" onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* View Customer Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border-none shadow-2xl rounded-3xl animate-in zoom-in-95 duration-200">
            <div className="h-24 bg-gradient-to-r from-indigo-600 to-indigo-800 relative flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewingCustomer(null)} 
                className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full"
              >
                <Plus size={24} className="rotate-45" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              <div className="px-8 pb-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-6 relative -top-12">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-md border-4 border-white flex items-center justify-center font-black text-indigo-600 text-4xl shrink-0">
                    {viewingCustomer.name.substring(0, 1)}
                  </div>
                  <div className="pt-14 md:pt-14 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-3xl font-black text-slate-800 mb-1">{viewingCustomer.name}</h2>
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                          <Badge variant="secondary" className="bg-white border-slate-200">{viewingCustomer.type}</Badge>
                          <span className="flex items-center gap-1"><Phone size={14}/> <span dir="ltr">{viewingCustomer.phone}</span></span>
                          {viewingCustomer.email && <span className="flex items-center gap-1"><Mail size={14}/> {viewingCustomer.email}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            setPaymentData(prev => ({...prev, customerId: viewingCustomer.id}));
                            setShowPaymentModal(true);
                          }} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                        >
                          <CreditCard size={16} className="ml-2" />
                          تحصيل دفعة
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setEditingCustomer(viewingCustomer);
                            setFormData(viewingCustomer);
                            setShowAddModal(true);
                            setViewingCustomer(null);
                          }}
                          className="rounded-xl font-bold"
                        >
                          <Edit2 size={16} className="ml-2" />
                          تعديل
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4 md:mt-0">
                  <div className={cn(
                    "p-6 rounded-3xl shadow-sm border",
                    viewingCustomer.balance > 0 ? "bg-rose-50/50 border-rose-100" : 
                    viewingCustomer.balance < 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-200"
                  )}>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      الرصيد المالي الحالي
                    </p>
                    <div className={cn(
                      "text-3xl font-black mb-1",
                      viewingCustomer.balance > 0 ? "text-rose-700" : 
                      viewingCustomer.balance < 0 ? "text-emerald-700" : "text-slate-800"
                    )}>
                      {Math.abs(viewingCustomer.balance).toLocaleString('ar-EG')} ج.م
                    </div>
                    <p className={cn(
                      "text-sm font-bold",
                      viewingCustomer.balance > 0 ? "text-rose-500" : 
                      viewingCustomer.balance < 0 ? "text-emerald-500" : "text-slate-400"
                    )}>
                      {viewingCustomer.balance > 0 ? 'عليه (مدين)' : viewingCustomer.balance < 0 ? 'له (دائن)' : 'مُصفى'}
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-3xl shadow-sm border bg-white border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-500" />
                      أوامر البيع والطلبيات
                    </p>
                    <div className="text-3xl font-black text-slate-800 mb-1">
                      {salesOrders.filter(o => o.customerName === viewingCustomer.name).length}
                    </div>
                    <p className="text-sm font-bold text-slate-400">طلبية مسجلة</p>
                  </div>

                  <div className="p-6 rounded-3xl shadow-sm border bg-white border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-500" />
                      إجمالي المدفوعات
                    </p>
                    <div className="text-3xl font-black text-slate-800 mb-1">
                      {customerPayments.filter(p => p.customerId === viewingCustomer.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString('ar-EG')}
                    </div>
                    <p className="text-sm font-bold text-slate-400">جنيهاً محصلاً</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Sales Orders Section */}
                  <div>
                    <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                      <Briefcase className="text-indigo-600" />
                      سجل الطلبيات
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">التاريخ</TableHead>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">الحالة</TableHead>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">إجمالي البيع</TableHead>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">التكلفة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesOrders.filter(o => o.customerName === viewingCustomer.name).length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center text-slate-400 font-bold py-8">لا توجد طلبيات مسجلة</TableCell></TableRow>
                          ) : (
                            salesOrders.filter(o => o.customerName === viewingCustomer.name).map(order => {
                              const totalSelling = order.items.reduce((s, i) => s + (i.sellingPrice || 0), 0);
                              const totalCost = order.items.reduce((s, i) => s + (i.cogs || 0) + (i.logisticsCost || 0), 0);
                              return (
                                <TableRow key={order.id}>
                                  <TableCell className="font-bold text-slate-600">{order.date}</TableCell>
                                  <TableCell><Badge variant="outline" className="font-bold">مسجل</Badge></TableCell>
                                  <TableCell className="font-black text-slate-800">{totalSelling.toLocaleString('ar-EG')} ج.م</TableCell>
                                  <TableCell className="font-bold text-slate-500">{totalCost.toLocaleString('ar-EG')} ج.م</TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Payments Section */}
                  <div>
                    <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                      <CreditCard className="text-emerald-600" />
                      سجل الدفعات
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">التاريخ</TableHead>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">المبلغ</TableHead>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">طريقة الدفع</TableHead>
                            <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider">ملاحظات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerPayments.filter(p => p.customerId === viewingCustomer.id).length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center text-slate-400 font-bold py-8">لا توجد مدفوعات مسجلة</TableCell></TableRow>
                          ) : (
                            customerPayments.filter(p => p.customerId === viewingCustomer.id).map(payment => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-bold text-slate-600">{payment.date}</TableCell>
                                <TableCell className="font-black text-emerald-600">{payment.amount.toLocaleString('ar-EG')} ج.م</TableCell>
                                <TableCell className="font-bold text-slate-600">{payment.paymentMethod} {payment.referenceNumber ? `(${payment.referenceNumber})` : ''}</TableCell>
                                <TableCell className="text-slate-500 font-medium text-sm">{payment.notes}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-none shadow-2xl rounded-3xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 px-6 shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-black text-slate-800">
                  {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة جهة اتصال جديدة'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="rounded-full hover:bg-slate-200">
                  <Plus size={20} className="rotate-45" />
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-y-auto p-6 bg-white flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">اسم العميل / الشركة <span className="text-rose-500">*</span></label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">رقم الجوال <span className="text-rose-500">*</span></label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">نوع العميل</label>
                  <select value={formData.type} onChange={(e: any) => setFormData({...formData, type: e.target.value})} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="أفراد">أفراد</option>
                    <option value="شركات">شركات</option>
                    <option value="مقاولين">مقاولين</option>
                    <option value="تجار">تجار</option>
                    <option value="مهندسين ديكور">مهندسين ديكور</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">الحالة</label>
                  <select value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="نشط">نشط</option>
                    <option value="محتمل">محتمل</option>
                    <option value="غير نشط">غير نشط</option>
                    <option value="محظور">محظور</option>
                  </select>
                </div>
                
                {!editingCustomer && (
                  <div className="space-y-2 md:col-span-2 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <label className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-2 block">الرصيد الافتتاحي (ج.م)</label>
                    <Input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} className="font-black text-lg bg-white border-indigo-200 rounded-xl h-12" dir="ltr" />
                    <p className="text-[10px] text-indigo-500 font-bold mt-2">رقم موجب = مديونية على العميل (عليه). رقم سالب = دفعة مقدمة لنا (له).</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">الحد الائتماني (أقصى مديونية)</label>
                  <Input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} className="font-bold bg-slate-50 rounded-xl h-11" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">السجل الضريبي</label>
                  <Input value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">البريد الإلكتروني</label>
                  <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">العنوان</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ملاحظات</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 p-4 shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowAddModal(false)} className="font-bold rounded-xl h-11">إلغاء</Button>
              <Button onClick={handleSaveCustomer} className="font-bold rounded-xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-md">حفظ البيانات</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-3xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4 px-6 flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black text-emerald-800 flex items-center gap-2">
                <CreditCard size={24} />
                سند قبض
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowPaymentModal(false)} className="rounded-full text-emerald-700 hover:bg-emerald-100">
                <Plus size={20} className="rotate-45" />
              </Button>
            </CardHeader>
            <div className="p-6 bg-white flex-1 overflow-y-auto">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">العميل</label>
                  <SearchableSelect
                    options={customerOptions}
                    selectedValue={paymentData.customerId}
                    onChange={(val) => {
                      const c = customers.find(x => x.id === val);
                      setPaymentData({...paymentData, customerId: val, amount: c && c.balance > 0 ? c.balance : 0});
                    }}
                    placeholder="اختر العميل..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">التاريخ</label>
                    <Input type="date" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">وسيلة الدفع</label>
                    <select value={paymentData.paymentMethod} onChange={(e: any) => setPaymentData({...paymentData, paymentMethod: e.target.value})} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="نقدي">نقدي</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="شيك">شيك</option>
                      <option value="فيزا">فيزا</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">الخزنة / الحساب البنكي</label>
                  <select value={paymentData.safeId} onChange={(e: any) => setPaymentData({...paymentData, safeId: e.target.value})} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {safes.map(safe => <option key={safe.id} value={safe.id}>{safe.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <label className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2 block">المبلغ المحصل (ج.م)</label>
                  <Input type="number" value={paymentData.amount || ''} onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} className="font-black text-2xl text-emerald-700 bg-white border-emerald-200 h-14 rounded-xl" dir="ltr" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">رقم المرجع (إن وجد)</label>
                  <Input value={paymentData.referenceNumber || ''} onChange={e => setPaymentData({...paymentData, referenceNumber: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" placeholder="رقم الشيك أو التحويل" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ملاحظات البيان</label>
                  <textarea value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="مثال: سداد دفعة مقدمة..." />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 p-4 shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPaymentModal(false)} className="font-bold rounded-xl h-11">إلغاء</Button>
              <Button onClick={handleSavePayment} className="font-bold rounded-xl h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">تأكيد السداد</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
