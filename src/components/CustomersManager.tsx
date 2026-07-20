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
  Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

      // Update customer balance (subtracting payment from debt)
      await updateDoc(doc(db, 'customers', customer.id), {
        balance: (customer.balance || 0) - (paymentData.amount || 0)
      });

      // Also create a safe transaction
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
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-primary" size={28} />
            إدارة العملاء
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            سجل العملاء، الأرصدة، المستحقات المالية
          </p>
      {/* Customer View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4 sticky top-0 bg-white z-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Briefcase size={24} className="text-indigo-600" />
                  ملف العميل: {viewingCustomer.name}
                </CardTitle>
                <CardDescription className="font-bold mt-1 text-slate-500">{viewingCustomer.type} - {viewingCustomer.phone}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setViewingCustomer(null)} className="font-bold text-slate-500 hover:text-slate-800">
                إغلاق
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">الرصيد المالي الحالي</p>
                  <div className={`text-2xl font-black ${viewingCustomer.balance > 0 ? 'text-red-600' : viewingCustomer.balance < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {Math.abs(viewingCustomer.balance).toLocaleString('ar-EG')} ج.م
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-1">{viewingCustomer.balance > 0 ? 'عليه (مدين)' : viewingCustomer.balance < 0 ? 'له (دائن)' : 'مُصفى'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">عدد الطلبيات (أوامر البيع)</p>
                  <div className="text-2xl font-black text-slate-800">
                    {salesOrders.filter(o => o.customerName === viewingCustomer.name).length}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي المدفوعات (المحصلة)</p>
                  <div className="text-2xl font-black text-slate-800">
                    {customerPayments.filter(p => p.customerId === viewingCustomer.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </div>
              
              {/* Tabs / Sections */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <FileText size={18} className="text-indigo-600" />
                    الطلبيات وأوامر البيع المرتبطة
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-slate-600">التاريخ</TableHead>
                          <TableHead className="font-black text-slate-600">إجمالي البيع</TableHead>
                          <TableHead className="font-black text-slate-600">التكلفة المتوقعة</TableHead>
                          <TableHead className="font-black text-slate-600">الربحية المتوقعة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesOrders.filter(o => o.customerName === viewingCustomer.name).length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-slate-400 font-bold py-6">لا توجد طلبيات</TableCell></TableRow>
                        ) : (
                          salesOrders.filter(o => o.customerName === viewingCustomer.name).map(order => {
                            const totalSelling = order.items.reduce((s, i) => s + (i.sellingPrice || 0), 0);
                            const totalCost = order.items.reduce((s, i) => s + (i.cogs || 0) + (i.logisticsCost || 0), 0);
                            return (
                              <TableRow key={order.id}>
                                <TableCell className="font-bold">{order.date}</TableCell>
                                <TableCell className="font-black text-slate-700">{totalSelling.toLocaleString('ar-EG')} ج.م</TableCell>
                                <TableCell className="font-bold text-slate-500">{totalCost.toLocaleString('ar-EG')} ج.م</TableCell>
                                <TableCell className="font-black text-emerald-600">{(totalSelling - totalCost).toLocaleString('ar-EG')} ج.م</TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                    <CreditCard size={18} className="text-emerald-600" />
                    سجل الدفعات والمقبوضات
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-slate-600">التاريخ</TableHead>
                          <TableHead className="font-black text-slate-600">المبلغ</TableHead>
                          <TableHead className="font-black text-slate-600">طريقة الدفع</TableHead>
                          <TableHead className="font-black text-slate-600">ملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerPayments.filter(p => p.customerId === viewingCustomer.id).length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-slate-400 font-bold py-6">لا توجد مدفوعات</TableCell></TableRow>
                        ) : (
                          customerPayments.filter(p => p.customerId === viewingCustomer.id).map(payment => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-bold">{payment.date}</TableCell>
                              <TableCell className="font-black text-emerald-600">{payment.amount.toLocaleString('ar-EG')} ج.م</TableCell>
                              <TableCell className="font-bold text-slate-600">{payment.paymentMethod} {payment.referenceNumber ? `(${payment.referenceNumber})` : ''}</TableCell>
                              <TableCell className="text-slate-500 font-medium">{payment.notes}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
        
        <div className="flex gap-3">
          <Button onClick={() => setShowPaymentModal(true)} variant="outline" className="font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
            <CreditCard size={18} className="ml-2" />
            تحصيل دفعة
          </Button>
          <Button onClick={() => { resetFormData(); setEditingCustomer(null); setShowAddModal(true); }} className="font-bold">
            <Plus size={18} className="ml-2" />
            إضافة عميل
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-indigo-600/80 mb-1">إجمالي العملاء</p>
                <h3 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black text-indigo-900 break-all">{customers.length}</h3>
              </div>
              <div className="p-2.5 sm:p-3 bg-indigo-100/50 text-indigo-600 rounded-2xl shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-600/80 mb-1">عملاء نشطين</p>
                <h3 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black text-emerald-900 break-all">{activeCount}</h3>
              </div>
              <div className="p-2.5 sm:p-3 bg-emerald-100/50 text-emerald-600 rounded-2xl shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-red-600/80 mb-1">إجمالي المديونيات لنا</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <h3 className="text-base sm:text-lg md:text-2xl font-black text-red-900 break-all">{totalDebt.toLocaleString('ar-EG')}</h3>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 bg-red-100/50 text-red-600 rounded-2xl shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-blue-600/80 mb-1">أرصدة دائنة (دفعات مقدمة)</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <h3 className="text-base sm:text-lg md:text-2xl font-black text-blue-900 break-all">{totalCredit.toLocaleString('ar-EG')}</h3>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400">ج.م</span>
                </div>
              </div>
              <div className="p-2.5 sm:p-3 bg-blue-100/50 text-blue-600 rounded-2xl shrink-0">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="بحث بالاسم، الجوال، السجل التجاري..."
                className="pl-4 pr-10 bg-slate-50 border-transparent focus:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">
                
                  
                
                
                  <option value="الكل">جميع الأنواع</option>
                  <option value="أفراد">أفراد</option>
                  <option value="شركات">شركات</option>
                  <option value="مقاولين">مقاولين</option>
                  <option value="تجار">تجار</option>
                  <option value="مهندسين ديكور">مهندسين ديكور</option>
                
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-600">العميل</TableHead>
                  <TableHead className="font-black text-slate-600">التصنيف</TableHead>
                  <TableHead className="font-black text-slate-600">التواصل</TableHead>
                  <TableHead className="font-black text-slate-600">الرصيد المالي</TableHead>
                  <TableHead className="font-black text-slate-600">الحالة</TableHead>
                  <TableHead className="font-black text-slate-600 text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                      لا يوجد عملاء مضافين حالياً
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => (
                    <TableRow key={customer.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                            {customer.name.substring(0, 1)}
                          </div>
                          <div>
                            <div className="font-black text-slate-800">{customer.name}</div>
                            {customer.taxId && <div className="text-xs text-slate-400 font-medium">س.ت: {customer.taxId}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold bg-white">
                          {customer.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail size={14} className="text-slate-400" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`font-black ${
                            customer.balance > 0 ? 'text-red-600' : 
                            customer.balance < 0 ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                            {Math.abs(customer.balance).toLocaleString('ar-EG')} ج.م
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {customer.balance > 0 ? 'عليه (مدين)' : customer.balance < 0 ? 'له (دائن)' : 'مُصفى'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-bold ${
                          customer.status === 'نشط' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          customer.status === 'محظور' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50"
                            onClick={() => {
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50" onClick={() => setViewingCustomer(customer)}>
                            <FileText size={16} />
                          </Button>
                              setEditingCustomer(customer);
                              setFormData(customer);
                              setShowAddModal(true);
                            }}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
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

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-xl font-black text-slate-800">
                {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اسم العميل / الشركة <span className="text-red-500">*</span></label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="font-bold bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">رقم الجوال <span className="text-red-500">*</span></label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="font-bold bg-slate-50"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">نوع العميل</label>
                  <select value={formData.type} onChange={(e: any) => setFormData({...formData, type: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">
                    
                      
                    
                    
                      <option value="أفراد">أفراد</option>
                      <option value="شركات">شركات</option>
                      <option value="مقاولين">مقاولين</option>
                      <option value="تجار">تجار</option>
                      <option value="مهندسين ديكور">مهندسين ديكور</option>
                    
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">حالة العميل</label>
                  <select value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">
                    
                      
                    
                    
                      <option value="نشط">نشط</option>
                      <option value="محتمل">محتمل</option>
                      <option value="غير نشط">غير نشط</option>
                      <option value="محظور">محظور (بلاك ليست)</option>
                    
                  </select>
                </div>
                
                {/* الرصيد الافتتاحي - يظهر فقط عند الإضافة */}
                {!editingCustomer && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">الرصيد الافتتاحي (ج.م)</label>
                    <Input 
                      type="number"
                      value={formData.balance} 
                      onChange={e => setFormData({...formData, balance: Number(e.target.value)})} 
                      className="font-bold bg-slate-50"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-slate-400 font-bold">موجب = مديونية على العميل، سالب = دفعة مقدمة لنا</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الحد الائتماني (أقصى مديونية)</label>
                  <Input 
                    type="number"
                    value={formData.creditLimit} 
                    onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} 
                    className="font-bold bg-slate-50"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">السجل التجاري / الضريبي</label>
                  <Input 
                    value={formData.taxId} 
                    onChange={e => setFormData({...formData, taxId: e.target.value})} 
                    className="font-bold bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">البريد الإلكتروني</label>
                  <Input 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="font-bold bg-slate-50"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">العنوان الكامل</label>
                  <textarea className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50 resize-none" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">ملاحظات إضافية</label>
                  <textarea className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50 resize-none" 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowAddModal(false)} className="font-bold">
                  إلغاء
                </Button>
                <Button onClick={handleSaveCustomer} className="font-bold px-8">
                  حفظ البيانات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-none shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4 bg-emerald-50 rounded-t-xl">
              <CardTitle className="text-xl font-black text-emerald-800 flex items-center gap-2">
                <CreditCard size={24} />
                سند قبض من عميل
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">العميل</label>
                  <SearchableSelect
                    options={customerOptions}
                    selectedValue={paymentData.customerId}
                    onChange={(val) => {
                      const c = customers.find(x => x.id === val);
                      setPaymentData({...paymentData, customerId: val, amount: c && c.balance > 0 ? c.balance : 0});
                    }}
                    placeholder="ابحث واختر العميل..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">تاريخ السداد</label>
                    <Input 
                      type="date"
                      value={paymentData.date} 
                      onChange={e => setPaymentData({...paymentData, date: e.target.value})} 
                      className="font-bold bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
                    <select value={paymentData.paymentMethod} onChange={(e: any) => setPaymentData({...paymentData, paymentMethod: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">
                      
                        
                      
                      
                        <option value="نقدي">نقدي</option>
                        <option value="تحويل بنكي">تحويل بنكي</option>
                        <option value="شيك">شيك</option>
                        <option value="فيزا">فيزا / ماستركارد</option>
                      
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الخزنة / الحساب المودع به</label>
                  <select value={paymentData.safeId} onChange={(e: any) => setPaymentData({...paymentData, safeId: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50">
                    
                      
                    
                    
                      {safes.map(safe => (
                        <option key={safe.id} value={safe.id}>{safe.name}</option>
                      ))}
                    
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">المبلغ المحصل (ج.م)</label>
                  <Input 
                    type="number"
                    value={paymentData.amount || ''} 
                    onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} 
                    className="font-black text-xl text-emerald-700 bg-emerald-50 border-emerald-200"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">رقم المرجع (لتحويل أو شيك)</label>
                  <Input 
                    value={paymentData.referenceNumber || ''} 
                    onChange={e => setPaymentData({...paymentData, referenceNumber: e.target.value})} 
                    className="font-bold bg-slate-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">البيان / ملاحظات</label>
                  <textarea className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold bg-slate-50 resize-none" 
                    value={paymentData.notes} 
                    onChange={e => setPaymentData({...paymentData, notes: e.target.value})} 
                    
                    placeholder="مثال: دفعة من حساب الأعمال الخشبية..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setShowPaymentModal(false)} className="font-bold">
                  إلغاء
                </Button>
                <Button onClick={handleSavePayment} className="font-bold px-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                  حفظ وطباعة إيصال
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
