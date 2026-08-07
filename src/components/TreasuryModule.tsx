import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  UserCheck, 
  Truck, 
  ShoppingCart, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Building2, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  PieChart as PieIcon, 
  X, 
  Check, 
  HelpCircle,
  Receipt,
  User,
  Users,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Safe, SafeTransaction, Employee, Supplier, CostCenter, LoadingManifest, SafeAudit } from '../types';
import * as XLSX from 'xlsx';

// --- Extended Interfaces for Treasury & Custodies ---
export interface TreasuryCustody {
  id: string;
  custodianName: string; // e.g. سائق، مسؤول مشتريات، كريم المدير
  custodianRole: 'سائق' | 'مشتريات' | 'إدارة/كريم' | 'عامل' | 'أخرى';
  employeeId?: string;
  safeId: string; // الخزنة التي صُرِفت منها العهدة
  amount: number;
  spentAmount: number;
  remainingAmount: number;
  date: string;
  purpose: string; // السبب أو الغرض من العهدة
  status: 'نشطة' | 'مصفاة جزئياً' | 'مصفاة بالكامل';
  notes?: string;
  createdAt?: any;
}

export interface CustodySettlementExpense {
  id: string;
  custodyId: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  invoiceNo?: string;
  supplierName?: string;
  notes?: string;
}

// --- Custody Role Caps & Policies ---
export const ROLE_CUSTODY_CAPS: Record<string, { label: string; maxAmount: number }> = {
  'سائق': { label: 'سائق (عهد الوقود والنولون)', maxAmount: 5000 },
  'مشتريات': { label: 'مسؤول مشتريات (عهد الخامات)', maxAmount: 30000 },
  'إدارة/كريم': { label: 'إدارة / كريم (عهد المدير لشراء الخامات)', maxAmount: 50000 },
  'عامل': { label: 'عامل / موظف', maxAmount: 3000 },
  'أخرى': { label: 'فئات أخرى', maxAmount: 10000 },
};

export function TreasuryModule() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'custodies' | 'karim_account' | 'safes' | 'audit' | 'analytics'>('transactions');
  
  // Firestore Collections
  const [safes, setSafes] = useState<Safe[]>([]);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [custodies, setCustodies] = useState<TreasuryCustody[]>([]);
  const [settlementExpenses, setSettlementExpenses] = useState<CustodySettlementExpense[]>([]);
  const [audits, setAudits] = useState<SafeAudit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  // Daily Cash Closure & Audit States
  const [auditSafeId, setAuditSafeId] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [autoAdjustVariance, setAutoAdjustVariance] = useState<boolean>(true);
  const [showAuditSlipModal, setShowAuditSlipModal] = useState<SafeAudit | null>(null);

  // Cash Denomination Counter (فئات النقدية)
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '1': 0
  });

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSafeId, setSelectedSafeId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Modal States
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddCustodyModal, setShowAddCustodyModal] = useState(false);
  const [showSettleCustodyModal, setShowSettleCustodyModal] = useState<TreasuryCustody | null>(null);
  const [showAddSafeModal, setShowAddSafeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState<SafeTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<SafeTransaction | null>(null);

  // Form States
  const [txForm, setTxForm] = useState({
    safeId: '',
    type: 'مصروفات' as SafeTransaction['type'],
    amount: 0,
    category: 'مصروفات تشغيلية',
    description: '',
    custodianName: '',
    costCenterId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [custodyForm, setCustodyForm] = useState({
    custodianName: '',
    custodianRole: 'مشتريات' as TreasuryCustody['custodianRole'],
    employeeId: '',
    safeId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    notes: ''
  });

  const [overrideBlockedCustody, setOverrideBlockedCustody] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [settlementItems, setSettlementItems] = useState<{
    category: string;
    description: string;
    amount: number;
    invoiceNo?: string;
  }[]>([
    { category: 'شراء خامات', description: '', amount: 0 }
  ]);

  const [safeForm, setSafeForm] = useState({
    name: '',
    type: 'خزنة رئيسية' as Safe['type'],
    initialBalance: 0,
    minBalanceThreshold: 20000
  });

  const [editingSafeThresholdId, setEditingSafeThresholdId] = useState<string | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(20000);

  const [transferForm, setTransferForm] = useState({
    fromSafeId: '',
    toSafeId: '',
    amount: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- Real-Time Firestore Sync ---
  useEffect(() => {
    const unsubSafes = onSnapshot(collection(db, 'safes'), snap => {
      setSafes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Safe)));
    });

    const unsubTxs = onSnapshot(query(collection(db, 'safeTransactions'), orderBy('date', 'desc')), snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as SafeTransaction)));
    });

    const unsubCustodies = onSnapshot(query(collection(db, 'treasuryCustodies'), orderBy('date', 'desc')), snap => {
      setCustodies(snap.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryCustody)));
    });

    const unsubSettlements = onSnapshot(collection(db, 'custodySettlements'), snap => {
      setSettlementExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustodySettlementExpense)));
    });

    const unsubAudits = onSnapshot(query(collection(db, 'safeAudits'), orderBy('date', 'desc')), snap => {
      setAudits(snap.docs.map(d => ({ id: d.id, ...d.data() } as SafeAudit)));
    });

    const unsubEmployees = onSnapshot(collection(db, 'employees'), snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), snap => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
    });

    const unsubCostCenters = onSnapshot(collection(db, 'costCenters'), snap => {
      setCostCenters(snap.docs.map(d => ({ id: d.id, ...d.data() } as CostCenter)));
    });

    return () => {
      unsubSafes();
      unsubTxs();
      unsubCustodies();
      unsubSettlements();
      unsubAudits();
      unsubEmployees();
      unsubSuppliers();
      unsubCostCenters();
    };
  }, []);

  // Pre-fill default safes
  useEffect(() => {
    if (safes.length > 0) {
      if (!txForm.safeId) setTxForm(prev => ({ ...prev, safeId: safes[0].id }));
      if (!custodyForm.safeId) setCustodyForm(prev => ({ ...prev, safeId: safes[0].id }));
      if (!transferForm.fromSafeId) setTransferForm(prev => ({ ...prev, fromSafeId: safes[0].id }));
      if (!transferForm.toSafeId && safes.length > 1) setTransferForm(prev => ({ ...prev, toSafeId: safes[1].id }));
      if (!auditSafeId) setAuditSafeId(safes[0].id);
    }
  }, [safes]);

  // Daily Cash Audit Calculations
  const countedCashTotal = useMemo(() => {
    return (
      (denominations['200'] || 0) * 200 +
      (denominations['100'] || 0) * 100 +
      (denominations['50'] || 0) * 50 +
      (denominations['20'] || 0) * 20 +
      (denominations['10'] || 0) * 10 +
      (denominations['5'] || 0) * 5 +
      (denominations['1'] || 0) * 1
    );
  }, [denominations]);

  const currentSelectedSafeForAudit = useMemo(() => {
    return safes.find(s => s.id === auditSafeId) || safes[0];
  }, [safes, auditSafeId]);

  const systemBookBalance = currentSelectedSafeForAudit?.balance || 0;
  const cashVariance = countedCashTotal - systemBookBalance;

  const handleSaveAudit = async () => {
    if (!currentSelectedSafeForAudit) {
      alert('يرجى اختيار الخزنة المراد جردها.');
      return;
    }

    try {
      let status: 'مطابق' | 'عجز' | 'زيادة' = 'مطابق';
      if (cashVariance < 0) status = 'عجز';
      else if (cashVariance > 0) status = 'زيادة';

      let txId = '';

      // Auto-post variance adjustment transaction if enabled
      if (autoAdjustVariance && cashVariance !== 0) {
        const isShortage = cashVariance < 0;
        const absVariance = Math.abs(cashVariance);

        const txDoc = await addDoc(collection(db, 'safeTransactions'), {
          safeId: currentSelectedSafeForAudit.id,
          type: isShortage ? 'مصروفات' : 'إيداع',
          category: isShortage ? 'تسوية عجز خزينة' : 'تسوية زيادة خزينة',
          amount: absVariance,
          description: `تسوية أوتوماتيكية ناتجة عن جرد الخزينة اليومي بتاريخ ${auditDate} (${status}: ${absVariance.toLocaleString()} ج.م)`,
          date: auditDate,
          createdBy: 'المحاسب',
          createdAt: serverTimestamp()
        });
        txId = txDoc.id;

        // Force balance alignment
        await updateDoc(doc(db, 'safes', currentSelectedSafeForAudit.id), {
          balance: countedCashTotal
        });
      }

      await addDoc(collection(db, 'safeAudits'), {
        safeId: currentSelectedSafeForAudit.id,
        safeName: currentSelectedSafeForAudit.name,
        date: auditDate,
        systemBalance: systemBookBalance,
        physicalBalance: countedCashTotal,
        difference: cashVariance,
        status,
        notes: auditNotes,
        denominations,
        createdBy: 'المحاسب المسؤول',
        adjustedTransactionId: txId,
        createdAt: serverTimestamp()
      });

      alert('تم اعتماد الجرد وإغلاق الخزينة اليومي بنجاح!');
      setDenominations({ '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0 });
      setAuditNotes('');
    } catch (err) {
      console.error('Error saving cash audit:', err);
      alert('حدث خطأ أثناء إتمام الجرد.');
    }
  };

  const handleDeleteAudit = async (audit: SafeAudit) => {
    if (!confirm('هل أنت متأكد من حذف سجل الجرد هذا؟')) return;
    try {
      await deleteDoc(doc(db, 'safeAudits', audit.id));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Categories matching user operation requirements ---
  const inflowCategories = [
    'إيداع مالك / الحاج وليد',
    'مبيعات المعارض والمنتجات',
    'بيع نشارة وكسر خشب',
    'بيع خردة حديد ومخلفات',
    'تحصيلات عملاء وموردين',
    'سلفة / تمويل طوارئ',
    'مرتجع مصروفات / عهدة',
    'إيرادات متنوعة أخرى'
  ];

  const outflowCategories = [
    'أجور وسلف عمال يومية وإنتاج',
    'شراء خامات نقدي من مورد',
    'دفعة حساب موردين',
    'نولون وشحن ونقل',
    'إكراميات ونثريات',
    'فواتير (كهرباء / مياه / أرضي / إنترنت)',
    'بنزين وسولار وغاز سيارات',
    'صيانة معدات وسن صواني',
    'عهدة سائقين',
    'عهدة مشتريات',
    'عهدة إدارة / كريم',
    'مسحوبات شخصية للحاج وليد',
    'مصروفات تشغيلية وإدارية أخرى'
  ];

  // --- KPI Calculations ---
  const totalTreasuryBalance = useMemo(() => {
    return safes.reduce((acc, s) => acc + (s.balance || 0), 0);
  }, [safes]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchSafe = selectedSafeId === 'all' || t.safeId === selectedSafeId;
      const matchType = selectedType === 'all' || t.type === selectedType;
      const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchDate = (!dateRange.start || t.date >= dateRange.start) &&
                        (!dateRange.end || t.date <= dateRange.end);
      return matchSearch && matchSafe && matchType && matchCategory && matchDate;
    });
  }, [transactions, searchTerm, selectedSafeId, selectedType, selectedCategory, dateRange]);

  const monthlyInflows = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'إيداع' || t.type === 'مبيعات')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const monthlyOutflows = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'سحب' || t.type === 'مصروفات' || t.type === 'مشتريات' || t.type === 'رواتب')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const activeCustodiesTotal = useMemo(() => {
    return custodies
      .filter(c => c.status !== 'مصفاة بالكامل')
      .reduce((acc, c) => acc + (c.remainingAmount || 0), 0);
  }, [custodies]);

  const ownerWithdrawalsTotal = useMemo(() => {
    return filteredTransactions
      .filter(t => t.category === 'مسحوبات شخصية للحاج وليد' || t.type === 'قرض شخصي')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  // --- Equity & Operational Cost Separation (فصل مسحوبات المالك عن تكاليف التشغيل) ---
  const factoryOperatingExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => (t.type === 'سحب' || t.type === 'مصروفات' || t.type === 'مشتريات' || t.type === 'رواتب') &&
                   t.category !== 'مسحوبات شخصية للحاج وليد' &&
                   t.type !== 'قرض شخصي')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const ownerCapitalInjections = useMemo(() => {
    return filteredTransactions
      .filter(t => t.category === 'إيداع مالك / الحاج وليد' || t.category === 'رأس مال')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const factorySalesRevenue = useMemo(() => {
    return filteredTransactions
      .filter(t => (t.type === 'إيداع' || t.type === 'مبيعات') && 
                   t.category !== 'إيداع مالك / الحاج وليد' && 
                   t.category !== 'سلفة / تمويل طوارئ')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const factoryNetOperatingProfit = useMemo(() => {
    return factorySalesRevenue - factoryOperatingExpenses;
  }, [factorySalesRevenue, factoryOperatingExpenses]);

  const netCashflowAfterDrawings = useMemo(() => {
    return factoryNetOperatingProfit - ownerWithdrawalsTotal + ownerCapitalInjections;
  }, [factoryNetOperatingProfit, ownerWithdrawalsTotal, ownerCapitalInjections]);

  // --- Low Balance Safety Threshold Calculations (تنبيهات السيولة الحرجية) ---
  const DEFAULT_SAFETY_THRESHOLD = 20000;

  const lowBalanceSafes = useMemo(() => {
    return safes.filter(s => {
      const threshold = s.minBalanceThreshold !== undefined ? s.minBalanceThreshold : DEFAULT_SAFETY_THRESHOLD;
      return s.balance < threshold;
    });
  }, [safes]);

  const handleUpdateSafeThreshold = async (safeId: string, newThreshold: number) => {
    try {
      await updateDoc(doc(db, 'safes', safeId), {
        minBalanceThreshold: Number(newThreshold) || DEFAULT_SAFETY_THRESHOLD
      });
      setEditingSafeThresholdId(null);
    } catch (err) {
      console.error('Error updating safe threshold:', err);
    }
  };

  // --- Smart Custody Rule Calculations (سقف العهدة وشرط التصفية 80%) ---
  const recipientActiveCustodies = useMemo(() => {
    if (!custodyForm.custodianName.trim()) return [];
    const nameTrimmed = custodyForm.custodianName.trim().toLowerCase();
    return custodies.filter(c => 
      c.custodianName.trim().toLowerCase() === nameTrimmed && 
      c.status !== 'مصفاة بالكامل'
    );
  }, [custodies, custodyForm.custodianName]);

  const recipientTotalActiveAmount = useMemo(() => {
    return recipientActiveCustodies.reduce((acc, c) => acc + (c.remainingAmount || 0), 0);
  }, [recipientActiveCustodies]);

  const recipientTotalOriginalAmount = useMemo(() => {
    return recipientActiveCustodies.reduce((acc, c) => acc + (c.amount || 0), 0);
  }, [recipientActiveCustodies]);

  const recipientTotalSpentAmount = useMemo(() => {
    return recipientActiveCustodies.reduce((acc, c) => acc + (c.spentAmount || 0), 0);
  }, [recipientActiveCustodies]);

  const recipientSettlementPercentage = useMemo(() => {
    if (recipientTotalOriginalAmount === 0) return 100;
    return (recipientTotalSpentAmount / recipientTotalOriginalAmount) * 100;
  }, [recipientTotalOriginalAmount, recipientTotalSpentAmount]);

  // --- Karim El-Najgar Executive Account Calculations (ربط الخزنة بحساب كريم النجار) ---
  const karimCustodies = useMemo(() => {
    return custodies.filter(c => 
      (c.custodianName && c.custodianName.includes('كريم')) || 
      c.custodianRole === 'إدارة/كريم'
    );
  }, [custodies]);

  const karimTotalCustodiesAmount = useMemo(() => {
    return karimCustodies.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [karimCustodies]);

  const karimTotalSettledAmount = useMemo(() => {
    const karimCustodyIds = new Set(karimCustodies.map(c => c.id));
    return settlementExpenses
      .filter(e => karimCustodyIds.has(e.custodyId))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [karimCustodies, settlementExpenses]);

  const karimActiveOutstandingBalance = useMemo(() => {
    return karimCustodies
      .filter(c => c.status !== 'مصفاة بالكامل')
      .reduce((sum, c) => {
        const spentForThis = settlementExpenses
          .filter(e => e.custodyId === c.id)
          .reduce((s, e) => s + (e.amount || 0), 0);
        return sum + Math.max(0, (c.amount || 0) - spentForThis);
      }, 0);
  }, [karimCustodies, settlementExpenses]);

  const karimSettlementCompletionRate = useMemo(() => {
    if (karimTotalCustodiesAmount === 0) return 100;
    return Math.min(100, (karimTotalSettledAmount / karimTotalCustodiesAmount) * 100);
  }, [karimTotalCustodiesAmount, karimTotalSettledAmount]);

  const selectedRoleCap = ROLE_CUSTODY_CAPS[custodyForm.custodianRole]?.maxAmount || 10000;

  // Rule 1: Cannot issue new custody if active custodies settlement rate is < 80%
  const isSettlementBlocked = recipientActiveCustodies.length > 0 && recipientSettlementPercentage < 80;

  // Rule 2: Cannot issue if total active + new requested amount exceeds category cap
  const isCapExceeded = (recipientTotalActiveAmount + Number(custodyForm.amount || 0)) > selectedRoleCap;

  const isCustodyIssuanceBlocked = isSettlementBlocked || isCapExceeded;

  // --- Handlers ---
  const handleAddTransaction = async () => {
    if (!txForm.safeId || txForm.amount <= 0 || !txForm.description.trim()) {
      alert('يرجى اختيار الخزنة، وإدخال مبلغ صحيح ووصف الحركة.');
      return;
    }

    try {
      // 1. Add Transaction
      await addDoc(collection(db, 'safeTransactions'), {
        safeId: txForm.safeId,
        type: txForm.type,
        amount: Number(txForm.amount),
        category: txForm.category,
        description: txForm.description,
        costCenterId: txForm.costCenterId || '',
        date: txForm.date,
        createdBy: 'المحاسب',
        createdAt: serverTimestamp()
      });

      // 2. Adjust Safe Balance
      const isIncrease = txForm.type === 'إيداع' || txForm.type === 'مبيعات';
      const changeAmount = isIncrease ? Number(txForm.amount) : -Number(txForm.amount);
      await updateDoc(doc(db, 'safes', txForm.safeId), {
        balance: increment(changeAmount)
      });

      setShowAddTxModal(false);
      setTxForm({
        safeId: safes[0]?.id || '',
        type: 'مصروفات',
        amount: 0,
        category: 'مصروفات تشغيلية',
        description: '',
        custodianName: '',
        costCenterId: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('حدث خطأ أثناء إتمام العملية.');
    }
  };

  const handleAddCustody = async () => {
    if (!custodyForm.safeId || custodyForm.amount <= 0 || !custodyForm.custodianName.trim()) {
      alert('يرجى تحديد الخزنة، اسم المستلم/المسؤول والمبلغ الصادر.');
      return;
    }

    if (isCustodyIssuanceBlocked && !overrideBlockedCustody) {
      alert(`عفواً! لا يمكن صرف العهدة بسبب قيود الأمان التالية:\n` +
        (isSettlementBlocked ? `- المستلم لديه عهد معلقة لم تُصفَّ بنسبة 80% على الأقل (مصفى حالياً: ${recipientSettlementPercentage.toFixed(1)}%).\n` : '') +
        (isCapExceeded ? `- المبلغ الإجمالي المطلوب يرفع إجمالي العهدة إلى ${(recipientTotalActiveAmount + Number(custodyForm.amount)).toLocaleString()} ج.م متجاوزاً سقف الفئة المسموح بها (${selectedRoleCap.toLocaleString()} ج.م).\n` : '') +
        `يرجى تصفية العهد القائمة أولاً أو تفعيل خيار "تجاوز الحظر بموافقة استثنائية من الإدارة".`
      );
      return;
    }

    if (isCustodyIssuanceBlocked && overrideBlockedCustody && !overrideReason.trim()) {
      alert('يرجى كتابة سبب التجاوز الاستثنائي وموافقة الإدارة لمتابعة الحفظ.');
      return;
    }

    try {
      // 1. Add Custody Document
      await addDoc(collection(db, 'treasuryCustodies'), {
        custodianName: custodyForm.custodianName.trim(),
        custodianRole: custodyForm.custodianRole,
        employeeId: custodyForm.employeeId || '',
        safeId: custodyForm.safeId,
        amount: Number(custodyForm.amount),
        spentAmount: 0,
        remainingAmount: Number(custodyForm.amount),
        date: custodyForm.date,
        purpose: custodyForm.purpose,
        status: 'نشطة',
        notes: isCustodyIssuanceBlocked ? `تجاوز استثنائي بموافقة الإدارة: ${overrideReason} | ${custodyForm.notes || ''}` : custodyForm.notes,
        createdAt: serverTimestamp()
      });

      // 2. Add Ledger Transaction for Outflow
      await addDoc(collection(db, 'safeTransactions'), {
        safeId: custodyForm.safeId,
        type: 'مصروفات',
        category: `صرف عهدة - ${custodyForm.custodianRole}`,
        amount: Number(custodyForm.amount),
        description: `صرف عهدة مالية إلى (${custodyForm.custodianName}) - ${custodyForm.purpose}${isCustodyIssuanceBlocked ? ' [صرف استثنائي وتجاوز لسقف/شروط العهدة]' : ''}`,
        date: custodyForm.date,
        createdBy: 'المحاسب',
        createdAt: serverTimestamp()
      });

      // 3. Deduct from Safe Balance
      await updateDoc(doc(db, 'safes', custodyForm.safeId), {
        balance: increment(-Number(custodyForm.amount))
      });

      setShowAddCustodyModal(false);
      setOverrideBlockedCustody(false);
      setOverrideReason('');
      setCustodyForm({
        custodianName: '',
        custodianRole: 'مشتريات',
        employeeId: '',
        safeId: safes[0]?.id || '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        purpose: '',
        notes: ''
      });
      alert('تم صرف العهدة بنجاح وتحديث حساب الخزنة.');
    } catch (err) {
      console.error('Error creating custody:', err);
      alert('حدث خطأ أثناء صرف العهدة.');
    }
  };

  const handleConfirmSettlement = async () => {
    if (!showSettleCustodyModal) return;

    const totalSpent = settlementItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    if (totalSpent <= 0) {
      alert('يرجى إضافة بند مصروف واحد على الأقل بمبلغ صحيح للتصفية.');
      return;
    }

    try {
      const custody = showSettleCustodyModal;
      const originalAmount = custody.amount;
      const returnedAmount = originalAmount - totalSpent;

      // 1. Save detailed settlement expenses
      for (const item of settlementItems) {
        if (item.amount > 0) {
          await addDoc(collection(db, 'custodySettlements'), {
            custodyId: custody.id,
            date: new Date().toISOString().split('T')[0],
            category: item.category,
            amount: Number(item.amount),
            description: item.description || `تسوية عهدة (${custody.custodianName})`,
            invoiceNo: item.invoiceNo || '',
            createdAt: serverTimestamp()
          });

          // Log in main transaction ledger as categorized expense
          await addDoc(collection(db, 'safeTransactions'), {
            safeId: custody.safeId,
            type: 'مصروفات',
            category: item.category,
            amount: Number(item.amount),
            description: `تسوية عهدة [${custody.custodianName}]: ${item.description || item.category}`,
            date: new Date().toISOString().split('T')[0],
            createdBy: 'المحاسب',
            createdAt: serverTimestamp()
          });
        }
      }

      // 2. If there is leftover cash returned back to Treasury
      if (returnedAmount > 0) {
        await addDoc(collection(db, 'safeTransactions'), {
          safeId: custody.safeId,
          type: 'إيداع',
          category: 'مرتجع مصروفات / عهدة',
          amount: Number(returnedAmount),
          description: `استرداد المتبقي من عهدة (${custody.custodianName})`,
          date: new Date().toISOString().split('T')[0],
          createdBy: 'المحاسب',
          createdAt: serverTimestamp()
        });

        // Add back leftover money to the Safe
        await updateDoc(doc(db, 'safes', custody.safeId), {
          balance: increment(returnedAmount)
        });
      } else if (returnedAmount < 0) {
        // Custodian spent more than advance, treasury reimburses difference
        const reimbursement = Math.abs(returnedAmount);
        await addDoc(collection(db, 'safeTransactions'), {
          safeId: custody.safeId,
          type: 'مصروفات',
          category: 'صرف فارق عهدة',
          amount: Number(reimbursement),
          description: `صرف فارق تسوية عهدة إلى (${custody.custodianName})`,
          date: new Date().toISOString().split('T')[0],
          createdBy: 'المحاسب',
          createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'safes', custody.safeId), {
          balance: increment(-reimbursement)
        });
      }

      // 3. Mark custody document as settled (full vs partial)
      const previousSpent = custody.spentAmount || 0;
      const newSpentTotal = previousSpent + totalSpent;
      const netRemaining = Math.max(0, custody.amount - newSpentTotal);
      const isFullSettlement = netRemaining <= 0 || returnedAmount > 0;

      await updateDoc(doc(db, 'treasuryCustodies', custody.id), {
        spentAmount: newSpentTotal,
        remainingAmount: isFullSettlement ? 0 : netRemaining,
        status: isFullSettlement ? 'مصفاة بالكامل' : 'مصفاة جزئياً'
      });

      setShowSettleCustodyModal(null);
      setSettlementItems([{ category: 'شراء خامات', description: '', amount: 0 }]);
    } catch (err) {
      console.error('Error settling custody:', err);
    }
  };

  const handleRunKarimAccountTest = async () => {
    try {
      const defaultSafeId = safes[0]?.id || 'main_safe';
      const testDate = new Date().toISOString().split('T')[0];

      // 1. Create Test Custody of 10,000 EGP for Karim
      const custodyRef = await addDoc(collection(db, 'treasuryCustodies'), {
        custodianName: 'كريم النجار',
        custodianRole: 'إدارة/كريم',
        employeeId: 'EMP-KARIM',
        safeId: defaultSafeId,
        amount: 10000,
        spentAmount: 4000,
        remainingAmount: 6000,
        purpose: 'تجربة واختبار شراء خامات وتغليف للمصنع (اختبار تجريبي)',
        date: testDate,
        status: 'مصفاة جزئياً',
        createdAt: serverTimestamp()
      });

      // 2. Add Test Settlement Expense of 4,000 EGP
      await addDoc(collection(db, 'custodySettlements'), {
        custodyId: custodyRef.id,
        date: testDate,
        category: 'شراء خامات',
        amount: 4000,
        description: 'فاتورة تجريبية - شراء خشبيات وتغليف ورشة المشتريات',
        invoiceNo: 'TEST-INV-101',
        createdAt: serverTimestamp()
      });

      // 3. Record Safe Transaction
      await addDoc(collection(db, 'safeTransactions'), {
        safeId: defaultSafeId,
        type: 'مصروفات',
        category: 'عهد وتصفية',
        amount: 10000,
        description: 'صرف عهدة نقدية تنفيذي إلى كريم النجار (اختبار تجريبي)',
        date: testDate,
        createdBy: 'أمين الخزنة',
        createdAt: serverTimestamp()
      });

      alert('✅ تم تنفيذ الاختبار التجريبي بنجاح! تم إنشاء عهدة تجريبية بقيمة 10,000 ج.م وتصفية جزئية بقيمة 4,000 ج.م. يمكنك الآن رؤية النتائج المباشرة في كشف حساب كريم والمحاسبة.');
    } catch (err) {
      console.error('Error running test for Karim account:', err);
      alert('حدث خطأ أثناء إجراء الاختبار التجريبي: ' + (err as Error).message);
    }
  };

  const handleAddSafe = async () => {
    if (!safeForm.name.trim()) return;
    try {
      await addDoc(collection(db, 'safes'), {
        name: safeForm.name.trim(),
        type: safeForm.type,
        balance: Number(safeForm.initialBalance) || 0,
        minBalanceThreshold: Number(safeForm.minBalanceThreshold) || DEFAULT_SAFETY_THRESHOLD
      });
      setShowAddSafeModal(false);
      setSafeForm({ name: '', type: 'خزنة رئيسية', initialBalance: 0, minBalanceThreshold: 20000 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferSafes = async () => {
    if (!transferForm.fromSafeId || !transferForm.toSafeId || transferForm.amount <= 0) {
      alert('يرجى تحديد الخزنة المصدر والخزنة المستلمة ومبلغ التحويل.');
      return;
    }
    if (transferForm.fromSafeId === transferForm.toSafeId) {
      alert('لا يمكن التحويل لنفس الخزنة.');
      return;
    }

    try {
      const fromSafe = safes.find(s => s.id === transferForm.fromSafeId);
      const toSafe = safes.find(s => s.id === transferForm.toSafeId);

      // Deduct from Source Safe
      await updateDoc(doc(db, 'safes', transferForm.fromSafeId), {
        balance: increment(-Number(transferForm.amount))
      });
      await addDoc(collection(db, 'safeTransactions'), {
        safeId: transferForm.fromSafeId,
        type: 'تحويل',
        category: 'تحويل بين الخزائن',
        amount: Number(transferForm.amount),
        description: `تحويل صادرة إلى (${toSafe?.name}) - ${transferForm.notes}`,
        date: transferForm.date,
        createdBy: 'المحاسب',
        createdAt: serverTimestamp()
      });

      // Add to Target Safe
      await updateDoc(doc(db, 'safes', transferForm.toSafeId), {
        balance: increment(Number(transferForm.amount))
      });
      await addDoc(collection(db, 'safeTransactions'), {
        safeId: transferForm.toSafeId,
        type: 'تحويل',
        category: 'تحويل بين الخزائن',
        amount: Number(transferForm.amount),
        description: `تحويل وارد من (${fromSafe?.name}) - ${transferForm.notes}`,
        date: transferForm.date,
        createdBy: 'المحاسب',
        createdAt: serverTimestamp()
      });

      setShowTransferModal(false);
      setTransferForm({
        fromSafeId: safes[0]?.id || '',
        toSafeId: safes[1]?.id || '',
        amount: 0,
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (tx: SafeTransaction) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحركة المالية؟ سيتم تعديل رصيد الخزنة تلقائياً.')) return;
    try {
      const isIncrease = tx.type === 'إيداع' || tx.type === 'مبيعات';
      // Reverse the balance effect
      const reverseAmount = isIncrease ? -Number(tx.amount) : Number(tx.amount);

      await updateDoc(doc(db, 'safes', tx.safeId), {
        balance: increment(reverseAmount)
      });
      await deleteDoc(doc(db, 'safeTransactions', tx.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportXLSX = () => {
    const dataToExport = filteredTransactions.map(t => {
      const safe = safes.find(s => s.id === t.safeId);
      return {
        'التاريخ': t.date,
        'الخزنة': safe?.name || 'غير محدد',
        'نوع الحركة': t.type,
        'البند / الفئة': t.category || '-',
        'المبلغ (ج.م)': t.amount,
        'البيان والشرح': t.description,
        'بواسطة': t.createdBy || 'المحاسب'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الخزنة والمالية');
    XLSX.writeFile(wb, `Treasury_Ledger_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24 text-right" dir="rtl">
      
      {/* Top Title Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
                الخزينة والمالية والعهد
              </h1>
              <p className="text-slate-500 font-bold text-base mt-2">
                إدارة الخزائن، متابعة المقبوضات والمصروفات، وتسوية عهد السائقين والمشتريات
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddCustodyModal(true)}
            className="px-5 py-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 font-black text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <UserCheck size={18} />
            صرف عهدة جديدة
          </button>
          
          <button
            onClick={() => setShowAddTxModal(true)}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Plus size={18} />
            إضافة حركة مالية
          </button>
          
          <button
            onClick={handleExportXLSX}
            className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-black text-sm flex items-center gap-2 transition-all"
          >
            <Download size={18} />
            تصدير XLSX
          </button>
        </div>
      </div>

      {/* --- CRITICAL LOW BALANCE ALERT BANNER (تنبيهات السيولة الحرجية) --- */}
      {lowBalanceSafes.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950 via-rose-900 to-slate-900 text-white shadow-xl border border-red-700/80 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-red-800/80 pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 shrink-0">
                <AlertCircle size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg text-red-200">تنبيه حرج: انخفاض سيولة الخزينة عن حد الأمان المطلوب!</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                    {lowBalanceSafes.length} {lowBalanceSafes.length === 1 ? 'خزنة حرجية' : 'خزائن حرجية'}
                  </span>
                </div>
                <p className="text-xs font-bold text-red-200 mt-1 leading-relaxed max-w-3xl">
                  انخفض رصيد الخزائن الموضحة أدناه عن حد الأمان المحدد (20,000 ج.م). يرجى قيام الإدارة أو الحاج وليد بتغذية الخزينة لتفادي تعطل مصاريف التشغيل اليومية وشراء الخامات ونفقات النولون.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <button
                onClick={() => {
                  setTxForm(prev => ({
                    ...prev,
                    type: 'إيداع',
                    category: 'إيداع مالك / الحاج وليد',
                    safeId: lowBalanceSafes[0]?.id || prev.safeId,
                    description: 'تغذية عاجلة للخزينة لتفادي انخفاض حد الأمان'
                  }));
                  setShowAddTxModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Zap size={16} />
                تغذية الخزينة فوراً (إيداع)
              </button>

              <button
                onClick={() => {
                  setActiveTab('safes');
                  setShowTransferModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                تحويل سيولة
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {lowBalanceSafes.map(s => {
              const threshold = s.minBalanceThreshold !== undefined ? s.minBalanceThreshold : DEFAULT_SAFETY_THRESHOLD;
              const deficit = threshold - s.balance;

              return (
                <div key={s.id} className="p-3.5 rounded-xl bg-red-900/60 border border-red-700/60 flex items-center justify-between">
                  <div>
                    <span className="font-black text-red-100 block text-sm">{s.name}</span>
                    <span className="text-[10px] font-bold text-red-300">حد الأمان: <span className="font-mono">{threshold.toLocaleString()} ج.م</span></span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="font-black text-base text-amber-300 block">{s.balance.toLocaleString()} ج.م</span>
                    <span className="text-[10px] font-bold text-red-300">العجز الحالي: -{deficit.toLocaleString()} ج.م</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Glassmorphism Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Cash Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden flex flex-col justify-between h-44 group">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">إجمالي السيولة النقدية</span>
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400 backdrop-blur-md">
              <Wallet size={20} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-3xl lg:text-4xl font-black font-mono tracking-tighter">
              {totalTreasuryBalance.toLocaleString()} <span className="text-xs font-sans text-emerald-400">ج.م</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">موزعة على {safes.length} خزائن/حسابات</p>
          </div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-all pointer-events-none" />
        </div>

        {/* Card 2: Inflows */}
        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-100/50 flex flex-col justify-between h-44 hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">إجمالي المقبوضات للفترة</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black font-mono tracking-tighter text-emerald-600">
              +{monthlyInflows.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">تضم المبيعات وإيداعات المالك</p>
          </div>
        </div>

        {/* Card 3: Outflows */}
        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-100/50 flex flex-col justify-between h-44 hover:border-red-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">إجمالي المصروفات للفترة</span>
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black font-mono tracking-tighter text-red-600">
              -{monthlyOutflows.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">خامات، أجور، نولون وموافقات</p>
          </div>
        </div>

        {/* Card 4: Unsettled Custodies */}
        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-100/50 flex flex-col justify-between h-44 hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">العهد النشطة غير المصفاة</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black font-mono tracking-tighter text-purple-600">
              {activeCustodiesTotal.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
            </p>
            <p className="text-[10px] font-bold text-purple-500 mt-1 font-mono">
              لدى السائقين والمشتريات
            </p>
          </div>
        </div>

        {/* Card 5: Owner Withdrawals */}
        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-100/50 flex flex-col justify-between h-44 hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">مسحوبات الحاج وليد</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <User size={20} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black font-mono tracking-tighter text-amber-700">
              {ownerWithdrawalsTotal.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">مسحوبات شخصية تراكمية للفترة</p>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          <Receipt size={18} />
          دفتر الحركة المالية اليومية ({filteredTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('custodies')}
          className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'custodies'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          <UserCheck size={18} />
          إدارة وتصفية العهد ({custodies.filter(c => c.status !== 'مصفاة بالكامل').length} نشطة)
        </button>

        <button
          onClick={() => setActiveTab('karim_account')}
          className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'karim_account'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg shadow-purple-600/20 ring-2 ring-purple-400/50'
              : 'bg-white text-purple-900 font-black hover:bg-purple-50/80 border border-purple-200'
          }`}
        >
          <UserCheck size={18} className={activeTab === 'karim_account' ? 'text-amber-300' : 'text-purple-600'} />
          👑 حساب ومحفظة كريم النجار ({karimCustodies.filter(c => c.status !== 'مصفاة بالكامل').length} نشطة)
        </button>

        <button
          onClick={() => setActiveTab('safes')}
          className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'safes'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          <Building2 size={18} />
          الخزائن والتحويلات ({safes.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          <ShieldCheck size={18} />
          الجرد والإغلاق اليومي ({audits.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/10'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          <PieIcon size={18} />
          حقوق الملكية ومسحوبات المالك
        </button>
      </div>

      {/* --- TAB 1: TRANSACTIONS LEDGER --- */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          
          {/* Controls & Filter Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center print:hidden">
            
            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="بحث بالوصف، البند، أوشخص..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 h-11 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Safe Filter */}
              <select
                value={selectedSafeId}
                onChange={e => setSelectedSafeId(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-700 outline-none"
              >
                <option value="all">كل الخزائن</option>
                {safes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-700 outline-none"
              >
                <option value="all">كل الحركات</option>
                <option value="إيداع">إيداع (وارد)</option>
                <option value="مصروفات">مصروفات (صادر)</option>
                <option value="مبيعات">مبيعات</option>
                <option value="مشتريات">مشتريات خامات</option>
                <option value="تحويل">تحويل بين الخزائن</option>
              </select>

              {/* Date Start/End */}
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-700 outline-none"
              />
              <span className="text-slate-400 font-bold text-xs">إلى</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-700 outline-none"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 font-black text-xs text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-6">التاريخ</th>
                    <th className="py-4 px-4">الخزنة</th>
                    <th className="py-4 px-4">النوع</th>
                    <th className="py-4 px-4">البند / الفئة</th>
                    <th className="py-4 px-4">البيان والشرح</th>
                    <th className="py-4 px-4 text-left">المبلغ</th>
                    <th className="py-4 px-6 text-center print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-sm">
                  {filteredTransactions.map(tx => {
                    const safe = safes.find(s => s.id === tx.safeId);
                    const isIncome = tx.type === 'إيداع' || tx.type === 'مبيعات';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6 text-slate-500 font-mono text-xs">{tx.date}</td>
                        <td className="py-4 px-4 text-slate-900 font-black">{safe?.name || 'الخزنة الرئيسية'}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                            isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-bold">{tx.category || '-'}</td>
                        <td className="py-4 px-4 text-slate-800 max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td className={`py-4 px-4 text-left font-black font-mono text-base ${
                          isIncome ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {isIncome ? '+' : '-'}{tx.amount.toLocaleString()} <span className="text-xs font-sans">ج.م</span>
                        </td>
                        <td className="py-4 px-6 text-center print:hidden">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setShowVoucherModal(tx)}
                              title="طباعة سند"
                              className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(tx)}
                              title="حذف"
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 font-bold">
                        لا توجد حركات مالية مطابقة للبحث أو الفترة المحددة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: CUSTODIES MANAGEMENT --- */}
      {activeTab === 'custodies' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div>
              <h3 className="font-black text-xl text-slate-900">سجل العهد المالية النشطة والسابقة</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                تصفية عهد السائقين، المشتريات، ومدراء الإنتاج مع تسجيل المصروفات الصادرة منها
              </p>
            </div>
            
            <button
              onClick={() => setShowAddCustodyModal(true)}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Plus size={16} />
              صرف عهدة جديدة
            </button>
          </div>

          {/* Custody Policies & Caps Overview Banner */}
          <div className="p-5 rounded-2xl bg-purple-950 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-purple-800/80 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-purple-300" />
                <h4 className="font-black text-base text-purple-200">سقف العهد المالية وقواعد التصفية (Custody Rules & Limits)</h4>
              </div>
              <span className="text-xs font-bold text-purple-300 bg-purple-900/80 px-3 py-1 rounded-full border border-purple-700/60">
                شرط حظر الصرف التلقائي: التصفية بنسبة 80% على الأقل قبل صرف عهدة جديدة
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              {Object.entries(ROLE_CUSTODY_CAPS).map(([roleKey, capObj]) => (
                <div key={roleKey} className="p-3 rounded-xl bg-purple-900/60 border border-purple-800/60 flex flex-col justify-between">
                  <span className="font-bold text-purple-300 block mb-1">{capObj.label}</span>
                  <span className="font-mono font-black text-sm text-amber-300">{capObj.maxAmount.toLocaleString()} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {custodies.map(custody => {
              const safe = safes.find(s => s.id === custody.safeId);
              const isSettled = custody.status === 'مصفاة بالكامل';

              return (
                <div 
                  key={custody.id} 
                  className={`p-6 rounded-2xl border transition-all bg-white shadow-sm flex flex-col justify-between ${
                    isSettled ? 'border-slate-200 opacity-75' : 'border-purple-200 shadow-purple-500/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        isSettled ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {custody.status}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">{custody.date}</span>
                    </div>

                    <h4 className="font-black text-lg text-slate-900 flex items-center gap-2">
                      <UserCheck size={20} className="text-purple-600" />
                      {custody.custodianName}
                    </h4>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      الصفة: <span className="text-slate-800 font-black">{custody.custodianRole}</span> | الخزنة: {safe?.name || 'الرئيسية'}
                    </p>

                    <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>مبلغ العهدة الأصلي:</span>
                        <span className="font-mono font-black text-slate-900">{custody.amount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>إجمالي المنصرف المصفى:</span>
                        <span className="font-mono font-black text-red-600">-{custody.spentAmount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-sm font-black text-slate-900">
                        <span>المتبقي لدى المسؤول:</span>
                        <span className="font-mono text-purple-700">{custody.remainingAmount.toLocaleString()} ج.م</span>
                      </div>
                    </div>

                    {custody.purpose && (
                      <p className="text-xs font-bold text-slate-500 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100/50">
                        الهدف: {custody.purpose}
                      </p>
                    )}
                  </div>

                  {!isSettled && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowSettleCustodyModal(custody);
                          setSettlementItems([{ category: 'شراء خامات', description: '', amount: 0 }]);
                        }}
                        className="w-full py-3 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-md shadow-purple-600/10"
                      >
                        <Scale size={16} />
                        تسوية وتصفية العهدة الآن
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {custodies.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-2xl border border-dashed border-slate-200">
                لا توجد عهد مالية مسجلة حتى الآن.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: SAFES & TRANSFERS --- */}
      {activeTab === 'safes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div>
              <h3 className="font-black text-xl text-slate-900">قائمة الخزائن الحالية ومواقع النقدية</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                إعادة توزيع السيولة والتحويل الفوري بين خزائن المصنع والعهد
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-black text-xs flex items-center gap-2"
              >
                <RefreshCw size={16} />
                تحويل بين خزنتين
              </button>

              <button
                onClick={() => setShowAddSafeModal(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-xs flex items-center gap-2"
              >
                <Plus size={16} />
                إضافة خزنة/حساب جديد
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {safes.map(safe => {
              const threshold = safe.minBalanceThreshold !== undefined ? safe.minBalanceThreshold : DEFAULT_SAFETY_THRESHOLD;
              const isLow = safe.balance < threshold;

              return (
                <div 
                  key={safe.id} 
                  className={`p-6 rounded-2xl bg-white border shadow-sm flex flex-col justify-between transition-all ${
                    isLow ? 'border-red-300 ring-2 ring-red-500/20 bg-red-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                        isLow ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <Wallet size={20} />
                      </div>
                      <span className={`px-3 py-1 rounded-full font-black text-xs ${
                        isLow ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isLow ? '⚠️ سيولة حرجية' : '🟢 سيولة آمنة'}
                      </span>
                    </div>

                    <h4 className="font-black text-xl text-slate-900">{safe.name}</h4>
                    <p className="text-xs font-bold text-slate-400 mt-1">النوع: {safe.type || 'خزنة رئيسية'}</p>

                    <div className="mt-6">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">الرصيد الفعلي الحالي</span>
                      <p className={`text-3xl font-black font-mono tracking-tighter ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                        {safe.balance.toLocaleString()} <span className="text-sm font-sans text-indigo-600">ج.م</span>
                      </p>
                    </div>
                  </div>

                  {/* Safety Limit Threshold Section */}
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">حد أمان السيولة (Min Limit):</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-slate-800">{threshold.toLocaleString()} ج.م</span>
                        <button
                          onClick={() => {
                            setEditingSafeThresholdId(safe.id);
                            setTempThresholdValue(threshold);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                          title="تعديل حد الأمان"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Inline edit threshold form */}
                    {editingSafeThresholdId === safe.id && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs animate-in zoom-in-95 duration-150">
                        <label className="font-bold text-slate-700 block">حد الأمان الجديد لهذه الخزنة (ج.م):</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tempThresholdValue}
                            onChange={e => setTempThresholdValue(Number(e.target.value))}
                            className="w-full h-9 rounded-lg border border-slate-300 px-2 font-mono font-black text-slate-900 bg-white"
                          />
                          <button
                            onClick={() => handleUpdateSafeThreshold(safe.id, tempThresholdValue)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-black text-xs shrink-0 hover:bg-indigo-700"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingSafeThresholdId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs shrink-0 hover:bg-slate-300"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 4: DAILY CASH AUDIT & CLOSURE (الجرد وإغلاق الخزينة) --- */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <ShieldCheck size={24} className="text-emerald-600" />
                الجرد الفعلي للفئات النقدية وإغلاق الخزينة اليومي
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                إدخال عدد الفئات النقدية لمطابقة النقدية الفعلية مع الرصيد الدفتري وتسجيل تسوية العجز أو الزيادة تلقائياً
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1">اختر الخزنة للجرد</label>
                <select
                  value={auditSafeId}
                  onChange={e => setAuditSafeId(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 font-black text-sm text-slate-900 outline-none"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.balance.toLocaleString()} ج.م)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 block mb-1">تاريخ الجرد والإغلاق</label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={e => setAuditDate(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono font-bold text-xs text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Cash Denomination Grid & Real-Time Calculation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col (2 cols): Denominations Count Entry */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-600" />
                  جدول عَدّ الفئات النقدية (الورقية والقطع)
                </h4>
                <button
                  onClick={() => setDenominations({ '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0 })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs flex items-center gap-1"
                >
                  <RefreshCw size={12} /> إعادة ضبط
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: '200', label: 'ورقة فئة 200 جنيه', val: 200, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { key: '100', label: 'ورقة فئة 100 جنيه', val: 100, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                  { key: '50', label: 'ورقة فئة 50 جنيه', val: 50, color: 'bg-purple-50 text-purple-800 border-purple-200' },
                  { key: '20', label: 'ورقة فئة 20 جنيه', val: 20, color: 'bg-amber-50 text-amber-800 border-amber-200' },
                  { key: '10', label: 'ورقة فئة 10 جنيه', val: 10, color: 'bg-orange-50 text-orange-800 border-orange-200' },
                  { key: '5', label: 'ورقة فئة 5 جنيهات', val: 5, color: 'bg-rose-50 text-rose-800 border-rose-200' },
                  { key: '1', label: 'قطع/فراكات فئة 1 جنيه', val: 1, color: 'bg-slate-50 text-slate-800 border-slate-200' },
                ].map(item => {
                  const count = denominations[item.key] || 0;
                  const totalForDenom = count * item.val;

                  return (
                    <div key={item.key} className={`p-4 rounded-xl border ${item.color} flex items-center justify-between gap-3`}>
                      <div>
                        <span className="font-black text-xs block">{item.label}</span>
                        <span className="text-[10px] font-bold opacity-70">
                          المجموع: <span className="font-mono font-black">{totalForDenom.toLocaleString()} ج.م</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={count || ''}
                          onChange={e => setDenominations({ ...denominations, [item.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="0 ورقة"
                          className="w-24 h-10 text-center font-mono font-black text-base bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col (1 col): Audit Summary & Settlement Confirmation */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl flex flex-col justify-between space-y-6">
              <div>
                <h4 className="font-black text-lg text-emerald-400 border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>نتيجة الجرد اليومي</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">{auditDate}</span>
                </h4>

                <div className="mt-6 space-y-4">
                  {/* Total Counted Physical Cash */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 block mb-1">الرصيد الفعلي النقدي (المعدود):</span>
                    <p className="text-3xl font-black font-mono text-emerald-400">
                      {countedCashTotal.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
                    </p>
                  </div>

                  {/* System Book Balance */}
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-xs font-bold text-slate-400 block mb-1">الرصيد الدفتري بالسيستم:</span>
                    <p className="text-2xl font-black font-mono text-slate-200">
                      {systemBookBalance.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
                    </p>
                  </div>

                  {/* Variance Card */}
                  <div className={`p-4 rounded-xl border flex justify-between items-center ${
                    cashVariance === 0 
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                      : cashVariance < 0 
                        ? 'bg-red-950/40 border-red-500/50 text-red-300' 
                        : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">الفارق الناتج عن الجرد:</span>
                      <span className="text-xs font-black">
                        {cashVariance === 0 ? 'مطابق تماماً (لا يوجد فارق)' : cashVariance < 0 ? 'يوجد عجز بالمحاسب' : 'توجد زيادة بالخزينة'}
                      </span>
                    </div>
                    <span className="text-2xl font-black font-mono">
                      {cashVariance > 0 ? `+${cashVariance.toLocaleString()}` : `${cashVariance.toLocaleString()}`} ج.م
                    </span>
                  </div>

                  {/* Auto-Adjust Checkbox */}
                  {cashVariance !== 0 && (
                    <label className="flex items-start gap-2 text-xs font-bold text-slate-300 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={autoAdjustVariance}
                        onChange={e => setAutoAdjustVariance(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>
                        تسجيل حركة تسوية تلقائية بـ ({Math.abs(cashVariance).toLocaleString()} ج.م) في دفتر الخزنة لضبط الرصيد الدفتري مع الفعلي.
                      </span>
                    </label>
                  )}

                  {/* Audit Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">ملاحظات أمين الخزنة / المحاسب</label>
                    <textarea
                      rows={2}
                      value={auditNotes}
                      onChange={e => setAuditNotes(e.target.value)}
                      placeholder="سبب العجز أو الزيادة أو تفاصيل أخرى..."
                      className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveAudit}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <CheckCircle2 size={20} />
                اعتماد الجرد وإغلاق الخزينة اليومي
              </button>
            </div>

          </div>

          {/* Audit History Log */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h4 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-indigo-600" />
              سجل عمليات الجرد وإغلاق الخزائن السابق
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-600 uppercase">
                    <th className="py-3.5 px-4">التاريخ</th>
                    <th className="py-3.5 px-4">الخزنة</th>
                    <th className="py-3.5 px-4">الرصيد الدفتري</th>
                    <th className="py-3.5 px-4">الرصيد الفعلي (المعدود)</th>
                    <th className="py-3.5 px-4">الفارق والنتيجة</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">الملاحظات</th>
                    <th className="py-3.5 px-4 text-center">طباعة / إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-sm">
                  {audits.map(audit => (
                    <tr key={audit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{audit.date}</td>
                      <td className="py-3.5 px-4 text-slate-900 font-black">{audit.safeName || 'الخزنة الرئيسية'}</td>
                      <td className="py-3.5 px-4 font-mono">{audit.systemBalance?.toLocaleString()} ج.م</td>
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">{audit.physicalBalance?.toLocaleString()} ج.م</td>
                      <td className={`py-3.5 px-4 font-mono font-black ${
                        audit.difference === 0 ? 'text-slate-600' : audit.difference < 0 ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {audit.difference > 0 ? `+${audit.difference.toLocaleString()}` : `${audit.difference?.toLocaleString()}`} ج.م
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          audit.status === 'مطابق' ? 'bg-emerald-100 text-emerald-800' : audit.status === 'عجز' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">{audit.notes || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setShowAuditSlipModal(audit)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="عرض وإعادة طباعة إيصال الجرد"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAudit(audit)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="حذف الجرد"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {audits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        لم يتم تسجيل أي عمليات جرد حتى الآن.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: EQUITY & OWNER DRAWINGS SEPARATION (تحليل حقوق الملكية ومسحوبات المالك) --- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Header & Accounting Standard Notice */}
          <div className="p-6 rounded-2xl bg-gradient-to-l from-amber-950 via-slate-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl text-amber-400 flex items-center gap-2">
                <User size={24} className="text-amber-400" />
                فصل مسحوبات المالك الشخصية عن مصاريف التشغيل (Owner Equity vs Operating Costs)
              </h3>
              <p className="text-xs font-bold text-slate-300 mt-1 max-w-3xl leading-relaxed">
                وفقاً للقواعد المحاسبية السليمة، تُسجّل مسحوبات الحاج وليد في بند مستقل بـ (حقوق الملكية) ولا تُحسب ضمن مصاريف تشغيل المصنع، لضمان قياس صافي ربحية المصنع الحقيقية (Net Profit) بدقة ودون تشويه.
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs whitespace-nowrap">
              معيار الإفصاح المالي وحقوق الشركاء
            </div>
          </div>

          {/* Comparative Financial Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Income Statement (Factory Net Profit) */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-600" />
                  قائمة دخل المصنع التشغيلية (Factory Profitability)
                </h4>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">تشغيل فقط</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">إجمالي مبيعات وإيرادات المصنع:</span>
                  <span className="font-mono font-black text-emerald-600">+{factorySalesRevenue.toLocaleString()} ج.م</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">ناقص: مصاريف التشغيل الحقيقية (خامات، أجور، نولون...):</span>
                  <span className="font-mono font-black text-red-600">-{factoryOperatingExpenses.toLocaleString()} ج.م</span>
                </div>

                <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                  <span className="font-black text-slate-900">صافي ربح المصنع التشغيلي (Net Operational Profit):</span>
                  <span className={`font-mono font-black text-lg ${factoryNetOperatingProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {factoryNetOperatingProfit >= 0 ? `+${factoryNetOperatingProfit.toLocaleString()}` : factoryNetOperatingProfit.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Owner Equity Movements */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Scale size={20} className="text-amber-600" />
                  حركة حقوق الملكية والمسحوبات (Owner Equity & Drawings)
                </h4>
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">حساب شخصي</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">إيداعات المالك / ضخ رأس مال (الحاج وليد):</span>
                  <span className="font-mono font-black text-emerald-600">+{ownerCapitalInjections.toLocaleString()} ج.م</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">مسحوبات شخصية (الحاج وليد):</span>
                  <span className="font-mono font-black text-amber-700">-{ownerWithdrawalsTotal.toLocaleString()} ج.م</span>
                </div>

                <div className="pt-3 border-t-2 border-amber-500 flex justify-between items-center bg-amber-50/60 p-3 rounded-xl">
                  <span className="font-black text-amber-950">صافي حركة مسحوبات المالك:</span>
                  <span className="font-mono font-black text-lg text-amber-800">
                    {(ownerCapitalInjections - ownerWithdrawalsTotal).toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Final Treasury Cash Flow Impact */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-black text-base text-amber-400 border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>الأثر النهائي على السيولة النقدية</span>
                  <span className="text-xs font-mono text-slate-400">Cashflow</span>
                </h4>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/80 flex justify-between">
                    <span className="text-slate-400 font-bold">صافي الأرباح التشغيلية:</span>
                    <span className="font-mono font-black text-emerald-400">+{factoryNetOperatingProfit.toLocaleString()} ج.م</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 flex justify-between">
                    <span className="text-slate-400 font-bold">تأثير مسحوبات المالك النقدية:</span>
                    <span className="font-mono font-black text-amber-400">- {ownerWithdrawalsTotal.toLocaleString()} ج.م</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 block mb-1">صافي الفائض النقدي النهائي بالسيستم:</span>
                    <p className="text-2xl font-black font-mono text-white">
                      {netCashflowAfterDrawings.toLocaleString()} <span className="text-xs text-slate-400 font-sans">ج.م</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-[11px] font-bold text-amber-200 leading-normal">
                💡 النتيجة: المصنع يحقق أرباحاً قدرها ({factoryNetOperatingProfit.toLocaleString()} ج.م) والمسحوبات تمخصت عن السيولة المتبقية دون أن تُضعف ربحية الأنشطة.
              </div>
            </div>

          </div>

          {/* Owner Transactions Table Log */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Receipt size={22} className="text-amber-600" />
                  سجل حركة مسحوبات وإيداعات الحاج وليد (Owner Drawings Ledger)
                </h4>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  عرض جميع المقبوضات والمسحوبات الشخصية المسجلة للحاج وليد بالتفصيل
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors print:hidden"
              >
                <Printer size={16} /> طباعة كشف مسحوبات المالك
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-600 uppercase">
                    <th className="py-3.5 px-4">التاريخ</th>
                    <th className="py-3.5 px-4">نوع الحركة</th>
                    <th className="py-3.5 px-4">البند / البيان</th>
                    <th className="py-3.5 px-4">الخزنة</th>
                    <th className="py-3.5 px-4">البيان والتفاصيل</th>
                    <th className="py-3.5 px-4">المبلغ</th>
                    <th className="py-3.5 px-4">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-sm">
                  {transactions
                    .filter(t => t.category === 'مسحوبات شخصية للحاج وليد' || t.category === 'إيداع مالك / الحاج وليد' || t.type === 'قرض شخصي')
                    .map(tx => {
                      const safe = safes.find(s => s.id === tx.safeId);
                      const isInflow = tx.category === 'إيداع مالك / الحاج وليد';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{tx.date}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                              isInflow ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isInflow ? 'إيداع مالك' : 'مسحوبات شخصية'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-900 font-black">{tx.category}</td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs">{safe?.name || 'الخزنة الرئيسية'}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-700 max-w-sm">{tx.description}</td>
                          <td className={`py-3.5 px-4 font-mono font-black text-base ${
                            isInflow ? 'text-emerald-600' : 'text-amber-700'
                          }`}>
                            {isInflow ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`} ج.م
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">{tx.createdBy || 'المحاسب'}</td>
                        </tr>
                      );
                    })}

                  {transactions.filter(t => t.category === 'مسحوبات شخصية للحاج وليد' || t.category === 'إيداع مالك / الحاج وليد' || t.type === 'قرض شخصي').length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        لم يتم تسجيل أي مسحوبات شخصية أو إيداعات للمالك حتى الآن.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB: KARIM EL-NAJGAR EXECUTIVE ACCOUNT (حساب ومحفظة كريم النجار) --- */}
      {activeTab === 'karim_account' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Executive Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white shadow-xl border border-purple-900/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-2xl text-amber-300 shadow-lg shadow-purple-600/30 ring-4 ring-white/10 shrink-0">
                  <UserCheck size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-black text-white">كريم النجار (Karim El-Najgar)</h3>
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1">
                      👑 المدير التنفيذي / مسؤول عهد المشتريات
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-300 mt-1 leading-relaxed">
                    حساب ومحفظة العهد المباشرة لشراء الخامات، مصاريف التشغيل الطارئة، وإدارة السيولة النقدية التنفيذية.
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-purple-200 flex-wrap">
                    <span>سقف العهدة التنفيذية: <strong className="text-white font-mono">50,000 ج.م</strong></span>
                    <span>•</span>
                    <span>شرط الأمان: <strong className="text-emerald-300">تصفية 80%</strong> قبل الصرف الجديد</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar for Karim */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0 w-full md:w-auto justify-end print:hidden">
                <button
                  onClick={handleRunKarimAccountTest}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                  title="إنشاء عهدة وتصفية تجريبية بضغطة زر لاختبار الربط والنتائج الحسابية"
                >
                  <Zap size={16} className="fill-current" />
                  اختبار الحساب تلقائياً (توليد حركة)
                </button>

                <button
                  onClick={() => {
                    setCustodyForm({
                      custodianName: 'كريم النجار',
                      custodianRole: 'إدارة/كريم',
                      employeeId: '',
                      safeId: safes[0]?.id || '',
                      amount: 0,
                      purpose: 'شراء خامات وتغليف للمصنع',
                      date: new Date().toISOString().split('T')[0]
                    });
                    setShowAddCustodyModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Plus size={16} />
                  صرف عهدة جديدة لكريم النجار
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={16} />
                  طباعة كشف الحساب
                </button>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards Grid for Karim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Custodies */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400">إجمالي العهد المسلمة لكريم</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <UserCheck size={20} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black font-mono text-purple-900">
                  {karimTotalCustodiesAmount.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  إجمالي {karimCustodies.length} عهدة مالية مسجلة
                </p>
              </div>
            </div>

            {/* Card 2: Total Settled Expenses */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400">المصروفات والمشتريات المصفاة</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShoppingCart size={20} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black font-mono text-emerald-600">
                  {karimTotalSettledAmount.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
                </p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">
                  مؤيدة بمستندات وفواتير شراء
                </p>
              </div>
            </div>

            {/* Card 3: Active Outstanding Balance */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400">العهدة القائمة طرف كريم حالياً</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <DollarSign size={20} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black font-mono text-amber-600">
                  {karimActiveOutstandingBalance.toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
                </p>
                <p className="text-[10px] font-bold text-amber-600 mt-1">
                  مبالغ متبقية تحت التصفية
                </p>
              </div>
            </div>

            {/* Card 4: Settlement Rate */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400">مؤشر نسبة التصفية والإنجاز</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xl font-black font-mono text-indigo-600">
                    {karimSettlementCompletionRate.toFixed(1)}%
                  </p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    karimSettlementCompletionRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {karimSettlementCompletionRate >= 80 ? 'جاهز لصرف جديد' : 'مطلوب استكمال التصفية'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      karimSettlementCompletionRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, karimSettlementCompletionRate)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Custodies Ledger Table for Karim El-Najgar */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <UserCheck size={20} className="text-purple-600" />
                  سجل عهد ومشتريات كريم النجار التفصيلي
                </h4>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  بيان بكافة العهد المسلمة، المصروفات المصفاة، والمبالغ المتبقية
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-600 uppercase">
                    <th className="py-3.5 px-4">التاريخ</th>
                    <th className="py-3.5 px-4">الخزنة المصدر</th>
                    <th className="py-3.5 px-4">الغرض / البيان</th>
                    <th className="py-3.5 px-4">مبلغ العهدة الأصلية</th>
                    <th className="py-3.5 px-4">المصروفات المصفاة</th>
                    <th className="py-3.5 px-4">المتبقي طرفه</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4 text-center">إجراءات والتصفية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-sm">
                  {karimCustodies.map(custody => {
                    const safeName = safes.find(s => s.id === custody.safeId)?.name || 'الخزنة الرئيسية';
                    const spentExpenses = settlementExpenses.filter(e => e.custodyId === custody.id);
                    const totalSpent = spentExpenses.reduce((s, e) => s + (e.amount || 0), 0);
                    const remaining = Math.max(0, custody.amount - totalSpent);

                    return (
                      <tr key={custody.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{custody.date}</td>
                        <td className="py-3.5 px-4 text-slate-900 font-black">{safeName}</td>
                        <td className="py-3.5 px-4 text-slate-800">{custody.purpose}</td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900">{custody.amount.toLocaleString()} ج.م</td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-600">{totalSpent.toLocaleString()} ج.م</td>
                        <td className="py-3.5 px-4 font-mono font-black text-amber-600">{remaining.toLocaleString()} ج.م</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            custody.status === 'مصفاة بالكامل' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800 animate-pulse'
                          }`}>
                            {custody.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {custody.status !== 'مصفاة بالكامل' ? (
                            <button
                              onClick={() => setShowSettleCustodyModal(custody)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
                            >
                              تسوية وفواتير
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">تمت التصفية 🟢</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {karimCustodies.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        لم يتم تسجيل أي عهد مالية باسم كريم النجار حتى الآن. اضغط "صرف عهدة جديدة لكريم النجار" للبدء.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- MODAL 1: ADD TRANSACTION --- */}
      {showAddTxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <h3 className="font-black text-xl flex items-center gap-2">
                <Receipt size={22} className="text-indigo-400" />
                تسجيل حركة مالية بالخزنة
              </h3>
              <button onClick={() => setShowAddTxModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نوع الحركة</label>
                  <select
                    value={txForm.type}
                    onChange={e => {
                      const type = e.target.value as SafeTransaction['type'];
                      setTxForm({
                        ...txForm,
                        type,
                        category: type === 'إيداع' ? inflowCategories[0] : outflowCategories[0]
                      });
                    }}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                  >
                    <option value="مصروفات">مصروف / صادر</option>
                    <option value="إيداع">إيداع / وارد</option>
                    <option value="مبيعات">مبيعات نقدية</option>
                    <option value="مشتريات">شراء خامات نقدي</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الخزنة</label>
                  <select
                    value={txForm.safeId}
                    onChange={e => setTxForm({ ...txForm, safeId: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                  >
                    {safes.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.balance.toLocaleString()} ج.م)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">البند / الفئة</label>
                <select
                  value={txForm.category}
                  onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                >
                  {(txForm.type === 'إيداع' || txForm.type === 'مبيعات' ? inflowCategories : outflowCategories).map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    value={txForm.amount || ''}
                    onChange={e => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-base font-mono bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={txForm.date}
                    onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-xs bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">البيان والشرح</label>
                <textarea
                  rows={3}
                  value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  placeholder="مثال: دفع فاتورة كهرباء المصنع، أو شراء سولار للعربيات..."
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold text-sm bg-slate-50 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddTxModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddTransaction}
                  className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-sm shadow-lg shadow-slate-900/10"
                >
                  حفظ الحركة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD CUSTODY --- */}
      {showAddCustodyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-purple-900 text-white p-6 flex items-center justify-between">
              <h3 className="font-black text-xl flex items-center gap-2">
                <UserCheck size={22} className="text-purple-300" />
                صرف عهدة مالية مؤقتة
              </h3>
              <button onClick={() => setShowAddCustodyModal(false)} className="text-purple-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Select Karim El-Najgar Shortcut Bar */}
              <div className="p-3 bg-purple-100/70 border border-purple-300 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                <span className="text-xs font-black text-purple-950">ربط سريع بمستلم العهدة:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustodyForm({
                      ...custodyForm,
                      custodianName: 'كريم النجار',
                      custodianRole: 'إدارة/كريم'
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
                >
                  👑 اختيار كريم النجار (المدير التنفيذي)
                </button>
              </div>

              {/* Category Role Cap Badge */}
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex justify-between items-center font-bold">
                <span>سقف العهدة لهذه الفئة: <span className="font-mono font-black text-purple-700">{selectedRoleCap.toLocaleString()} ج.م</span></span>
                <span className="text-[10px] text-purple-600 bg-white px-2 py-0.5 rounded-md border border-purple-200">شرط أمان: تصفية 80%</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">صفة المسؤول عن العهدة</label>
                <select
                  value={custodyForm.custodianRole}
                  onChange={e => setCustodyForm({ ...custodyForm, custodianRole: e.target.value as any })}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                >
                  <option value="سائق">سائق (عهد الوقود والنولون - سقف 5,000 ج.م)</option>
                  <option value="مشتريات">مسؤول مشتريات (عهد الخامات - سقف 30,000 ج.م)</option>
                  <option value="إدارة/كريم">إدارة / كريم (عهد المدير لشراء الخامات - سقف 50,000 ج.م)</option>
                  <option value="عامل">عامل / موظف (سقف 3,000 ج.م)</option>
                  <option value="أخرى">أخرى (سقف 10,000 ج.م)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم المستلم/المسؤول</label>
                <input
                  type="text"
                  placeholder="مثال: كريم، أحمد السائق..."
                  value={custodyForm.custodianName}
                  onChange={e => setCustodyForm({ ...custodyForm, custodianName: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                />
              </div>

              {/* Recipient Existing Active Custodies Alert */}
              {recipientActiveCustodies.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>العهد القائمة للمستلم حالياً ({recipientActiveCustodies.length}):</span>
                    <span className="font-mono font-black text-purple-700">{recipientTotalActiveAmount.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-bold">
                    <span>نسبة التصفية المحققة:</span>
                    <span className={`font-mono font-black ${recipientSettlementPercentage >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {recipientSettlementPercentage.toFixed(1)}% {recipientSettlementPercentage < 80 && '(أقل من الحد المطلوب 80%)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Blocked Issuance Warning & Override Controls */}
              {isCustodyIssuanceBlocked && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-3">
                  <div className="flex items-center gap-2 font-black text-xs text-red-700">
                    <AlertCircle size={18} />
                    <span>تنبيه حظر صرف عهدة جديدة تلقائياً!</span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed text-red-800">
                    {isSettlementBlocked && (
                      <span className="block">
                        • المستلم لديه عهد معلقة لم تُصفَّ بنسبة 80% على الأقل (نسبة التصفية الحالية: {recipientSettlementPercentage.toFixed(1)}%).
                      </span>
                    )}
                    {isCapExceeded && (
                      <span className="block">
                        • إجمالي المبلغ المطلوب يرفع العهدة القائمة إلى {(recipientTotalActiveAmount + Number(custodyForm.amount || 0)).toLocaleString()} ج.م متجاوزاً سقف الفئة المسموح ({selectedRoleCap.toLocaleString()} ج.م).
                      </span>
                    )}
                  </p>

                  <div className="pt-2 border-t border-red-200/60 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-red-900">
                      <input
                        type="checkbox"
                        checked={overrideBlockedCustody}
                        onChange={e => setOverrideBlockedCustody(e.target.checked)}
                        className="rounded border-red-300 text-red-600 focus:ring-0"
                      />
                      <span>التجاوز الاستثنائي بموافقة الإدارة العليا (Override)</span>
                    </label>

                    {overrideBlockedCustody && (
                      <input
                        type="text"
                        placeholder="اكتب سبب الاستثناء وموافقة المدير هنا..."
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        className="w-full h-10 rounded-lg border border-red-300 bg-white px-3 font-bold text-xs text-slate-900 outline-none"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">المبلغ الصادر (ج.م)</label>
                  <input
                    type="number"
                    value={custodyForm.amount || ''}
                    onChange={e => setCustodyForm({ ...custodyForm, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-base font-mono bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الخزنة المصدر</label>
                  <select
                    value={custodyForm.safeId}
                    onChange={e => setCustodyForm({ ...custodyForm, safeId: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                  >
                    {safes.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الهدف من العهدة</label>
                <input
                  type="text"
                  placeholder="مثال: شراء خامات من مورد نقدي، دفع بنزين وسولار..."
                  value={custodyForm.purpose}
                  onChange={e => setCustodyForm({ ...custodyForm, purpose: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddCustodyModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddCustody}
                  disabled={isCustodyIssuanceBlocked && !overrideBlockedCustody}
                  className={`px-8 py-3 rounded-xl font-black text-sm shadow-lg ${
                    isCustodyIssuanceBlocked && !overrideBlockedCustody
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-purple-600 text-white shadow-purple-600/20 hover:bg-purple-700'
                  }`}
                >
                  صرف العهدة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: SETTLE CUSTODY --- */}
      {showSettleCustodyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-purple-900 text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl flex items-center gap-2">
                  <Scale size={22} className="text-purple-300" />
                  تسوية وتصفية عهدة ({showSettleCustodyModal.custodianName})
                </h3>
                <p className="text-xs font-bold text-purple-200 mt-1">
                  المبلغ الأصلي: <span className="font-mono font-black">{showSettleCustodyModal.amount.toLocaleString()} ج.م</span>
                </p>
              </div>
              <button onClick={() => setShowSettleCustodyModal(null)} className="text-purple-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-slate-900 text-sm">بنود المصروفات والمشتريات المنفذة بالفواتير:</h4>
                <button
                  onClick={() => setSettlementItems([...settlementItems, { category: 'شراء خامات', description: '', amount: 0 }])}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-black text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> إضافة بند
                </button>
              </div>

              {settlementItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">الفئة / البند</label>
                      <select
                        value={item.category}
                        onChange={e => {
                          const updated = [...settlementItems];
                          updated[idx].category = e.target.value;
                          setSettlementItems(updated);
                        }}
                        className="w-full h-10 rounded-lg border border-slate-200 px-2 font-bold text-xs bg-white outline-none"
                      >
                        {outflowCategories.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">الوصف والبيان</label>
                      <input
                        type="text"
                        placeholder="تفاصيل الشراء..."
                        value={item.description}
                        onChange={e => {
                          const updated = [...settlementItems];
                          updated[idx].description = e.target.value;
                          setSettlementItems(updated);
                        }}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 font-bold text-xs bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">المبلغ الفعلي (ج.م)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.amount || ''}
                        onChange={e => {
                          const updated = [...settlementItems];
                          updated[idx].amount = Number(e.target.value);
                          setSettlementItems(updated);
                        }}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 font-bold text-sm font-mono bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Settlement Summary */}
              {(() => {
                const totalSpent = settlementItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                const diff = showSettleCustodyModal.amount - totalSpent;

                return (
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 mt-4 font-bold">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>إجمالي المنصرف بالفواتير:</span>
                      <span className="font-mono text-white text-sm">{totalSpent.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800">
                      <span>النتيجة النهائية:</span>
                      <span className={`font-mono text-base ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff >= 0 ? `استرداد متبقي للخزنة: +${diff.toLocaleString()} ج.م` : `صرف فارق للمسؤول: -${Math.abs(diff).toLocaleString()} ج.م`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSettleCustodyModal(null)}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmSettlement}
                className="px-8 py-3 rounded-xl bg-purple-600 text-white font-black text-sm shadow-lg shadow-purple-600/20"
              >
                اعتماد وتصفيـة العهدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: ADD SAFE --- */}
      {showAddSafeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-xl text-slate-900">إضافة خزنة أو حساب جديد</h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم الخزنة / الحساب</label>
              <input
                type="text"
                placeholder="مثال: خزنة المعرض، عهدة المحاسب..."
                value={safeForm.name}
                onChange={e => setSafeForm({ ...safeForm, name: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">نوع الخزنة</label>
              <select
                value={safeForm.type}
                onChange={e => setSafeForm({ ...safeForm, type: e.target.value as any })}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
              >
                <option value="خزنة رئيسية">خزنة رئيسية</option>
                <option value="عهدة موظف">عهدة موظف</option>
                <option value="بنك">بنك / حساب مصرفي</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">الرصيد الافتتاحي (ج.م)</label>
              <input
                type="number"
                value={safeForm.initialBalance || ''}
                onChange={e => setSafeForm({ ...safeForm, initialBalance: Number(e.target.value) })}
                placeholder="0"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-base font-mono bg-slate-50 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">حد أمان السيولة الحرجة (Min Safety Threshold)</label>
              <input
                type="number"
                value={safeForm.minBalanceThreshold || ''}
                onChange={e => setSafeForm({ ...safeForm, minBalanceThreshold: Number(e.target.value) })}
                placeholder="20000"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-base font-mono bg-slate-50 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">يتم إرسال إشعار تنبيهي بارز فور انخفاض رصيد الخزنة عن هذا الحد (افتراضي: 20,000 ج.م)</span>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowAddSafeModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600">إلغاء</button>
              <button onClick={handleAddSafe} className="px-7 py-2.5 rounded-xl bg-slate-900 text-white font-black text-sm">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: TRANSFER SAFES --- */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-xl text-slate-900">تحويل سيولة بين الخزائن</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">من خزنة</label>
                <select
                  value={transferForm.fromSafeId}
                  onChange={e => setTransferForm({ ...transferForm, fromSafeId: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">إلى خزنة</label>
                <select
                  value={transferForm.toSafeId}
                  onChange={e => setTransferForm({ ...transferForm, toSafeId: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
                >
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">المبلغ (ج.م)</label>
              <input
                type="number"
                value={transferForm.amount || ''}
                onChange={e => setTransferForm({ ...transferForm, amount: Number(e.target.value) })}
                placeholder="0"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-base font-mono bg-slate-50 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات التحويل</label>
              <input
                type="text"
                placeholder="سبب التحويل..."
                value={transferForm.notes}
                onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 font-bold text-sm bg-slate-50 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowTransferModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600">إلغاء</button>
              <button onClick={handleTransferSafes} className="px-7 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-sm">تأكيد التحويل</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINTABLE VOUCHER MODAL --- */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 text-right font-bold print:m-0 print:p-0 print:shadow-none">
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h2 className="text-2xl font-black text-slate-900">سند مالـي رسمي</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">رقم الحركة: {showVoucherModal.id.substring(0, 10)}</p>
            </div>

            <div className="space-y-3 text-sm text-slate-800">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">التاريخ:</span>
                <span className="font-mono font-black">{showVoucherModal.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">نوع المستند:</span>
                <span className="font-black text-indigo-700">{showVoucherModal.type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">الفئة / البند:</span>
                <span className="font-black">{showVoucherModal.category || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">المبلغ بالأرقام:</span>
                <span className="font-mono font-black text-lg text-slate-900">{showVoucherModal.amount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">البيان والشرح:</span>
                <span className="font-black text-slate-900">{showVoucherModal.description}</span>
              </div>
            </div>

            <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-500 font-black">
              <div>توقيع المستلم: .....................</div>
              <div>توقيع المحاسب / الخزينة: .....................</div>
            </div>

            <div className="pt-6 flex justify-end gap-3 print:hidden">
              <button onClick={() => setShowVoucherModal(null)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100">إغلاق</button>
              <button onClick={() => window.print()} className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-black">طباعة السند</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINTABLE DAILY CASH AUDIT SLIP MODAL --- */}
      {showAuditSlipModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 text-right font-bold print:m-0 print:p-0 print:shadow-none">
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h2 className="text-2xl font-black text-slate-900">محضر جرد وإغلاق خزينة يومي</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">تاريخ الجرد: {showAuditSlipModal.date}</p>
            </div>

            <div className="space-y-3 text-sm text-slate-800">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">اسم الخزنة:</span>
                <span className="font-black">{showAuditSlipModal.safeName || 'الخزنة الرئيسية'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">الرصيد الدفتري بالسيستم:</span>
                <span className="font-mono font-black">{showAuditSlipModal.systemBalance?.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">الرصيد الفعلي المعدود:</span>
                <span className="font-mono font-black text-emerald-700">{showAuditSlipModal.physicalBalance?.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">الفارق والنتيجة:</span>
                <span className={`font-mono font-black ${showAuditSlipModal.difference < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                  {showAuditSlipModal.difference > 0 ? `+${showAuditSlipModal.difference.toLocaleString()}` : showAuditSlipModal.difference?.toLocaleString()} ج.م ({showAuditSlipModal.status})
                </span>
              </div>

              {showAuditSlipModal.denominations && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-xs font-black text-slate-700 block mb-2">تفاصيل الفئات النقدية التي تم عدها:</span>
                  {Object.entries(showAuditSlipModal.denominations).map(([denom, cntVal]) => {
                    const cnt = Number(cntVal) || 0;
                    return cnt > 0 ? (
                      <div key={denom} className="flex justify-between text-xs text-slate-600">
                        <span>فئة {denom} جنيه:</span>
                        <span className="font-mono font-bold">{cnt} ورقة = {(cnt * Number(denom)).toLocaleString()} ج.م</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {showAuditSlipModal.notes && (
                <div className="pt-2 text-xs text-slate-600">
                  <span className="font-black text-slate-800">الملاحظات: </span>
                  {showAuditSlipModal.notes}
                </div>
              )}
            </div>

            <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-500 font-black">
              <div>توقيع المحاسب الجارد: .....................</div>
              <div>توقيع أمين الخزنة / المدير: .....................</div>
            </div>

            <div className="pt-6 flex justify-end gap-3 print:hidden">
              <button onClick={() => setShowAuditSlipModal(null)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100">إغلاق</button>
              <button onClick={() => window.print()} className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-black">طباعة المحضر</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
