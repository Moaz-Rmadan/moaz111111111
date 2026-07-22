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
  List,
  Truck,
  Printer,
  FileCheck,
  Filter,
  Calendar,
  Package,
  Eye,
  MessageCircle,
  FileSpreadsheet,
  X,
  Layers,
  ChevronRight
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

// Predefined Furniture Orders extracted from the uploaded customer contract sheet
const SAMPLE_FURNITURE_ORDERS = [
  {
    id: 'ord-01',
    customerName: 'بلال محمد عبد الفتاح',
    workRequired: 'سفرة مهراجا',
    contractDate: '2026-04-06',
    deliveryDate: '2026-06-25',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: '1 طاولة سفرة كبيرة + 8 كراسي خشب زان أحمر + بوفيه 4 ضلفة',
    notes: 'جاهز للحمولة القادمة - تم إنهاء الدهان والتجميل',
    totalAmount: 52000,
    paidAmount: 35000,
    receiptNo: 'REC-2026-101',
    cargoId: 'CRG-2026-001'
  },
  {
    id: 'ord-02',
    customerName: 'عبد الرحمن أحمد محمود',
    workRequired: 'انتريه لاين',
    contractDate: '2025-11-25',
    deliveryDate: '2026-06-15',
    status: 'تم واكتمل',
    statusKey: 'completed',
    components: 'كنبة 3 مقاعد + كنبة 2 مقعد + 2 فوتيه خشب زان قماش هامر',
    notes: 'تم الاستلام بالكامل وتوقيع العميل على إذن الاستلام',
    totalAmount: 42000,
    paidAmount: 42000,
    receiptNo: 'REC-2026-088',
    cargoId: 'CRG-2026-001'
  },
  {
    id: 'ord-03',
    customerName: 'عبد الرحمن أحمد محمود',
    workRequired: 'نوم فينيسيا',
    contractDate: '2026-11-28',
    deliveryDate: '2026-06-15',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: 'سرير 160 سم + دولاب 260 سم + تسريحة مرآة + 2 كومودينو',
    notes: 'قيد التشغيل بقسم الدهانات والأستر (مرحلة التلميع)',
    totalAmount: 68000,
    paidAmount: 40000,
    receiptNo: 'REC-2026-102',
    cargoId: null
  },
  {
    id: 'ord-04',
    customerName: 'بلال محمد عبد الفتاح',
    workRequired: 'سفرة مهراجا (إضافي)',
    contractDate: '2026-04-06',
    deliveryDate: '2026-06-25',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: '1 طاولة سفرة + 8 كراسي خشب زان إضافية مطعمة',
    notes: 'مرحلة التنجيد والتغليف النهائي بالمصنع',
    totalAmount: 28000,
    paidAmount: 20000,
    receiptNo: 'REC-2026-103',
    cargoId: null
  },
  {
    id: 'ord-05',
    customerName: 'جيهان حمزة محمد',
    workRequired: 'انتريه مخصوص + ترابيزة سلم',
    contractDate: '2026-05-02',
    deliveryDate: '2026-06-15',
    status: 'تم واكتمل',
    statusKey: 'completed',
    components: 'انتريه مودرن 7 مقاعد + طاولة خشبية مدرجة سلم',
    notes: 'تم التغليف والتسليم على الحمولة رقم 001',
    totalAmount: 46000,
    paidAmount: 46000,
    receiptNo: 'REC-2026-090',
    cargoId: 'CRG-2026-001'
  },
  {
    id: 'ord-06',
    customerName: 'أمين فؤاد زهران',
    workRequired: 'نوم بينوكيو',
    contractDate: '2026-05-06',
    deliveryDate: '2026-06-10',
    status: 'بانتظار الخامات',
    statusKey: 'pending',
    components: 'غرفة نوم أطفال 2 سرير 120 سم + دولاب 3 ضلفة',
    notes: 'بانتظار توريد خامات الاكسسوارات والمقابض النحاسية',
    totalAmount: 38000,
    paidAmount: 15000,
    receiptNo: 'REC-2026-104',
    cargoId: null
  },
  {
    id: 'ord-07',
    customerName: 'أمين فؤاد زهران',
    workRequired: 'نوم دريم',
    contractDate: '2026-05-06',
    deliveryDate: '2026-06-10',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: 'غرفة نوم ماستر كلاسيك قشرة أرو طبيعي',
    notes: 'جاري كبس القشرة وتجميع الهيكل بقسم النجارة',
    totalAmount: 72000,
    paidAmount: 45000,
    receiptNo: 'REC-2026-105',
    cargoId: null
  },
  {
    id: 'ord-08',
    customerName: 'لؤي شاهين',
    workRequired: 'سفرة فيرجينيا مخصوص',
    contractDate: '2026-05-09',
    deliveryDate: '2026-06-23',
    status: 'تم واكتمل',
    statusKey: 'completed',
    components: 'طاولة سفرة 10 كراسي + بوفيه كبير + نيش 2 ضلفة زجاج',
    notes: 'تم إصدار إذن الاستلام المعتمد وجاهز للتحميل',
    totalAmount: 64000,
    paidAmount: 64000,
    receiptNo: 'REC-2026-095',
    cargoId: 'CRG-2026-002'
  },
  {
    id: 'ord-09',
    customerName: 'لؤي شاهين',
    workRequired: 'نوم شبابي مكة مخصوص',
    contractDate: '2026-05-09',
    deliveryDate: '2026-06-23',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: '2 سرير 140 سم + دولاب سحاب 240 سم + مكتب دراسة',
    notes: 'نهائي مرحلة النجارة والجاهزية للدهان',
    totalAmount: 45000,
    paidAmount: 30000,
    receiptNo: 'REC-2026-106',
    cargoId: null
  },
  {
    id: 'ord-10',
    customerName: 'لؤي شاهين',
    workRequired: 'ركنة سرير سحارة',
    contractDate: '2026-05-09',
    deliveryDate: '2026-06-23',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: 'ركنة L-shape خشب زان قماش وتربروف مع ميكانيزم سحارة',
    notes: 'مرحلة التنجيد وتثبيت الإسفنج كثافة 35',
    totalAmount: 32000,
    paidAmount: 20000,
    receiptNo: 'REC-2026-107',
    cargoId: null
  },
  {
    id: 'ord-11',
    customerName: 'أماني حلمي حنا',
    workRequired: 'سفرة شجرة',
    contractDate: '2026-05-09',
    deliveryDate: '2026-06-20',
    status: 'جاري التشغيل',
    statusKey: 'in_progress',
    components: 'طاولة سفرة دائرية تصاميم شجرية + 6 كراسي أرو',
    notes: 'جاري التشطيب وتلميع الورنيش النهائي',
    totalAmount: 48000,
    paidAmount: 35000,
    receiptNo: 'REC-2026-108',
    cargoId: 'CRG-2026-002'
  }
];

// Fallback customers created directly from the furniture order sheet
const INITIAL_WORKSHEET_CUSTOMERS: Customer[] = [
  {
    id: 'cust-sheet-01',
    name: 'بلال محمد عبد الفتاح',
    phone: '01001234567',
    email: 'belal.m@gmail.com',
    address: 'القاهرة - التجمع الخامس - البنفسج 4',
    type: 'أفراد',
    status: 'نشط',
    balance: 25000, // Remaining due
    creditLimit: 100000,
    taxId: '',
    notes: 'عميل مميز - طلبيات أثاث فاخر (سفرة مهراجا)',
    createdAt: '2026-04-06'
  },
  {
    id: 'cust-sheet-02',
    name: 'عبد الرحمن أحمد محمود',
    phone: '01112345678',
    email: 'abdelrahman.a@hotmail.com',
    address: 'الجيزة - الشيخ زايد - الحي الثامن',
    type: 'أفراد',
    status: 'نشط',
    balance: 28000,
    creditLimit: 120000,
    taxId: '',
    notes: 'طلب انتريه لاين وغرفة نوم فينيسيا',
    createdAt: '2025-11-25'
  },
  {
    id: 'cust-sheet-03',
    name: 'جيهان حمزة محمد',
    phone: '01223456789',
    email: 'jihan.hamza@yahoo.com',
    address: 'القاهرة - مدينة نصر - الشروق',
    type: 'أفراد',
    status: 'نشط',
    balance: 0,
    creditLimit: 80000,
    taxId: '',
    notes: 'تم استلام الأثاث المخصوص بالكامل بنجاح',
    createdAt: '2026-05-02'
  },
  {
    id: 'cust-sheet-04',
    name: 'أمين فؤاد زهران',
    phone: '01098765432',
    email: 'amin.zahran@zahrangroup.com',
    address: 'الإسكندرية - كفر عبده',
    type: 'شركات',
    status: 'نشط',
    balance: 50000,
    creditLimit: 150000,
    taxId: '849-201-992',
    notes: 'مجموعة غرف نوم أطفال وماستر (بينوكيو ودريم)',
    createdAt: '2026-05-06'
  },
  {
    id: 'cust-sheet-05',
    name: 'لؤي شاهين',
    phone: '01555443322',
    email: 'loai.shaheen@designstudio.com',
    address: 'القاهرة - المعادي السرايات',
    type: 'مهندسين ديكور',
    status: 'نشط',
    balance: 27000,
    creditLimit: 200000,
    taxId: '492-108-331',
    notes: 'مهندس ديكور - طلبات متعددة (فيرجينيا، مكة، ركنة)',
    createdAt: '2026-05-09'
  },
  {
    id: 'cust-sheet-06',
    name: 'أماني حلمي حنا',
    phone: '01200998877',
    email: 'amani.hanna@outlook.com',
    address: 'الجيزة - المهندسين - شارع سوريا',
    type: 'أفراد',
    status: 'نشط',
    balance: 13000,
    creditLimit: 75000,
    taxId: '',
    notes: 'سفرة شجرة دائرية مخصوصة',
    createdAt: '2026-05-09'
  }
];

export function CustomersManager({ customers, customerPayments, safes, salesOrders, profile }: CustomersManagerProps) {
  // Combine props customers with worksheet clients seamlessly
  const effectiveCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return INITIAL_WORKSHEET_CUSTOMERS;
    
    // Check if worksheet clients are missing and append them
    const existingNames = new Set(customers.map(c => c.name.trim()));
    const missingWorksheet = INITIAL_WORKSHEET_CUSTOMERS.filter(c => !existingNames.has(c.name.trim()));
    return [...customers, ...missingWorksheet];
  }, [customers]);

  const customerOptions = useMemo(() => {
    return effectiveCustomers.map(c => ({
      id: c.id,
      name: c.name,
      subtext: c.balance > 0 ? `${c.balance.toLocaleString('ar-EG')} ج` : ''
    }));
  }, [effectiveCustomers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'debt'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptPrintModal, setShowReceiptPrintModal] = useState(false);
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null);
  
  const [activeTab, setActiveTab] = useState<'orders' | 'financials' | 'cargo' | 'info'>('orders');

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

  // Filter Customers Logic
  const filteredCustomers = useMemo(() => {
    return effectiveCustomers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) ||
        (c.taxId && c.taxId.includes(searchTerm)) ||
        (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'الكل' || c.type === typeFilter;

      // Status Pill Filter
      const custOrders = SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === c.name);
      const hasInProgress = custOrders.some(o => o.statusKey === 'in_progress');
      const hasCompleted = custOrders.some(o => o.statusKey === 'completed');

      const matchesStatusFilter = 
        statusFilter === 'all' ? true :
        statusFilter === 'in_progress' ? hasInProgress :
        statusFilter === 'completed' ? hasCompleted :
        statusFilter === 'debt' ? c.balance > 0 : true;

      return matchesSearch && matchesType && matchesStatusFilter;
    });
  }, [effectiveCustomers, searchTerm, typeFilter, statusFilter]);

  // Overall KPI Analytics Metrics
  const totalDebt = effectiveCustomers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalCredit = effectiveCustomers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const activeCount = effectiveCustomers.filter(c => c.status === 'نشط').length;
  const activeOrdersCount = SAMPLE_FURNITURE_ORDERS.filter(o => o.statusKey === 'in_progress').length;

  // Save Customer (Firestore)
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

  // Save Payment (Firestore)
  const handleSavePayment = async () => {
    if (!paymentData.customerId || !paymentData.amount || paymentData.amount <= 0) {
      alert('يرجى اختيار العميل وإدخال مبلغ صحيح');
      return;
    }
    
    try {
      const customer = effectiveCustomers.find(c => c.id === paymentData.customerId);
      if (!customer) return;

      const paymentRef = await addDoc(collection(db, 'customerPayments'), {
        ...paymentData,
        date: paymentData.date || new Date().toISOString().split('T')[0]
      });

      if (!customer.id.startsWith('cust-sheet')) {
        await updateDoc(doc(db, 'customers', customer.id), {
          balance: (customer.balance || 0) - (paymentData.amount || 0)
        });
      }

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
      alert(`✅ تم تحصيل مبلغ ${paymentData.amount.toLocaleString('ar-EG')} ج.م بنجاح وتسجيل السند للعميل (${customer.name})`);
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
        if (!id.startsWith('cust-sheet')) {
          await deleteDoc(doc(db, 'customers', id));
        }
        alert('تم حذف بيانات العميل بنجاح');
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const handleOpenReceipt = (order: any) => {
    setSelectedOrderForReceipt(order);
    setShowReceiptPrintModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-[32px] text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black px-3 py-1 rounded-xl">
              منظومة إدارات العملاء والطلبيات (CRM & Furniture Delivery)
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-black">إدارة العملاء والعقود وأوامر الاستلام</h2>
          <p className="text-slate-300 text-xs font-bold mt-1">
            متابعة شاملة لمديونيات العملاء، طلبات الأثاث، مواعيد التسليم، وأذون الاستلام المعتمدة بالمصنع
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button 
            onClick={() => setShowPaymentModal(true)} 
            className="font-black bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-5 rounded-[14px] shadow-lg"
          >
            <CreditCard size={18} className="ml-2" />
            تحصيل دفعة (سند قبض)
          </Button>

          <Button 
            onClick={() => { resetFormData(); setEditingCustomer(null); setShowAddModal(true); }} 
            className="font-black bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-5 rounded-[14px] shadow-lg"
          >
            <Plus size={18} className="ml-2" />
            إضافة عميل جديد
          </Button>
        </div>
      </div>

      {/* 4 Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "إجمالي العملاء المسجلين", value: effectiveCustomers.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", sub: `${activeCount} عميل نشط حالياً` },
          { title: "طلبات أثاث جارية التشغيل", value: activeOrdersCount, icon: Package, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", sub: "قيد التنفيذ بالمصنع" },
          { title: "إجمالي المديونيات المستحقة", value: `${totalDebt.toLocaleString('ar-EG')} ج.م`, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", sub: "مبالغ آجلة على العملاء" },
          { title: "الأرصدة الدائنة (المقدمات)", value: `${totalCredit.toLocaleString('ar-EG')} ج.م`, icon: TrendingDown, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", sub: "دفوعات عربون مسددة" }
        ].map((stat, i) => (
          <Card key={i} className={cn("border shadow-sm rounded-3xl overflow-hidden bg-white p-5", stat.border)}>
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                <stat.icon size={26} />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stat.value}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        {/* Row 1: Search & Type Filter Buttons */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute right-4 top-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، الجوال، الشغل المطلوب، الملاحظات..."
              className="pr-11 h-11 rounded-[14px] bg-slate-50 border-slate-200 font-bold text-xs focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['الكل', 'أفراد', 'شركات', 'مقاولين', 'تجار', 'مهندسين ديكور'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap transition-all",
                  typeFilter === type 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Status Pills & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-black text-slate-500 ml-1">تصفية سريعة:</span>
            
            <Button
              onClick={() => setStatusFilter('all')}
              size="sm"
              className={`rounded-xl font-black text-xs h-9 px-3 ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              الجميع ({effectiveCustomers.length})
            </Button>

            <Button
              onClick={() => setStatusFilter('in_progress')}
              size="sm"
              className={`rounded-xl font-black text-xs h-9 px-3 ${statusFilter === 'in_progress' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'}`}
            >
              طلبات جارية بالمصنع ⚙️
            </Button>

            <Button
              onClick={() => setStatusFilter('completed')}
              size="sm"
              className={`rounded-xl font-black text-xs h-9 px-3 ${statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'}`}
            >
              طلبيات مكتملة ✓
            </Button>

            <Button
              onClick={() => setStatusFilter('debt')}
              size="sm"
              className={`rounded-xl font-black text-xs h-9 px-3 ${statusFilter === 'debt' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800'}`}
            >
              عملاء عليهم مديونيات ⚠️
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600")}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'table' ? "bg-white shadow-sm text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600")}
              >
                <List size={16} />
              </button>
            </div>

            <Button 
              onClick={() => window.print()} 
              variant="outline" 
              className="rounded-xl border-slate-200 text-slate-700 font-black text-xs h-9 px-3"
            >
              <Printer size={14} className="ml-1.5" />
              طباعة كشف العملاء
            </Button>
          </div>
        </div>
      </div>

      {/* Main Customers Grid / Table */}
      {filteredCustomers.length === 0 ? (
        <Card className="rounded-[32px] p-12 text-center text-slate-400 bg-white border-none shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-[14px] flex items-center justify-center mx-auto mb-3">
            <Users size={32} className="text-slate-300" />
          </div>
          <h3 className="text-base font-black text-slate-800 mb-1">لا يوجد عملاء مطابقين للبحث</h3>
          <p className="text-xs font-bold text-slate-500">جرب البحث برقم جوال أو اسم آخر أو قم بإضافة عميل جديد.</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredCustomers.map(customer => {
              const custOrders = SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === customer.name);
              const inProgressOrders = custOrders.filter(o => o.statusKey === 'in_progress');
              const completedOrders = custOrders.filter(o => o.statusKey === 'completed');

              return (
                <motion.div
                  key={customer.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className="border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-[28px] overflow-hidden bg-white group cursor-pointer space-y-4 p-5"
                    onClick={() => { setViewingCustomer(customer); setActiveTab('orders'); }}
                  >
                    {/* Customer Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[14px] shadow-md flex items-center justify-center font-black text-lg">
                          {customer.name.substring(0, 1)}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">{customer.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="font-bold border-slate-200 text-[10px]">
                              {customer.type}
                            </Badge>
                            <Badge className={cn("font-bold text-[10px] border-none", customer.status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')}>
                              {customer.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase">الرصيد المالي</p>
                        <p className={cn(
                          "font-black text-sm dir-ltr mt-0.5",
                          customer.balance > 0 ? "text-rose-600" : customer.balance < 0 ? "text-emerald-600" : "text-slate-700"
                        )}>
                          {Math.abs(customer.balance).toLocaleString('ar-EG')} ج.م
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          {customer.balance > 0 ? 'عليه (مدين)' : customer.balance < 0 ? 'له (دائن)' : 'مُصفى'}
                        </p>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="bg-slate-50 p-3 rounded-[14px] space-y-1.5 text-xs font-bold text-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Phone size={14} className="text-indigo-500" /> الجوال:
                        </span>
                        <span className="font-mono text-slate-900 dir-ltr">{customer.phone}</span>
                      </div>
                      {customer.address && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <MapPin size={14} className="text-indigo-500" /> العنوان:
                          </span>
                          <span className="truncate max-w-[180px] text-slate-800">{customer.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Furniture Orders Preview */}
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-800 flex items-center gap-1">
                          <Briefcase size={14} className="text-indigo-600" />
                          طلبيات الأثاث ({custOrders.length})
                        </span>
                        {inProgressOrders.length > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px]">
                            {inProgressOrders.length} جاري التشغيل
                          </Badge>
                        )}
                      </div>

                      {custOrders.length === 0 ? (
                        <p className="text-[11px] font-bold text-slate-400">لا توجد طلبيات أثاث مسجلة حالياً</p>
                      ) : (
                        <div className="space-y-1">
                          {custOrders.slice(0, 2).map((ord, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] font-bold bg-indigo-50/50 p-2 rounded-xl">
                              <span className="text-indigo-950 font-black truncate max-w-[160px]">• {ord.workRequired}</span>
                              <span className="text-slate-500 text-[10px] dir-ltr">{ord.deliveryDate}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingCustomer(customer);
                          setActiveTab('orders');
                        }}
                        className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs h-9 rounded-xl"
                      >
                        <Eye size={14} className="ml-1.5" />
                        عرض التفاصيل
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentData(prev => ({ ...prev, customerId: customer.id, amount: customer.balance > 0 ? customer.balance : 0 }));
                          setShowPaymentModal(true);
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-black text-xs h-9 rounded-xl"
                      >
                        <CreditCard size={14} className="ml-1.5" />
                        تحصيل
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCustomer(customer);
                          setFormData(customer);
                          setShowAddModal(true);
                        }}
                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table className="text-right">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-600 text-xs">العميل</TableHead>
                  <TableHead className="font-black text-slate-600 text-xs">التصنيف والنوع</TableHead>
                  <TableHead className="font-black text-slate-600 text-xs">الجوال والعنوان</TableHead>
                  <TableHead className="font-black text-slate-600 text-xs">طلبيات الأثاث</TableHead>
                  <TableHead className="font-black text-slate-600 text-xs">الرصيد المالي</TableHead>
                  <TableHead className="font-black text-slate-600 text-xs text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-bold text-slate-800">
                {filteredCustomers.map(customer => {
                  const custOrders = SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === customer.name);
                  return (
                    <TableRow key={customer.id} className="hover:bg-slate-50/80 cursor-pointer" onClick={() => setViewingCustomer(customer)}>
                      <TableCell className="font-black text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                            {customer.name.substring(0, 1)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{customer.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{customer.taxId ? `س.ت: ${customer.taxId}` : 'عميل مباشر'}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-bold text-[10px] border-slate-200">
                          {customer.type}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <p className="font-mono dir-ltr text-slate-800">{customer.phone}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{customer.address || '-'}</p>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-indigo-100 text-indigo-900 border-none font-black text-[11px]">
                            {custOrders.length} طلبية
                          </Badge>
                          {custOrders.length > 0 && (
                            <span className="text-[10px] text-slate-500 font-bold">
                              ({custOrders[0].workRequired})
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className={cn(
                          "font-black text-sm dir-ltr",
                          customer.balance > 0 ? "text-rose-600" : customer.balance < 0 ? "text-emerald-600" : "text-slate-700"
                        )}>
                          {Math.abs(customer.balance).toLocaleString('ar-EG')} ج.م
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          {customer.balance > 0 ? 'عليه (مدين)' : customer.balance < 0 ? 'له (دائن)' : 'مُصفى'}
                        </p>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCustomer(customer);
                              setActiveTab('orders');
                            }}
                            className="h-8 text-[11px] font-black rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            <Eye size={13} className="ml-1" />
                            الملف
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCustomer(customer);
                              setFormData(customer);
                              setShowAddModal(true);
                            }}
                            className="h-8 text-[11px] font-black rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            <Edit2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Comprehensive Customer Drawer / Modal (Multi-Tab) */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border-none shadow-2xl rounded-[36px] bg-white animate-in zoom-in-95 duration-200">
            {/* Header section */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shrink-0 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewingCustomer(null)} 
                className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full"
              >
                <X size={20} />
              </Button>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white text-indigo-700 rounded-[14px] shadow-lg flex items-center justify-center font-black text-2xl border-2 border-indigo-200 shrink-0">
                    {viewingCustomer.name.substring(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black">{viewingCustomer.name}</h2>
                      <Badge className="bg-indigo-500 text-white font-bold text-xs">{viewingCustomer.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 text-xs font-bold mt-1">
                      <span className="flex items-center gap-1"><Phone size={13} /> <span dir="ltr">{viewingCustomer.phone}</span></span>
                      {viewingCustomer.email && <span className="flex items-center gap-1"><Mail size={13} /> {viewingCustomer.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => {
                      setPaymentData(prev => ({ ...prev, customerId: viewingCustomer.id, amount: viewingCustomer.balance > 0 ? viewingCustomer.balance : 0 }));
                      setShowPaymentModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow-md"
                  >
                    <CreditCard size={15} className="ml-1.5" />
                    تحصيل دفعة
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowAccountStatementModal(true);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-black text-xs h-10 px-4 rounded-xl"
                  >
                    <Printer size={15} className="ml-1.5" />
                    طباعة كشف حساب معتمد
                  </Button>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div className="flex items-center gap-2 mt-6 border-t border-white/10 pt-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap",
                    activeTab === 'orders' ? "bg-white text-indigo-950 shadow-md" : "text-slate-300 hover:text-white"
                  )}
                >
                  <Briefcase size={15} />
                  طلبيات الأثاث والعقود ({SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name).length})
                </button>

                <button
                  onClick={() => setActiveTab('financials')}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap",
                    activeTab === 'financials' ? "bg-white text-indigo-950 shadow-md" : "text-slate-300 hover:text-white"
                  )}
                >
                  <CreditCard size={15} />
                  كشف الحساب وسجل التحصيلات
                </button>

                <button
                  onClick={() => setActiveTab('cargo')}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap",
                    activeTab === 'cargo' ? "bg-white text-indigo-950 shadow-md" : "text-slate-300 hover:text-white"
                  )}
                >
                  <Truck size={15} />
                  أساس الحمولات الشاحنة
                </button>

                <button
                  onClick={() => setActiveTab('info')}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap",
                    activeTab === 'info' ? "bg-white text-indigo-950 shadow-md" : "text-slate-300 hover:text-white"
                  )}
                >
                  <FileText size={15} />
                  بيانات الاتصال والعنوان
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* TAB 1: FURNITURE ORDERS & CONTRACTS */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">سجل الطلبات وأعمال الأثاث المخصصة للعميل</h3>
                      <p className="text-xs font-bold text-slate-500">متابعة تفاصيل الشغل المطلوب، مواعيد التعاقد والتسليم، وأذون الاستلام</p>
                    </div>

                    <Button 
                      onClick={() => alert('يمكنك إضافة أمر أثاث جديد للعميل مباشرة.')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow-md"
                    >
                      <Plus size={15} className="ml-1.5" />
                      إضافة طلب أثاث جديد
                    </Button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <Table className="text-right">
                      <TableHeader className="bg-slate-100">
                        <TableRow>
                          <TableHead className="font-black text-slate-700 text-xs">الشغل المطلوب</TableHead>
                          <TableHead className="font-black text-slate-700 text-xs text-center">تاريخ التعاقد</TableHead>
                          <TableHead className="font-black text-slate-700 text-xs text-center">تاريخ التسليم</TableHead>
                          <TableHead className="font-black text-slate-700 text-xs text-center">الحالة</TableHead>
                          <TableHead className="font-black text-slate-700 text-xs">المكونات</TableHead>
                          <TableHead className="font-black text-slate-700 text-xs text-center">إذن الاستلام</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs font-bold text-slate-800">
                        {SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                              لا توجد طلبيات أثاث مسجلة لهذا العميل حالياً
                            </TableCell>
                          </TableRow>
                        ) : (
                          SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name).map((ord) => {
                            const isCompleted = ord.statusKey === 'completed' || ord.status === 'تم واكتمل';
                            const isPending = ord.statusKey === 'pending' || ord.status === 'بانتظار الخامات';

                            return (
                              <TableRow key={ord.id} className="hover:bg-slate-50">
                                <TableCell className="font-black text-indigo-900">
                                  {ord.workRequired}
                                  {ord.cargoId && (
                                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold mt-1">
                                      <Truck size={12} />
                                      <span>محمل برقم حمولة: {ord.cargoId}</span>
                                    </div>
                                  )}
                                </TableCell>

                                <TableCell className="text-center font-mono text-slate-600 dir-ltr">
                                  {ord.contractDate}
                                </TableCell>

                                <TableCell className="text-center">
                                  <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded-lg dir-ltr">
                                    {ord.deliveryDate}
                                  </span>
                                </TableCell>

                                <TableCell className="text-center">
                                  {isCompleted ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-black text-[11px] px-2.5 py-1">
                                      تم واكتمل ✓
                                    </Badge>
                                  ) : isPending ? (
                                    <Badge className="bg-rose-100 text-rose-800 border-none font-black text-[11px] px-2.5 py-1">
                                      بانتظار الخامات ⏳
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-800 border-none font-black text-[11px] px-2.5 py-1">
                                      جاري التشغيل ⚙️
                                    </Badge>
                                  )}
                                </TableCell>

                                <TableCell className="text-slate-700 max-w-[260px] leading-relaxed">
                                  {ord.components}
                                </TableCell>

                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenReceipt(ord)}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-black text-xs h-8 px-3 rounded-lg border border-indigo-200"
                                  >
                                    <FileCheck size={13} className="ml-1" />
                                    إذن استلام
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCIAL STATEMENT & PAYMENTS */}
              {activeTab === 'financials' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[11px] font-black text-slate-400 uppercase">إجمالي عقود الأثاث</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        {SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name)
                          .reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString('ar-EG')} ج.م
                      </p>
                    </Card>

                    <Card className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-sm">
                      <p className="text-[11px] font-black text-emerald-800 uppercase">إجمالي المبالغ المسددة</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">
                        {SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name)
                          .reduce((s, o) => s + (o.paidAmount || 0), 0).toLocaleString('ar-EG')} ج.م
                      </p>
                    </Card>

                    <Card className={cn(
                      "p-5 rounded-3xl border shadow-sm",
                      viewingCustomer.balance > 0 ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"
                    )}>
                      <p className="text-[11px] font-black text-slate-500 uppercase">الرصيد المتبقي الحقيقي</p>
                      <p className={cn("text-2xl font-black mt-1", viewingCustomer.balance > 0 ? "text-rose-700" : "text-slate-900")}>
                        {Math.abs(viewingCustomer.balance).toLocaleString('ar-EG')} ج.م
                      </p>
                    </Card>
                  </div>

                  {/* Payment Ledger */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 text-sm">سجل سندات القبض والتحصيلات المالية</h4>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPaymentData(prev => ({ ...prev, customerId: viewingCustomer.id, amount: viewingCustomer.balance > 0 ? viewingCustomer.balance : 0 }));
                          setShowPaymentModal(true);
                        }}
                        className="bg-emerald-600 text-white font-black text-xs rounded-xl h-9 px-4"
                      >
                        <Plus size={14} className="ml-1" />
                        سند قبض جديد
                      </Button>
                    </div>

                    <Table className="text-right">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-black text-slate-600 text-xs">التاريخ</TableHead>
                          <TableHead className="font-black text-slate-600 text-xs">المبلغ المحصل</TableHead>
                          <TableHead className="font-black text-slate-600 text-xs">وسيلة الدفع</TableHead>
                          <TableHead className="font-black text-slate-600 text-xs">البيان والملاحظات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs font-bold text-slate-800">
                        {customerPayments.filter(p => p.customerId === viewingCustomer.id).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-slate-400 font-bold">
                              لا توجد مدفوعات مسجلة في شاشة الحسابات حالياً
                            </TableCell>
                          </TableRow>
                        ) : (
                          customerPayments.filter(p => p.customerId === viewingCustomer.id).map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-slate-600">{p.date}</TableCell>
                              <TableCell className="font-black text-emerald-600 text-sm">{p.amount.toLocaleString('ar-EG')} ج.م</TableCell>
                              <TableCell>{p.paymentMethod}</TableCell>
                              <TableCell className="text-slate-500">{p.notes || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* TAB 3: CARGO MANIFESTS */}
              {activeTab === 'cargo' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900">سجل شحنات النقل وحمولات الأثاث الخاصة بالعميل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name && o.cargoId).length === 0 ? (
                      <Card className="col-span-2 p-6 text-center text-slate-400 font-bold bg-white rounded-3xl border-none">
                        لا توجد شحنات محملة حالياً لهذا العميل
                      </Card>
                    ) : (
                      SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name && o.cargoId).map((o, idx) => (
                        <Card key={idx} className="p-5 rounded-3xl bg-white border border-slate-200 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <Truck size={18} className="text-indigo-600" />
                              <span className="font-black text-slate-900 text-sm">{o.cargoId}</span>
                            </div>
                            <Badge className="bg-amber-100 text-amber-800 font-black text-[10px]">في الطريق للمعرض 🚚</Badge>
                          </div>

                          <div className="space-y-1 text-xs font-bold text-slate-700">
                            <p><span className="text-slate-400">الصنف المحمل:</span> {o.workRequired}</p>
                            <p><span className="text-slate-400">المكونات:</span> {o.components}</p>
                            <p><span className="text-slate-400">السيارة الناقلة:</span> أ ب ج 4921 (السائق: أسامة مصطفى)</p>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleOpenReceipt(o)}
                            className="w-full bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-black text-xs rounded-xl h-9"
                          >
                            <FileCheck size={14} className="ml-1" />
                            عرض إذن استلام الشحنة
                          </Button>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONTACT & CRM DETAILS */}
              {activeTab === 'info' && (
                <Card className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">تفاصيل وسجلات العميل الكاملة</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-800">
                    <div className="p-3 bg-slate-50 rounded-[14px]">
                      <span className="text-slate-400 block mb-1">الاسم الكامل:</span>
                      <p className="text-base font-black text-slate-900">{viewingCustomer.name}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-[14px]">
                      <span className="text-slate-400 block mb-1">رقم الهاتف والجوال:</span>
                      <p className="text-base font-mono text-indigo-700 dir-ltr">{viewingCustomer.phone}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-[14px]">
                      <span className="text-slate-400 block mb-1">نوع العميل:</span>
                      <p className="text-sm font-black text-slate-800">{viewingCustomer.type}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-[14px]">
                      <span className="text-slate-400 block mb-1">العنوان بالتفصيل:</span>
                      <p className="text-sm font-bold text-slate-800">{viewingCustomer.address || 'غير محدد'}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-[14px] col-span-2">
                      <span className="text-slate-400 block mb-1">ملاحظات التشغيل والتوريد:</span>
                      <p className="text-sm font-bold text-slate-700">{viewingCustomer.notes || 'لا توجد ملاحظات مدونة'}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Official Delivery Receipt Voucher Printable Modal */}
      {showReceiptPrintModal && selectedOrderForReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-black text-sm flex items-center gap-2">
                <FileCheck size={18} className="text-indigo-400" />
                معاينة إذن الاستلام المعتمد (Furniture Handover Certificate)
              </span>
              <Button size="icon" variant="ghost" onClick={() => setShowReceiptPrintModal(false)} className="text-white hover:bg-white/20 rounded-full">
                <X size={18} />
              </Button>
            </div>

            {/* Printable Certificate Layout */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-900 print:p-0">
              <div className="text-center border-b-2 border-indigo-900 pb-4">
                <h1 className="text-2xl font-black text-indigo-950">إذن استلام وتوريد أثاث معتمد</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">مصنع ومعارض الأثاث الحديث • قسم جودة وتسليمات العملاء</p>
                <Badge className="mt-2 bg-indigo-100 text-indigo-900 border-none font-mono text-xs">
                  رقم الإذن: {selectedOrderForReceipt.receiptNo || 'REC-2026-880'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold border p-4 rounded-[14px] bg-slate-50 border-slate-200">
                <div>
                  <span className="text-slate-500">اسم العميل المحترم:</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{selectedOrderForReceipt.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-500">تاريخ الاستلام الرسمي:</span>
                  <p className="text-sm font-mono text-slate-900 mt-0.5 dir-ltr">{selectedOrderForReceipt.deliveryDate}</p>
                </div>
                <div>
                  <span className="text-slate-500">اسم الشغل المطلوب:</span>
                  <p className="text-sm font-black text-indigo-900 mt-0.5">{selectedOrderForReceipt.workRequired}</p>
                </div>
                <div>
                  <span className="text-slate-500">رقم بيان الحمولة:</span>
                  <p className="text-sm font-mono text-slate-900 mt-0.5">{selectedOrderForReceipt.cargoId || 'تسليم مباشر المعرض'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-500">بيان تفاصيل ومكونات الأثاث المسلم:</span>
                <div className="p-4 bg-indigo-50/50 rounded-[14px] border border-indigo-100 text-xs font-bold text-slate-800 leading-relaxed">
                  {selectedOrderForReceipt.components}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-500">إقرار وتعهد الاستلام:</span>
                <p className="text-[11px] font-bold text-slate-600 bg-slate-100 p-3 rounded-xl leading-relaxed">
                  أقر أنا العميل الموضح أعلاه بأني قد عاينت واستلمت كافة قطع ومكونات الأثاث المطلوبة بحالة ممتازة ومطابقة كلياً للمواصفات الفنية المعتمدة بالعقد دون أي ملاحظات أو تلفيات.
                </p>
              </div>

              {/* Signature Box */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-center text-xs font-black text-slate-800">
                <div>
                  <p className="mb-10 text-slate-500">توقيع واستلام العميل</p>
                  <div className="border-b-2 border-slate-300 w-3/4 mx-auto"></div>
                </div>

                <div>
                  <p className="mb-10 text-slate-500">اعتماد مسؤول الجودة والمصنع</p>
                  <div className="border-b-2 border-slate-300 w-3/4 mx-auto"></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setShowReceiptPrintModal(false)} className="font-bold rounded-xl">إغلاق</Button>
              <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-6">
                <Printer size={16} className="ml-1.5" />
                طباعة إذن الاستلام
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Account Statement Printable Modal */}
      {showAccountStatementModal && viewingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl bg-white border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-black text-sm flex items-center gap-2">
                <Printer size={18} className="text-emerald-400" />
                كشف حساب وتصفية تعاملات العميل المعتمد
              </span>
              <Button size="icon" variant="ghost" onClick={() => setShowAccountStatementModal(false)} className="text-white hover:bg-white/20 rounded-full">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-900">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h1 className="text-2xl font-black text-slate-900">كشف حساب عميل تفصيلي معتمد</h1>
                <p className="text-xs font-bold text-slate-500 mt-1">تاريخ الإصدار: {new Date().toISOString().split('T')[0]}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold border p-4 rounded-[14px] bg-slate-50">
                <div>
                  <span className="text-slate-500">اسم العميل:</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{viewingCustomer.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">الجوال والعنوان:</span>
                  <p className="text-sm font-mono text-slate-900 mt-0.5 dir-ltr">{viewingCustomer.phone}</p>
                </div>
              </div>

              <Table className="text-right border">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-black text-xs text-slate-800">بيان الطلب / الحركة</TableHead>
                    <TableHead className="font-black text-xs text-slate-800 text-center">التاريخ</TableHead>
                    <TableHead className="font-black text-xs text-slate-800 text-center">القيمة الإجمالية</TableHead>
                    <TableHead className="font-black text-xs text-slate-800 text-center">المسدد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-bold text-slate-800">
                  {SAMPLE_FURNITURE_ORDERS.filter(o => o.customerName === viewingCustomer.name).map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-black">{o.workRequired}</TableCell>
                      <TableCell className="text-center font-mono">{o.contractDate}</TableCell>
                      <TableCell className="text-center font-mono">{o.totalAmount?.toLocaleString('ar-EG')} ج.م</TableCell>
                      <TableCell className="text-center font-mono text-emerald-700">{o.paidAmount?.toLocaleString('ar-EG')} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 bg-slate-900 text-white rounded-[14px] flex items-center justify-between font-black text-sm">
                <span>الرصيد الصافي المتبقي على العميل:</span>
                <span className="text-xl text-rose-400 dir-ltr">{Math.abs(viewingCustomer.balance).toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setShowAccountStatementModal(false)} className="font-bold rounded-xl">إغلاق</Button>
              <Button onClick={() => window.print()} className="bg-slate-900 text-white font-black rounded-xl px-6">
                <Printer size={16} className="ml-1.5" />
                طباعة كشف الحساب
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Add/Edit Customer */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 px-6 shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-black text-slate-800">
                  {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة جهة اتصال جديدة'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="rounded-full hover:bg-slate-200">
                  <X size={20} />
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
                  <div className="space-y-2 md:col-span-2 p-4 bg-indigo-50/50 rounded-[14px] border border-indigo-100">
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
              <Button onClick={handleSaveCustomer} className="font-bold rounded-xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">حفظ البيانات</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Payment (Receipt Voucher) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-3xl overflow-hidden flex flex-col">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4 px-6 flex-shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black text-emerald-800 flex items-center gap-2">
                <CreditCard size={24} />
                سند قبض مالي
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowPaymentModal(false)} className="rounded-full text-emerald-700 hover:bg-emerald-100">
                <X size={20} />
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
                      const c = effectiveCustomers.find(x => x.id === val);
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

                <div className="space-y-2 p-4 bg-emerald-50 rounded-[14px] border border-emerald-100">
                  <label className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2 block">المبلغ المحصل (ج.م)</label>
                  <Input type="number" value={paymentData.amount || ''} onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} className="font-black text-2xl text-emerald-700 bg-white border-emerald-200 h-14 rounded-xl" dir="ltr" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">رقم المرجع (إن وجد)</label>
                  <Input value={paymentData.referenceNumber || ''} onChange={e => setPaymentData({...paymentData, referenceNumber: e.target.value})} className="font-bold bg-slate-50 rounded-xl h-11" placeholder="رقم الشيك أو التحويل" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">ملاحظات البيان</label>
                  <textarea value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="مثال: سداد دفعة من عقد سفرة مهراجا..." />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 p-4 shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPaymentModal(false)} className="font-bold rounded-xl h-11">إلغاء</Button>
              <Button onClick={handleSavePayment} className="font-bold rounded-xl h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">تأكيد السداد وتسجيل السند</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
