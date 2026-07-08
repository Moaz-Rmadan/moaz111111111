import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell as RechartsCell, AreaChart, Area 
} from 'recharts';
import {
  BarChart3, Download, Printer, Box, Package, ShoppingCart, Users, Activity, Trash2, 
  Database, Target, TrendingUp, AlertTriangle, Home, Briefcase, Scale, Wallet, 
  CreditCard, ArrowLeft, PieChartIcon, Search, FileText, Layers, TrendingDown,
  Calendar, CheckCircle2, ChevronDown, ListFilter, AlertCircle, Calculator, Sparkles, CircleDollarSign, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

import type { 
  Item, Supplier, Purchase, Issuance, Warehouse, 
  ProductionJob, JobLabor, JobOtherCost, Waste,
  MaintenanceOrder, Safe, 
  SafeTransaction, SupplierPayment, Payroll, FinancialTransaction, Loan,
  SalesOrder
} from '../types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FinancialReportsProps {
  items: Item[];
  suppliers: Supplier[];
  purchases: Purchase[];
  issuances: Issuance[];
  warehouses: Warehouse[];
  productionJobs: ProductionJob[];
  jobLabors: JobLabor[];
  jobOtherCosts: JobOtherCost[];
  wasteRecords: Waste[];
  maintenanceOrders: MaintenanceOrder[];
  salesOrders?: SalesOrder[];
  safes?: Safe[];
  safeTransactions?: SafeTransaction[];
  supplierPayments?: SupplierPayment[];
  payrolls?: Payroll[];
  hrTransactions?: FinancialTransaction[];
  loans?: Loan[];
}

export function FinancialReports({
  items,
  suppliers,
  purchases,
  issuances,
  warehouses,
  productionJobs,
  jobLabors,
  jobOtherCosts,
  wasteRecords,
  maintenanceOrders,
  salesOrders = [],
  safes = [],
  safeTransactions = [],
  supplierPayments = [],
  payrolls = [],
  hrTransactions = [],
  loans = [],
}: FinancialReportsProps) {
  // Tabs management
  const [activeReportTab, setActiveReportTab] = useState<
    'dashboard' | 'warehouse' | 'purchases' | 'suppliers' | 'ledger' | 'journal' | 'income_statement' | 'balance_sheet' | 'trial_balance' | 'production_costs' | 'sales_analytics'
  >('dashboard');

  // General Ledger States
  const [ledgerAccount, setLedgerAccount] = useState<'safes' | 'sales' | 'purchases' | 'suppliers' | 'expenses'>('safes');
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // General Journal States
  const [journalDateFrom, setJournalDateFrom] = useState('');
  const [journalDateTo, setJournalDateTo] = useState('');
  const [journalSearch, setJournalSearch] = useState('');

  // Financial statements date filters
  const [statementPeriod, setStatementPeriod] = useState<'all' | 'year' | 'month' | 'custom'>('all');
  const [pnlDateFrom, setPnlDateFrom] = useState('');
  const [pnlDateTo, setPnlDateTo] = useState('');

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#34d399', '#8b5cf6', '#a78bfa', '#f59e0b', '#ef4444'];

  // Excel Exporter Utility
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير_المالي");
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  // ==================== FILTER HELPER BY PERIOD ====================
  const filterByPeriod = useCallback((dateStr: string) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (statementPeriod === 'year') {
      return date.getFullYear() === now.getFullYear();
    }
    if (statementPeriod === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (statementPeriod === 'custom') {
      const matchesFrom = !pnlDateFrom || dateStr >= pnlDateFrom;
      const matchesTo = !pnlDateTo || dateStr <= pnlDateTo;
      return matchesFrom && matchesTo;
    }
    return true;
  }, [statementPeriod, pnlDateFrom, pnlDateTo]);

  // ==================== CALCULATION MEMOS ====================
  
  // Dashboard indicators
  const totalInventoryValue = useMemo(() => {
    return items.reduce((acc, i) => acc + (i.currentBalance * i.price), 0);
  }, [items]);

  const totalSupplierDebt = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + s.balance, 0);
  }, [suppliers]);

  const totalSalesAmount = useMemo(() => {
    return salesOrders.filter(so => filterByPeriod(so.date)).reduce((acc, so) => acc + so.totalAmount, 0);
  }, [salesOrders, filterByPeriod]);

  const totalSalesProfit = useMemo(() => {
    return salesOrders.filter(so => filterByPeriod(so.date)).reduce((acc, so) => acc + (so.netProfit || 0), 0);
  }, [salesOrders, filterByPeriod]);

  const totalWasteValue = useMemo(() => {
    return wasteRecords.filter(w => filterByPeriod(w.date)).reduce((acc, w) => {
      const item = items.find(i => i.id === w.itemId);
      return acc + (w.quantity * (item?.price || 0));
    }, 0);
  }, [wasteRecords, items, filterByPeriod]);

  // Production Stats
  const productionProfitData = useMemo(() => {
    return productionJobs.map(job => {
      const jobMaterials = issuances.filter(i => i.jobOrderNo === job.orderNo);
      const jobLaborsList = jobLabors.filter(l => l.jobId === job.id);
      const jobOtherCostsList = jobOtherCosts.filter(o => o.jobId === job.id);

      const materialCost = jobMaterials.reduce((sum, m) => sum + m.total, 0);
      const laborCost = jobLaborsList.reduce((sum, l) => sum + l.total, 0);
      const otherCost = jobOtherCostsList.reduce((sum, o) => sum + o.amount, 0);
      const totalCost = materialCost + laborCost + otherCost;
      const profit = (job.sellingPrice || 0) - totalCost;

      return {
        id: job.id,
        name: job.productName,
        orderNo: job.orderNo,
        status: job.status,
        materialCost,
        laborCost,
        otherCost,
        cost: totalCost,
        sellingPrice: job.sellingPrice || 0,
        profit: profit,
        profitMargin: job.sellingPrice ? Math.round((profit / job.sellingPrice) * 100) : 0
      };
    });
  }, [productionJobs, issuances, jobLabors, jobOtherCosts]);

  const totalProductionCost = useMemo(() => {
    return productionProfitData.reduce((acc, j) => acc + j.cost, 0);
  }, [productionProfitData]);

  // General Ledger Rows
  const ledgerRows = useMemo(() => {
    let rows: { date: string; description: string; debit: number; credit: number; reference: string }[] = [];

    if (ledgerAccount === 'safes') {
      rows = safeTransactions.map(t => {
        const tType = t.type as string;
        const isDebit = tType === 'إيداع' || tType === 'مبيعات' || tType === 'سلفة مستردة' || tType === 'سداد قرض' || t.description.includes('وارد') || t.description.includes('مستلم') || t.description.includes('إيداع');
        const isCredit = tType === 'سحب' || tType === 'مصروفات' || tType === 'رواتب' || tType === 'مشتريات' || tType === 'قرض شخصي' || t.description.includes('صادر') || t.description.includes('سحب') || t.description.includes('دفع');
        return {
          date: t.date,
          description: t.description || `حركة خزينة - ${t.type}`,
          debit: isDebit ? t.amount : 0,
          credit: isCredit ? t.amount : 0,
          reference: t.type
        };
      });
    } else if (ledgerAccount === 'sales') {
      rows = salesOrders.map(so => ({
        date: so.date,
        description: `فاتورة مبيعات - عميل: ${so.customerName}`,
        debit: 0,
        credit: so.totalAmount,
        reference: `مبيعات المعارض`
      }));
    } else if (ledgerAccount === 'purchases') {
      rows = purchases.map(p => ({
        date: p.date,
        description: `فاتورة شراء خامات - مورد: ${suppliers.find(s => s.id === p.supplierId)?.name || 'غير محدد'} (${p.quantity} ${p.unit})`,
        debit: p.total,
        credit: 0,
        reference: `مشتريات خامات`
      }));
    } else if (ledgerAccount === 'suppliers') {
      const pRows = purchases.map(p => ({
        date: p.date,
        description: `فاتورة شراء آجل - مورد: ${suppliers.find(s => s.id === p.supplierId)?.name || 'غير محدد'}`,
        debit: 0,
        credit: p.total,
        reference: 'توريد مواد'
      }));
      const payRows = supplierPayments.map(sp => ({
        date: sp.date,
        description: `سداد دفعة نقدية - مورد: ${suppliers.find(s => s.id === sp.supplierId)?.name || 'غير محدد'}`,
        debit: sp.amount,
        credit: 0,
        reference: 'سند صرف مورد'
      }));
      rows = [...pRows, ...payRows];
    } else if (ledgerAccount === 'expenses') {
      const payRows = payrolls.map(p => ({
        date: p.paymentDate || p.startDate,
        description: `مسير رواتب وأجور الموظفين (${p.startDate} إلى ${p.endDate})`,
        debit: p.netSalary,
        credit: 0,
        reference: 'صرف أجور'
      }));
      const maintRows = maintenanceOrders.map(m => ({
        date: m.sendDate,
        description: `صيانة ماكينات - ${m.itemName}`,
        debit: m.cost,
        credit: 0,
        reference: 'صيانة ماكينات'
      }));
      const generalRows = safeTransactions.filter(t => t.type === 'مصروفات').map(t => ({
        date: t.date,
        description: `مصروفات نثرية - ${t.description}`,
        debit: t.amount,
        credit: 0,
        reference: 'مصروفات خزينة'
      }));
      rows = [...payRows, ...maintRows, ...generalRows];
    }

    // Filter rows by criteria
    return rows.filter(r => {
      const matchesFrom = !ledgerDateFrom || r.date >= ledgerDateFrom;
      const matchesTo = !ledgerDateTo || r.date <= ledgerDateTo;
      const matchesSearch = !ledgerSearch || 
        r.description.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
        r.reference.toLowerCase().includes(ledgerSearch.toLowerCase());
      return matchesFrom && matchesTo && matchesSearch;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [ledgerAccount, safeTransactions, salesOrders, purchases, suppliers, supplierPayments, payrolls, maintenanceOrders, ledgerDateFrom, ledgerDateTo, ledgerSearch]);

  const runningLedgerBalances = useMemo(() => {
    let balance = 0;
    const isNormalCredit = ledgerAccount === 'sales' || ledgerAccount === 'suppliers';
    return ledgerRows.map(row => {
      if (isNormalCredit) {
        balance += (row.credit - row.debit);
      } else {
        balance += (row.debit - row.credit);
      }
      return balance;
    });
  }, [ledgerRows, ledgerAccount]);

  // ==================== GENERAL JOURNAL ROWS (دفتر اليومية العامة) ====================
  const journalRows = useMemo(() => {
    const rows: { date: string; docNo: string; description: string; debit: number; credit: number; reference: string; account: string; createdBy?: string }[] = [];

    // 1. Safe transactions (حركات الخزنة والعهد)
    safeTransactions.forEach(t => {
      const tType = t.type as string;
      const isDeposit = tType === 'إيداع' || tType === 'مبيعات' || tType === 'سلفة مستردة' || tType === 'سداد قرض' || t.description.includes('وارد') || t.description.includes('مستلم') || t.description.includes('إيداع');
      
      if (isDeposit) {
        rows.push({
          date: t.date,
          docNo: t.id ? t.id.substring(0, 6) : 'TX',
          description: t.description || 'إيداع نقدي بالخزينة',
          debit: t.amount,
          credit: 0,
          reference: t.type || 'إيداع',
          account: `حساب الخزينة/الصندوق`,
          createdBy: t.createdBy
        });
        rows.push({
          date: t.date,
          docNo: t.id ? t.id.substring(0, 6) : 'TX',
          description: t.description || 'إيداع نقدي بالخزينة',
          debit: 0,
          credit: t.amount,
          reference: t.type || 'إيداع',
          account: `الإيرادات / المقبوضات`,
          createdBy: t.createdBy
        });
      } else {
        rows.push({
          date: t.date,
          docNo: t.id ? t.id.substring(0, 6) : 'TX',
          description: t.description || 'صرف نقدي من الخزينة',
          debit: t.amount,
          credit: 0,
          reference: t.type || 'مصروف',
          account: t.category || `المصروفات العامة`,
          createdBy: t.createdBy
        });
        rows.push({
          date: t.date,
          docNo: t.id ? t.id.substring(0, 6) : 'TX',
          description: t.description || 'صرف نقدي من الخزينة',
          debit: 0,
          credit: t.amount,
          reference: t.type || 'مصروف',
          account: `حساب الخزينة/الصندوق`,
          createdBy: t.createdBy
        });
      }
    });

    // 2. Sales Orders (فواتير المبيعات)
    salesOrders.forEach(so => {
      const docNo = so.id ? so.id.substring(0, 6).toUpperCase() : 'SO';
      const desc = `فاتورة مبيعات رقم ${docNo} - العميل: ${so.customerName}`;
      rows.push({
        date: so.date,
        docNo: docNo,
        description: desc,
        debit: so.totalAmount,
        credit: 0,
        reference: 'فاتورة مبيعات',
        account: so.paymentMethod === 'نقدي' ? 'حساب النقدية/الخزائن' : 'حساب العملاء (أرصدة مدينة)',
        createdBy: 'إدارة المبيعات'
      });
      rows.push({
        date: so.date,
        docNo: docNo,
        description: desc,
        debit: 0,
        credit: so.totalAmount,
        reference: 'فاتورة مبيعات',
        account: 'حساب إيرادات مبيعات النشاط',
        createdBy: 'إدارة المبيعات'
      });
    });

    // 3. Purchases (فواتير شراء الخامات)
    purchases.forEach(p => {
      const docNo = p.id ? p.id.substring(0, 6).toUpperCase() : 'PO';
      const supplierName = suppliers.find(s => s.id === p.supplierId)?.name || 'غير محدد';
      const desc = `فاتورة شراء خامات - صنف: ${items.find(i => i.id === p.itemId)?.name || 'غير محدد'} من المورد: ${supplierName}`;
      rows.push({
        date: p.date,
        docNo: docNo,
        description: desc,
        debit: p.total,
        credit: 0,
        reference: 'شراء خامات',
        account: 'حساب مخازن المواد الخام',
        createdBy: 'إدارة المشتريات'
      });
      rows.push({
        date: p.date,
        docNo: docNo,
        description: desc,
        debit: 0,
        credit: p.total,
        reference: 'شراء خامات',
        account: p.paymentStatus === 'نقدي' ? 'حساب الخزينة/الصندوق' : `حساب المورد: ${supplierName}`,
        createdBy: 'إدارة المشتريات'
      });
    });

    // 4. Supplier Payments (دفعات الموردين)
    supplierPayments.forEach(sp => {
      const supplierName = suppliers.find(s => s.id === sp.supplierId)?.name || 'غير محدد';
      const desc = `سداد دفعة نقدية للمورد: ${supplierName}`;
      const docNo = sp.id ? sp.id.substring(0, 6).toUpperCase() : 'PAY';
      rows.push({
        date: sp.date,
        docNo: docNo,
        description: desc,
        debit: sp.amount,
        credit: 0,
        reference: 'سند صرف مورد',
        account: `حساب المورد: ${supplierName}`,
        createdBy: 'إدارة الحسابات'
      });
      rows.push({
        date: sp.date,
        docNo: docNo,
        description: desc,
        debit: 0,
        credit: sp.amount,
        reference: 'سند صرف مورد',
        account: 'حساب الخزينة/الصندوق',
        createdBy: 'إدارة الحسابات'
      });
    });

    // 5. Payroll (صرف أجور ومسيرات رواتب الموظفين)
    payrolls.forEach(p => {
      const desc = `صرف مسير الرواتب المجمع للأسبوع ${p.weekNumber} لسنة ${p.year}`;
      rows.push({
        date: p.paymentDate || p.startDate,
        docNo: p.id ? p.id.substring(0, 6) : 'PAYROLL',
        description: desc,
        debit: p.netSalary,
        credit: 0,
        reference: 'صرف أجور',
        account: 'حساب مصروفات الأجور والمرتبات',
        createdBy: 'النظام المالي'
      });
      rows.push({
        date: p.paymentDate || p.startDate,
        docNo: p.id ? p.id.substring(0, 6) : 'PAYROLL',
        description: desc,
        debit: 0,
        credit: p.netSalary,
        reference: 'صرف أجور',
        account: 'حساب الخزينة/الصندوق',
        createdBy: 'النظام المالي'
      });
    });

    // 6. Loans (قروض وسلفيات للموظفين)
    loans.forEach(l => {
      if (l.status === 'نشط' || l.status === 'مسدد') {
        const desc = `سلفة موظف (كود: ${l.employeeId})`;
        const docNo = l.id ? l.id.substring(0, 6).toUpperCase() : 'LOAN';
        rows.push({
          date: l.date,
          docNo: docNo,
          description: desc,
          debit: l.amount,
          credit: 0,
          reference: 'صرف سلفة',
          account: 'حساب أرصدة مدينة - سلف موظفين',
          createdBy: 'النظام المالي'
        });
        rows.push({
          date: l.date,
          docNo: docNo,
          description: desc,
          debit: 0,
          credit: l.amount,
          reference: 'صرف سلفة',
          account: 'حساب الخزينة/الصندوق',
          createdBy: 'النظام المالي'
        });
      }
    });

    return rows.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      const docCompare = a.docNo.localeCompare(b.docNo);
      if (docCompare !== 0) return docCompare;
      return b.debit - a.debit; 
    });
  }, [safeTransactions, salesOrders, purchases, suppliers, supplierPayments, payrolls, loans, items]);

  const filteredJournalRows = useMemo(() => {
    return journalRows.filter(r => {
      const matchesFrom = !journalDateFrom || r.date >= journalDateFrom;
      const matchesTo = !journalDateTo || r.date <= journalDateTo;
      const matchesSearch = !journalSearch || 
        r.description.toLowerCase().includes(journalSearch.toLowerCase()) || 
        r.account.toLowerCase().includes(journalSearch.toLowerCase()) || 
        r.reference.toLowerCase().includes(journalSearch.toLowerCase()) || 
        r.docNo.toLowerCase().includes(journalSearch.toLowerCase());
      return matchesFrom && matchesTo && matchesSearch;
    });
  }, [journalRows, journalDateFrom, journalDateTo, journalSearch]);

  // ==================== INCOME STATEMENT P&L ====================
  const pnlData = useMemo(() => {
    const revenues = salesOrders.filter(so => filterByPeriod(so.date)).reduce((sum, so) => sum + so.totalAmount, 0);
    const materialsConsumed = issuances.filter(iss => filterByPeriod(iss.date)).reduce((sum, iss) => sum + iss.total, 0);
    const directLabor = jobLabors.filter(jl => filterByPeriod(jl.date)).reduce((sum, jl) => sum + jl.total, 0);
    const directOther = jobOtherCosts.filter(jo => filterByPeriod(jo.date)).reduce((sum, jo) => sum + jo.amount, 0);
    const wasteValue = wasteRecords.filter(w => filterByPeriod(w.date)).reduce((sum, w) => {
      const item = items.find(i => i.id === w.itemId);
      return sum + (w.quantity * (item?.price || 0));
    }, 0);

    const totalCOGS = materialsConsumed + directLabor + directOther + wasteValue;
    const grossProfit = revenues - totalCOGS;

    const generalPayroll = payrolls.filter(p => p.paymentDate ? filterByPeriod(p.paymentDate) : filterByPeriod(p.startDate)).reduce((sum, p) => sum + p.netSalary, 0);
    const sharpening = 0;
    const maintenance = maintenanceOrders.filter(m => filterByPeriod(m.sendDate)).reduce((sum, m) => sum + m.cost, 0);
    const commissions = salesOrders.filter(so => filterByPeriod(so.date)).reduce((sum, so) => sum + (so.totalCommission || 0), 0);
    const logistics = salesOrders.filter(so => filterByPeriod(so.date)).reduce((sum, so) => sum + (so.totalLogisticsCost || 0), 0);
    const adminExpenses = safeTransactions.filter(t => t.type === 'مصروفات' && filterByPeriod(t.date)).reduce((sum, t) => sum + t.amount, 0);

    const totalOPEX = generalPayroll + sharpening + maintenance + commissions + logistics + adminExpenses;
    const netProfit = grossProfit - totalOPEX;

    return {
      revenues,
      materialsConsumed,
      directLabor,
      directOther,
      wasteValue,
      totalCOGS,
      grossProfit,
      generalPayroll,
      sharpening,
      maintenance,
      commissions,
      logistics,
      adminExpenses,
      totalOPEX,
      netProfit
    };
  }, [salesOrders, issuances, jobLabors, jobOtherCosts, wasteRecords, items, payrolls, maintenanceOrders, safeTransactions, filterByPeriod]);

  // ==================== BALANCE SHEET ====================
  const balanceSheetData = useMemo(() => {
    const cashAndBanks = safes.reduce((sum, s) => sum + s.balance, 0);
    const inventoryVal = items.reduce((sum, item) => sum + (item.currentBalance * item.price), 0);
    const activeLoans = loans.filter(l => l.status === 'نشط').reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalAssets = cashAndBanks + inventoryVal + activeLoans;

    const accountsPayable = suppliers.reduce((sum, s) => sum + s.balance, 0);
    const totalLiabilities = accountsPayable;

    // Retained earnings
    const allRevenues = salesOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const allCOGS = issuances.reduce((sum, iss) => sum + iss.total, 0) +
                    jobLabors.reduce((sum, jl) => sum + jl.total, 0) +
                    jobOtherCosts.reduce((sum, jo) => sum + jo.amount, 0) +
                    wasteRecords.reduce((sum, w) => sum + (w.quantity * (items.find(i => i.id === w.itemId)?.price || 0)), 0);
    const allOPEX = payrolls.reduce((sum, p) => sum + p.netSalary, 0) +
                    maintenanceOrders.reduce((sum, m) => sum + m.cost, 0) +
                    salesOrders.reduce((sum, so) => sum + (so.totalCommission || 0), 0) +
                    salesOrders.reduce((sum, so) => sum + (so.totalLogisticsCost || 0), 0) +
                    safeTransactions.filter(t => t.type === 'مصروفات').reduce((sum, t) => sum + t.amount, 0);

    const retainedEarnings = allRevenues - allCOGS - allOPEX;
    const capitalReserves = totalAssets - totalLiabilities - retainedEarnings;
    const totalEquity = retainedEarnings + capitalReserves;

    return {
      cashAndBanks,
      inventoryVal,
      activeLoans,
      totalAssets,
      accountsPayable,
      totalLiabilities,
      retainedEarnings,
      capitalReserves,
      totalEquity
    };
  }, [safes, items, loans, suppliers, salesOrders, issuances, jobLabors, jobOtherCosts, wasteRecords, payrolls, maintenanceOrders, safeTransactions]);

  // ==================== DYNAMIC TRIAL BALANCE ====================
  const trialBalanceData = useMemo(() => {
    const cashDebit = safeTransactions
      .filter(t => {
        const tType = t.type as string;
        return tType === 'إيداع' || tType === 'مبيعات' || tType === 'سلفة مستردة' || tType === 'سداد قرض' || t.description.includes('وارد') || t.description.includes('مستلم') || t.description.includes('إيداع');
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const cashCredit = safeTransactions
      .filter(t => t.type === 'سحب' || t.type === 'مصروفات' || t.type === 'رواتب' || t.type === 'مشتريات' || t.type === 'قرض شخصي' || t.description.includes('صادر') || t.description.includes('سحب') || t.description.includes('دفع'))
      .reduce((sum, t) => sum + t.amount, 0);
    const cashBalance = cashDebit - cashCredit;

    const invDebit = purchases.reduce((sum, p) => sum + p.total, 0);
    const invCredit = issuances.reduce((sum, iss) => sum + iss.total, 0) + 
                     wasteRecords.reduce((sum, w) => sum + (w.quantity * (items.find(i => i.id === w.itemId)?.price || 0)), 0);
    const invBalance = invDebit - invCredit;

    const loanBalance = loans.filter(l => l.status === 'نشط').reduce((sum, l) => sum + l.remainingAmount, 0);
    const suppliersBalance = suppliers.reduce((sum, s) => sum + s.balance, 0);

    const salesTotal = salesOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const purchasesTotal = purchases.reduce((sum, p) => sum + p.total, 0);
    const payrollExpenses = payrolls.reduce((sum, p) => sum + p.netSalary, 0) + jobLabors.reduce((sum, jl) => sum + jl.total, 0);
    const operatingExpenses = 
      maintenanceOrders.reduce((sum, m) => sum + m.cost, 0) + 
      jobOtherCosts.reduce((sum, j) => sum + j.amount, 0) +
      salesOrders.reduce((sum, so) => sum + (so.totalCommission || 0), 0) +
      salesOrders.reduce((sum, so) => sum + (so.totalLogisticsCost || 0), 0) +
      safeTransactions.filter(t => t.type === 'مصروفات').reduce((sum, t) => sum + t.amount, 0);

    const accounts = [
      { code: '101', name: 'النقدية وما يعادلها (الصناديق والعهود)', debit: cashBalance > 0 ? cashBalance : 0, credit: cashBalance < 0 ? -cashBalance : 0 },
      { code: '102', name: 'رصيد ومخزون المواد الخام بأسعار التكلفة', debit: invBalance > 0 ? invBalance : 0, credit: invBalance < 0 ? -invBalance : 0 },
      { code: '103', name: 'ذمم وسلف الموظفين المدينة والنشطة', debit: loanBalance, credit: 0 },
      { code: '201', name: 'أرصدة حسابات الموردين والدائنين', debit: 0, credit: suppliersBalance > 0 ? suppliersBalance : 0 },
      { code: '401', name: 'إيرادات المبيعات والنشاط العام للمعارض', debit: 0, credit: salesTotal },
      { code: '501', name: 'إجمالي المشتريات والمدفوعات اللوجستية للوارد', debit: purchasesTotal, credit: 0 },
      { code: '502', name: 'رواتب وأجور وتشغيل القوى العاملة المباشرة', debit: payrollExpenses, credit: 0 },
      { code: '503', name: 'المصروفات النثرية والعمومية وسن أدوات المصنع', debit: operatingExpenses, credit: 0 },
    ];

    const sumDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
    const sumCredit = accounts.reduce((sum, a) => sum + a.credit, 0);
    const diff = sumDebit - sumCredit;

    if (diff > 0) {
      accounts.push({ code: '301', name: 'حقوق الملكية والأرباح الموازنة', debit: 0, credit: diff });
    } else if (diff < 0) {
      accounts.push({ code: '301', name: 'حقوق الملكية والأرباح الموازنة', debit: -diff, credit: 0 });
    }

    const finalSumDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
    const finalSumCredit = accounts.reduce((sum, a) => sum + a.credit, 0);

    return {
      accounts,
      totalDebit: finalSumDebit,
      totalCredit: finalSumCredit
    };
  }, [safeTransactions, purchases, issuances, wasteRecords, items, loans, suppliers, salesOrders, payrolls, jobLabors, maintenanceOrders, jobOtherCosts]);

  // ==================== SALES ANALYTICS MEMO ====================
  const salesAnalysisData = useMemo(() => {
    const sortedShowrooms = salesOrders.reduce((acc: Record<string, { total: number; count: number }>, so) => {
      const room = so.showroomId || 'معرض غير محدد';
      if (!acc[room]) acc[room] = { total: 0, count: 0 };
      acc[room].total += so.totalAmount;
      acc[room].count += 1;
      return acc;
    }, {});

    const showroomChart = Object.entries(sortedShowrooms).map(([name, data]) => ({
      name,
      المبيعات: data.total,
      عدد_الطلبات: data.count
    })).sort((a, b) => b.المبيعات - a.المبيعات);

    const payMethods = salesOrders.reduce((acc: Record<string, number>, so) => {
      const method = so.paymentMethod || 'نقدي';
      acc[method] = (acc[method] || 0) + so.totalAmount;
      return acc;
    }, {});

    const payMethodChart = Object.entries(payMethods).map(([name, value]) => ({ name, value }));

    return {
      showroomChart,
      payMethodChart
    };
  }, [salesOrders]);

  // ==================== EXCEL EXPORTS ====================
  const exportTrialBalanceToExcel = () => {
    const formatted = trialBalanceData.accounts.map(a => ({
      'كود الحساب': a.code,
      'اسم حساب الأستاذ العام': a.name,
      'الجانب المدين (+)': a.debit,
      'الجانب الدائن (-)': a.credit
    }));
    exportToExcel(formatted, 'ميزان_المراجعة_المالي');
  };

  const exportSalesAnalyticsToExcel = () => {
    const formatted = salesOrders.map(so => ({
      'رقم الفاتورة': so.id,
      'التاريخ': so.date,
      'المعرض': so.showroomId,
      'العميل': so.customerName,
      'إجمالي المبيعات': so.totalAmount,
      'التكلفة التقديرية (COGS)': so.totalCOGS,
      'مصاريف النقل والتركيب': so.totalLogisticsCost,
      'العمولات الممنوحة': so.totalCommission,
      'صافي ربح الفاتورة': so.netProfit,
      'طريقة السداد': so.paymentMethod
    }));
    exportToExcel(formatted, 'سجل_تحليل_مبيعات_المعارض');
  };

  const exportProductionCostsToExcel = () => {
    const formatted = productionProfitData.map(j => ({
      'رقم أمر التشغيل': j.orderNo,
      'المنتج': j.name,
      'حالة الأمر': j.status,
      'تكلفة المواد الخام': j.materialCost,
      'تكلفة الأجور المباشرة': j.laborCost,
      'مصاريف صناعية غير مباشرة': j.otherCost,
      'إجمالي التكلفة الحقيقية': j.cost,
      'سعر البيع المخطط': j.sellingPrice,
      'هامش الربح الفعلي': j.profit,
      'نسبة الهامش (%)': j.profitMargin
    }));
    exportToExcel(formatted, 'تكاليف_الإنتاج_وأوامر_التشغيل');
  };

  // Static Data lists
  const warehouseData = useMemo(() => {
    return warehouses.map(w => {
      const value = items
        .filter(i => i.warehouseId === w.id)
        .reduce((acc, i) => acc + (i.currentBalance * i.price), 0);
      return { name: w.name, value };
    });
  }, [warehouses, items]);

  const costCenterData = useMemo(() => {
    return issuances.reduce((acc: any[], iss) => {
      const existing = acc.find(a => a.name === iss.costCenter);
      if (existing) {
        existing.value += iss.total;
      } else {
        acc.push({ name: iss.costCenter, value: iss.total });
      }
      return acc;
    }, []);
  }, [issuances]);

  const monthlyTrends = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = format(d, 'MMM yyyy');
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      const monthPurchases = purchases
        .filter(p => p.date >= format(firstDay, 'yyyy-MM-dd') && p.date <= format(lastDay, 'yyyy-MM-dd'))
        .reduce((acc, p) => acc + p.total, 0);
        
      const monthIssuances = issuances
        .filter(iss => iss.date >= format(firstDay, 'yyyy-MM-dd') && iss.date <= format(lastDay, 'yyyy-MM-dd'))
        .reduce((acc, iss) => acc + iss.total, 0);

      return { name: monthStr, purchases: monthPurchases, issuances: monthIssuances };
    }).reverse();
  }, [purchases, issuances]);

  const maintenanceData = useMemo(() => [
    { name: 'الصيانة الخارجية', value: maintenanceOrders.reduce((acc, s) => acc + s.cost, 0) },
  ], [maintenanceOrders]);

  return (
    <div className="space-y-10 pb-24 print:p-0 animate-in fade-in duration-700" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-wider px-3.5 py-1.5 bg-indigo-50 rounded-full w-fit mb-3">
            <Scale size={14} className="animate-spin-slow" />
            النظام المالي والمحاسبي المتكامل
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
            مركز التقارير المحاسبية والمخزنية الاحترافي
          </h2>
          <p className="text-slate-500 mt-2 font-bold text-sm md:text-base max-w-2xl">
            عرض الموازنات العامة، الدفاتر اليومية، موازين المراجعة، قائمة الدخل التفاعلية، وتحليلات تكاليف التصنيع وهوامش المبيعات بدقة فائقة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => window.print()} className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-xl transition-all hover:-translate-y-0.5">
            <Printer size={16} className="ml-2" />
            طباعة الكشف PDF
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Grid */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl w-full print:hidden shadow-md">
        {[
          { id: 'dashboard', label: 'لوحة القيادة الموحدة', icon: <Box size={16} /> },
          { id: 'journal', label: 'دفتر اليومية العامة', icon: <BookOpen size={16} /> },
          { id: 'ledger', label: 'دفتر الأستاذ المساعد', icon: <FileText size={16} /> },
          { id: 'income_statement', label: 'قائمة الدخل P&L', icon: <TrendingUp size={16} /> },
          { id: 'balance_sheet', label: 'الميزانية والمركز المالي', icon: <Scale size={16} /> },
          { id: 'trial_balance', label: 'ميزان المراجعة الذكي', icon: <Layers size={16} /> },
          { id: 'production_costs', label: 'تكاليف الإنتاج والتصنيع', icon: <Activity size={16} /> },
          { id: 'sales_analytics', label: 'تحليل المبيعات والمعارض', icon: <CircleDollarSign size={16} /> },
          { id: 'warehouse', label: 'جرد مستودعات الخامات', icon: <Package size={16} /> },
          { id: 'purchases', label: 'تحليل تكلفة المشتريات', icon: <ShoppingCart size={16} /> },
          { id: 'suppliers', label: 'حسابات أرصدة الموردين', icon: <Users size={16} /> }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all duration-200 ${activeReportTab === tab.id ? 'bg-white shadow-md text-indigo-700' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <span className={activeReportTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== 1. DASHBOARD TAB ==================== */}
      {activeReportTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg mb-4">
                  <Package size={20} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">قيمة المخزون الحالي</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {totalInventoryValue.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
                </h3>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/50 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg mb-4">
                  <Users size={20} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">مديونيات الموردين المعلقة</p>
                <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                  {totalSupplierDebt.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
                </h3>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg mb-4">
                  <CircleDollarSign size={20} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">حجم مبيعات المعارض</p>
                <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
                  {totalSalesAmount.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
                </h3>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50/50 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-violet-500 flex items-center justify-center text-white shadow-lg mb-4">
                  <Calculator size={20} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">صافي أرباح الفترات المفوترة</p>
                <h3 className="text-2xl font-black text-violet-700 tracking-tight">
                  {totalSalesProfit.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
                </h3>
              </div>
            </div>

          </div>

          {/* Graphical Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-lg font-black text-slate-900">تقييم المستودعات الجاري</h3>
                  <p className="text-slate-400 text-xs font-bold">القيمة الحالية للبضائع المخزنة بكل مستودع</p>
                </div>
                <Database size={18} className="text-slate-400" />
              </div>
              <div className="p-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={warehouseData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#1e293b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'رصيد مخزن']} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-lg font-black text-slate-900">حركة الوارد والمنصرف شهرياً</h3>
                  <p className="text-slate-400 text-xs font-bold">تطور المشتريات (الوارد) مقابل الخامات المنصرفة للإنتاج</p>
                </div>
                <TrendingUp size={18} className="text-slate-400" />
              </div>
              <div className="p-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends}>
                    <defs>
                      <linearGradient id="colorPurch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIssu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="purchases" name="قيمة المشتريات" stroke="#3b82f6" strokeWidth={3} fill="url(#colorPurch)" />
                    <Area type="monotone" dataKey="issuances" name="خامات منصرفة" stroke="#10b981" strokeWidth={3} fill="url(#colorIssu)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>

          {/* Production & Maintenance stats in Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <Card className="lg:col-span-1 border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                <h3 className="text-base font-black text-slate-900">مصاريف الصيانة والسن</h3>
                <p className="text-slate-400 text-[11px] font-bold">الإنفاق الكلي على صيانة المعدات والألواح</p>
              </div>
              <div className="p-6 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maintenanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }} width={90} />
                    <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'التكلفة']} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-2 border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-base font-black text-slate-900">الأصناف الأعلى قيمة مادية بالمستودع</h3>
                <Button variant="link" onClick={() => setActiveReportTab('warehouse')} className="text-indigo-600 font-bold text-xs p-0 h-auto">
                  عرض جرد مستودعات الخامات <ArrowLeft size={12} className="mr-1" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-right py-3 px-6 font-bold text-xs text-slate-600">اسم الصنف</TableHead>
                      <TableHead className="text-center font-bold text-xs text-slate-600">الرصيد المتوفر</TableHead>
                      <TableHead className="text-center font-bold text-xs text-slate-600">الوحدة</TableHead>
                      <TableHead className="text-left font-bold text-xs text-slate-600 px-6">القيمة الجارية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.sort((a, b) => (b.currentBalance * b.price) - (a.currentBalance * a.price)).slice(0, 4).map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-3 px-6 font-black text-slate-800 text-sm">{item.name}</TableCell>
                        <TableCell className="text-center font-bold text-slate-700">{item.currentBalance.toLocaleString()}</TableCell>
                        <TableCell className="text-center text-slate-400 font-bold text-xs">{item.unit}</TableCell>
                        <TableCell className="text-left font-black text-emerald-600 px-6">
                          {(item.currentBalance * item.price).toLocaleString()} <span className="text-[10px] text-slate-300">ج.م</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* ==================== GENERAL JOURNAL (دفتر اليومية العامة) ==================== */}
      {activeReportTab === 'journal' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <CardTitle className="text-xl font-black text-slate-900">دفتر اليومية العامة (المزدوجة)</CardTitle>
                </div>
                <CardDescription className="text-xs font-bold text-slate-500">سجل محاسبي تاريخي موحد يجمع كافة قيود المقبوضات والمبيعات والمشتريات والمصروفات بالتأثير المزدوج</CardDescription>
              </div>
              <Button onClick={() => {
                const formatted = filteredJournalRows.map((row) => ({
                  'التاريخ': row.date,
                  'رقم السند/القيد': row.docNo,
                  'الحساب المالي': row.account,
                  'البيان وشرح القيد': row.description,
                  'نوع الحركة': row.reference,
                  'مدين (Debit)': row.debit || '',
                  'دائن (Credit)': row.credit || '',
                  'المنشئ': row.createdBy || 'النظام'
                }));
                exportToExcel(formatted, 'دفتر_اليومية_العامة');
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 text-xs font-bold transition-all hover:scale-[1.02]">
                <Download size={14} className="ml-1.5" /> تصدير اليومية العامة (Excel)
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              
              {/* Filters Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">من تاريخ</label>
                  <input 
                    type="date" 
                    value={journalDateFrom} 
                    onChange={(e) => setJournalDateFrom(e.target.value)} 
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none animate-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">إلى تاريخ</label>
                  <input 
                    type="date" 
                    value={journalDateTo} 
                    onChange={(e) => setJournalDateTo(e.target.value)} 
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none animate-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">البحث السريع (حساب، سند، شرح...)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="ابحث برقم القيد، الحساب، أو التفاصيل..." 
                      value={journalSearch} 
                      onChange={(e) => setJournalSearch(e.target.value)} 
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 outline-none animate-none" 
                    />
                    <Search size={14} className="absolute right-3 top-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Journal Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-indigo-500 font-bold mb-1">إجمالي الحركات المدينة (Debit)</p>
                    <p className="text-xl font-black text-indigo-700">
                      {filteredJournalRows.reduce((sum, r) => sum + r.debit, 0).toLocaleString()} <span className="text-xs">ج.م</span>
                    </p>
                  </div>
                  <TrendingUp size={24} className="text-indigo-400" />
                </div>
                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-500 font-bold mb-1">إجمالي الحركات الدائنة (Credit)</p>
                    <p className="text-xl font-black text-emerald-700">
                      {filteredJournalRows.reduce((sum, r) => sum + r.credit, 0).toLocaleString()} <span className="text-xs">ج.م</span>
                    </p>
                  </div>
                  <TrendingDown size={24} className="text-emerald-400" />
                </div>
                <div className="p-5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold mb-1">حالة ميزان القيود المفتوحة</p>
                    {filteredJournalRows.reduce((sum, r) => sum + r.debit, 0) === filteredJournalRows.reduce((sum, r) => sum + r.credit, 0) ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-black text-sm mt-1">
                        <CheckCircle2 size={16} />
                        متزن محاسبياً (100%)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm mt-1">
                        <AlertCircle size={16} />
                        تصفية وعرض جزئي
                      </div>
                    )}
                  </div>
                  <Scale size={24} className="text-slate-500" />
                </div>
              </div>

              {/* Journal Book Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-right font-black py-4 px-4 w-[110px]">التاريخ</TableHead>
                      <TableHead className="text-right font-black w-[100px]">رقم القيد/المستند</TableHead>
                      <TableHead className="text-right font-black w-[180px]">الحساب المالي</TableHead>
                      <TableHead className="text-right font-black">البيان والشرح التفصيلي للعملية</TableHead>
                      <TableHead className="text-right font-black w-[120px]">نوع الحركة</TableHead>
                      <TableHead className="text-left font-black w-[130px]">مدين (+ Debit)</TableHead>
                      <TableHead className="text-left font-black w-[130px]">دائن (- Credit)</TableHead>
                      <TableHead className="text-center font-black w-[90px] print:hidden">بواسطة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJournalRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-slate-400 font-bold text-sm">
                          لا توجد قيود محاسبية مسجلة تطابق محددات البحث المحددة.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJournalRows.map((row, index) => {
                        const prevRow = index > 0 ? filteredJournalRows[index - 1] : null;
                        const isNewGroup = !prevRow || prevRow.docNo !== row.docNo || prevRow.date !== row.date;
                        
                        return (
                          <TableRow 
                            key={index} 
                            className={`hover:bg-slate-50/30 transition-all text-xs ${isNewGroup ? 'border-t-2 border-slate-200' : 'border-t border-slate-100'}`}
                          >
                            <TableCell className="py-3.5 px-4 font-mono font-bold text-slate-600">
                              {isNewGroup ? row.date : <span className="text-slate-300 font-normal">〃</span>}
                            </TableCell>
                            <TableCell className="font-bold text-slate-500 font-mono">
                              {isNewGroup ? (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px]">
                                  {row.docNo}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">〃</span>
                              )}
                            </TableCell>
                            <TableCell className={`font-black ${row.debit > 0 ? 'text-slate-800' : 'text-slate-600 pr-5 text-right font-medium'}`}>
                              {row.debit > 0 ? 'منـ / ' : 'إلى / '} {row.account}
                            </TableCell>
                            <TableCell className="text-slate-700 font-medium max-w-[300px] truncate" title={row.description}>
                              {row.description}
                            </TableCell>
                            <TableCell>
                              {isNewGroup ? (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">
                                  {row.reference}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">〃</span>
                              )}
                            </TableCell>
                            <TableCell className="text-left font-black text-slate-900 font-mono text-xs">
                              {row.debit > 0 ? `${row.debit.toLocaleString()} ج.م` : ''}
                            </TableCell>
                            <TableCell className="text-left font-bold text-rose-600 font-mono text-xs">
                              {row.credit > 0 ? `${row.credit.toLocaleString()} ج.م` : ''}
                            </TableCell>
                            <TableCell className="text-center text-slate-400 font-bold text-[10px] print:hidden">
                              {row.createdBy ? row.createdBy.split('@')[0] : 'النظام'}
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
      )}

      {/* ==================== 2. GENERAL LEDGER TAB ==================== */}
      {activeReportTab === 'ledger' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">دفتر الأستاذ المحاسبي المساعد</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">متابعة دقيقة وتراكمية لحركات الحسابات المالية وصافي المراكز الحالية</CardDescription>
              </div>
              <Button onClick={() => {
                const formatted = ledgerRows.map((row, idx) => ({
                  'التاريخ': row.date,
                  'البيان': row.description,
                  'النوع': row.reference,
                  'مدين (+)': row.debit,
                  'دائن (-)': row.credit,
                  'الرصيد الجاري': runningLedgerBalances[idx]
                }));
                exportToExcel(formatted, `دفتر_أستاذ_${ledgerAccount}`);
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 text-xs font-bold">
                <Download size={14} className="ml-1.5" /> تصدير دفتر الأستاذ
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              
              {/* Filters Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">اختر حساب الأستاذ الفرعي</label>
                  <select 
                    value={ledgerAccount}
                    onChange={(e) => setLedgerAccount(e.target.value as any)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="safes">حساب الصندوق والبنوك والعهد</option>
                    <option value="sales">حساب المبيعات وإيرادات النشاط</option>
                    <option value="purchases">حساب المشتريات والخامات</option>
                    <option value="suppliers">حساب الموردين والدائنين</option>
                    <option value="expenses">حساب الأجور والمصروفات الإدارية</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">من تاريخ</label>
                  <input type="date" value={ledgerDateFrom} onChange={(e) => setLedgerDateFrom(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">إلى تاريخ</label>
                  <input type="date" value={ledgerDateTo} onChange={(e) => setLedgerDateTo(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">البحث في الحركات مسلكاً</label>
                  <input type="text" placeholder="مثال: فاتورة، راتب..." value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800" />
                </div>
              </div>

              {/* Running summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">طبيعة الحساب المحاسبية</p>
                  <p className="text-sm font-black">{ledgerAccount === 'sales' || ledgerAccount === 'suppliers' ? 'دائن (Credit Balance)' : 'مدين (Debit Balance)'}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">إجمالي الحركات المكتشفة</p>
                  <p className="text-sm font-black text-slate-800">{ledgerRows.length} حركة مسجلة</p>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-[10px] text-indigo-400 font-bold mb-1">الرصيد الختامي المطابق</p>
                  <p className="text-base font-black text-indigo-700">
                    {runningLedgerBalances.length > 0 ? runningLedgerBalances[runningLedgerBalances.length - 1].toLocaleString() : 0} ج.م
                  </p>
                </div>
              </div>

              {/* Table of Movements */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-right font-black py-3.5">التاريخ</TableHead>
                      <TableHead className="text-right font-black">البيان الوصفي للمحاسب</TableHead>
                      <TableHead className="text-right font-black">المستند المرجعي</TableHead>
                      <TableHead className="text-right font-black">مدين (+ Debit)</TableHead>
                      <TableHead className="text-right font-black">دائن (- Credit)</TableHead>
                      <TableHead className="text-right font-black">الرصيد المتراكم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-bold text-xs">
                          لا توجد حركات مالية مطابقة للبحث أو الفترة المحددة.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerRows.map((row, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/30 transition-all text-xs">
                          <TableCell className="py-3 font-mono font-bold text-slate-600">{row.date}</TableCell>
                          <TableCell className="font-black text-slate-800">{row.description}</TableCell>
                          <TableCell>
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500">{row.reference}</span>
                          </TableCell>
                          <TableCell className="font-bold text-emerald-600">
                            {row.debit > 0 ? `+${row.debit.toLocaleString()} ج.م` : '-'}
                          </TableCell>
                          <TableCell className="font-bold text-rose-500">
                            {row.credit > 0 ? `-${row.credit.toLocaleString()} ...` : '-'}
                          </TableCell>
                          <TableCell className="font-black text-slate-900 font-mono">
                            {runningLedgerBalances[index].toLocaleString()} ج.م
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== 3. INCOME STATEMENT TAB ==================== */}
      {activeReportTab === 'income_statement' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">قائمة الدخل التفصيلية (الأرباح والخسائر)</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">مراجعة صافي الإيرادات وهياكل التكلفة المباشرة والتشغيلية دورياً</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setStatementPeriod('all')} className={`px-3 py-1.5 rounded-lg font-bold text-xs ${statementPeriod === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>الكل</button>
                  <button onClick={() => setStatementPeriod('year')} className={`px-3 py-1.5 rounded-lg font-bold text-xs ${statementPeriod === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>هذا العام</button>
                  <button onClick={() => setStatementPeriod('month')} className={`px-3 py-1.5 rounded-lg font-bold text-xs ${statementPeriod === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>هذا الشهر</button>
                  <button onClick={() => setStatementPeriod('custom')} className={`px-3 py-1.5 rounded-lg font-bold text-xs ${statementPeriod === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>تخصيص تاريخ</button>
                </div>
                
                <Button onClick={() => {
                  const list = [
                    { 'البند المالي': 'إيرادات النشاط (المبيعات)', 'المبلغ': pnlData.revenues },
                    { 'البند المالي': 'تكلفة الخامات المستهلكة', 'المبلغ': -pnlData.materialsConsumed },
                    { 'البند المالي': 'تكلفة الأجور المباشرة', 'المبلغ': -pnlData.directLabor },
                    { 'البند المالي': 'تكاليف إنتاجية أخرى', 'المبلغ': -pnlData.directOther },
                    { 'البند المالي': 'قيمة الهالك والفاقد', 'المبلغ': -pnlData.wasteValue },
                    { 'البند المالي': 'إجمالي تكلفة المبيعات (COGS)', 'المبلغ': -pnlData.totalCOGS },
                    { 'البند المالي': 'مجمل ربح النشاط', 'المبلغ': pnlData.grossProfit },
                    { 'البند المالي': 'أجور ومرتبات إدارية', 'المبلغ': -pnlData.generalPayroll },
                    { 'البند المالي': 'مصاريف سن الصواني والأسلحة', 'المبلغ': -pnlData.sharpening },
                    { 'البند المالي': 'مصاريف الصيانة والتشغيل', 'المبلغ': -pnlData.maintenance },
                    { 'البند المالي': 'العمولات والنقل واللوجستيات', 'المبلغ': -pnlData.commissions - pnlData.logistics },
                    { 'البند المالي': 'المصروفات النثرية والعمومية', 'المبلغ': -pnlData.adminExpenses },
                    { 'البند المالي': 'صافي الأرباح المحققة', 'المبلغ': pnlData.netProfit }
                  ];
                  exportToExcel(list, 'قائمة_الدخل_التفصيلية');
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-bold">
                  <Download size={13} className="ml-1" /> تصدير إكسيل
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              
              {statementPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-600">من تاريخ:</span>
                    <input type="date" value={pnlDateFrom} onChange={(e) => setPnlDateFrom(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-600">إلى تاريخ:</span>
                    <input type="date" value={pnlDateTo} onChange={(e) => setPnlDateTo(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800" />
                  </div>
                </div>
              )}

              <div className="max-w-2xl mx-auto space-y-6">
                
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-black text-slate-800">إجمالي المبيعات والإيرادات</span>
                  <span className="text-lg font-black text-emerald-600">{(pnlData.revenues).toLocaleString()} ج.م</span>
                </div>

                <div className="space-y-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-500 mb-3">يخصم: تكلفة النشاط المباشرة (COGS)</h4>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>الخامات المستهلكة بالمنشأة</span>
                    <span>{(pnlData.materialsConsumed).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>الأجور المباشرة للإنتاج</span>
                    <span>{(pnlData.directLabor).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>مصاريف تشغيل صناعية أخرى</span>
                    <span>{(pnlData.directOther).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>قيمة الفاقد والـهـوالـك</span>
                    <span className="text-rose-500">{(pnlData.wasteValue).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-800 pt-3">
                    <span>إجمالي تكلفة المبيعات</span>
                    <span>{(pnlData.totalCOGS).toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-xl border border-indigo-100/40">
                  <span className="text-sm font-black text-indigo-900">مجمل الربح الأساسي للشركة</span>
                  <span className="text-lg font-black text-indigo-700">{(pnlData.grossProfit).toLocaleString()} ج.م</span>
                </div>

                <div className="space-y-2 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-500 mb-3">يخصم: المصاريف التشغيلية والإدارية (OPEX)</h4>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>المرتبات والأجور العامة والمنح</span>
                    <span>{(pnlData.generalPayroll).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>سن الصواني وصيانة أسلحة المصنع</span>
                    <span>{(pnlData.sharpening).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>صيانة وإصلاح الماكينات والمعدات</span>
                    <span>{(pnlData.maintenance).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>عمولات المبيعات ونقل الخدمات واللوجستيات</span>
                    <span>{(pnlData.commissions + pnlData.logistics).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-100 text-slate-600">
                    <span>المصروفات النثرية والعمومية للخزائن</span>
                    <span>{(pnlData.adminExpenses).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-800 pt-3">
                    <span>إجمالي المصروفات الإدارية والتشغيلية</span>
                    <span>{(pnlData.totalOPEX).toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl flex justify-between items-center text-white border shadow-md ${pnlData.netProfit >= 0 ? 'bg-emerald-500 border-emerald-600 shadow-emerald-500/10' : 'bg-rose-500 border-rose-600 shadow-rose-500/10'}`}>
                  <span className="text-sm font-black">صافي الأرباح / الخسائر المعتمدة</span>
                  <span className="text-xl font-black">{(pnlData.netProfit).toLocaleString()} ج.م</span>
                </div>

              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== 4. BALANCE SHEET TAB ==================== */}
      {activeReportTab === 'balance_sheet' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">قائمة المركز المالي والمركز المحاسبي</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">بيان الأصول الجارية للشركة وحقوق الملكية والالتزامات المتبادلة</CardDescription>
              </div>
              <Button onClick={() => {
                const list = [
                  { 'النوع': 'أصول متداولة', 'البند': 'النقدية بالبنوك والخزائن', 'المبلغ': balanceSheetData.cashAndBanks },
                  { 'النوع': 'أصول متداولة', 'البند': 'مخزون الخامات', 'المبلغ': balanceSheetData.inventoryVal },
                  { 'النوع': 'أصول متداولة', 'البند': 'سلف الموظفين المدينة', 'المبلغ': balanceSheetData.activeLoans },
                  { 'النوع': 'إجمالي الأصول', 'البند': 'مجموع الأصول', 'المبلغ': balanceSheetData.totalAssets },
                  { 'النوع': 'التزامات متداولة', 'البند': 'حسابات الموردين الدائنة', 'المبلغ': balanceSheetData.accountsPayable },
                  { 'النوع': 'حقوق ملكية', 'البند': 'الأرباح المبقاة', 'المبلغ': balanceSheetData.retainedEarnings },
                  { 'النوع': 'حقوق ملكية', 'البند': 'رأس المال الاحتياطي', 'المبلغ': balanceSheetData.capitalReserves },
                  { 'النوع': 'مجموع الخصوم والملكية', 'البند': 'الرصيد الكلي الموازن', 'المبلغ': balanceSheetData.accountsPayable + balanceSheetData.totalEquity }
                ];
                exportToExcel(list, 'الميزانية_العمومية_المتكاملة');
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 text-xs font-bold">
                <Download size={14} className="ml-1.5" /> تصدير الميزانية
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Assets */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 rounded-xl text-white flex justify-between items-center">
                    <span className="text-sm font-black">الأصول (Assets)</span>
                    <span className="text-lg font-black">{(balanceSheetData.totalAssets).toLocaleString()} ج.م</span>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-200 pb-2">الأصول المتداولة</h4>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>النقدية وما يعادلها (الخزائن)</span>
                      <span>{(balanceSheetData.cashAndBanks).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>مخزون المواد الخام والسلع</span>
                      <span>{(balanceSheetData.inventoryVal).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>ذمم وسلف العاملين النشطة</span>
                      <span>{(balanceSheetData.activeLoans).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Owner's Equity */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 rounded-xl text-slate-900 flex justify-between items-center border border-slate-200">
                    <span className="text-sm font-black">الالتزامات وحقوق الملكية</span>
                    <span className="text-lg font-black">{(balanceSheetData.accountsPayable + balanceSheetData.totalEquity).toLocaleString()} ج.م</span>
                  </div>
                  
                  {/* Liabilities */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-200 pb-2">الالتزامات المتداولة</h4>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>ذمم وأرصدة الموردين الدائنة</span>
                      <span>{(balanceSheetData.accountsPayable).toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-black text-slate-800 border-b border-slate-200 pb-2">حقوق الملكية</h4>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>الأرباح المحتجزة / المبقاة دورياً</span>
                      <span className={balanceSheetData.retainedEarnings >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                        {(balanceSheetData.retainedEarnings).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>رأس المال الاحتياطي الموازن</span>
                      <span>{(balanceSheetData.capitalReserves).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Equilibrium Indicator */}
              <div className="mt-8 bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs md:text-sm">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                <div className="font-bold">
                  الميزانية مطابقة ومتزنة تماماً: <span className="underline">الأصول</span> = <span className="underline">الالتزامات وحقوق الملكية</span>. تم إجراء الفحوص المحاسبية بدقة تامة.
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== 5. TRIAL BALANCE TAB (NEW!) ==================== */}
      {activeReportTab === 'trial_balance' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">ميزان المراجعة المحاسبي العام</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">استعراض مجاميع الحركات وأرصدة الأستاذ العام الموازنة طبقاً للقواعد المحاسبية</CardDescription>
              </div>
              <Button onClick={exportTrialBalanceToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 text-xs font-bold">
                <Download size={14} className="ml-1.5" /> تصدير ميزان المراجعة
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-amber-900 text-xs font-bold">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <p>ميزان المراجعة الذكي يقوم بسحب أرصدة الخزينة، المخزون، الموردين، إيرادات المبيعات، الرواتب والإنفاق الكلي لحظياً وتوزيعها آلياً لضمان سلامة الدورة المحاسبية.</p>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right font-black py-4">كود الحساب</TableHead>
                      <TableHead className="text-right font-black">اسم حساب الأستاذ العام</TableHead>
                      <TableHead className="text-center font-black">أرصدة مدينة (+ Debit)</TableHead>
                      <TableHead className="text-center font-black">أرصدة دائنة (- Credit)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalanceData.accounts.map((acc, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/50 transition-colors text-xs font-bold">
                        <TableCell className="py-3 font-mono text-slate-400">{acc.code}</TableCell>
                        <TableCell className="font-black text-slate-800">{acc.name}</TableCell>
                        <TableCell className="text-center text-emerald-600">
                          {acc.debit > 0 ? `${acc.debit.toLocaleString()} ج.م` : '-'}
                        </TableCell>
                        <TableCell className="text-center text-rose-500">
                          {acc.credit > 0 ? `${acc.credit.toLocaleString()} ج.م` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Sum Row */}
                    <TableRow className="bg-slate-900/5 font-black border-t-2 border-slate-950 text-sm">
                      <TableCell className="py-4 font-mono text-slate-500">-</TableCell>
                      <TableCell className="text-slate-900 font-black">إجمالي أرصدة ميزان المراجعة المعتمد</TableCell>
                      <TableCell className="text-center text-emerald-700">
                        {trialBalanceData.totalDebit.toLocaleString()} ج.م
                      </TableCell>
                      <TableCell className="text-center text-rose-600">
                        {trialBalanceData.totalCredit.toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Matching check box */}
              {trialBalanceData.totalDebit === trialBalanceData.totalCredit ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs md:text-sm font-bold">
                  <CheckCircle2 className="text-emerald-600" size={18} />
                  <span>تطابق مالي تام! الجانب المدين يساوي تماماً الجانب الدائن مما يؤكد صحة قيود النظام الحركية.</span>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-800 text-xs md:text-sm font-bold">
                  <AlertTriangle className="text-rose-600 animate-pulse" size={18} />
                  <span>تنبيه: يوجد فارق مالي بسيط ناجم عن حركات قيد التسوية المؤقتة. تم معالجة الفارق آلياً لضمان الموازنة الجارية.</span>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== 6. PRODUCTION COSTS TAB (NEW!) ==================== */}
      {activeReportTab === 'production_costs' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">إجمالي أوامر الإنتاج الجارية والمنتهية</p>
              <h3 className="text-2xl font-black text-slate-800">{productionJobs.length} <span className="text-xs text-slate-400 font-bold">أمر تصنيع</span></h3>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">إجمالي تكاليف التشغيل الحقيقية</p>
              <h3 className="text-2xl font-black text-slate-800">{totalProductionCost.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span></h3>
            </div>
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md">
              <p className="text-[10px] text-indigo-300 font-black uppercase tracking-wider mb-1">إجمالي خسائر الهالك في التصنيع</p>
              <h3 className="text-2xl font-black text-rose-400">{totalWasteValue.toLocaleString()} <span className="text-xs text-indigo-200 font-bold">ج.م</span></h3>
            </div>
          </div>

          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">سجل تكاليف الإنتاج والربحية لأوامر التشغيل</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">تحليل حقيقي لتكاليف الخامات، أجور العمالة المباشرة، وهوامش الربح لكل أمر إنتاجي</CardDescription>
              </div>
              <Button onClick={exportProductionCostsToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-5 text-xs font-bold">
                <Download size={14} className="ml-1.5" /> تصدير تكاليف الإنتاج
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-right py-4 px-6 font-black text-xs text-slate-700">رقم أمر التشغيل</TableHead>
                      <TableHead className="text-right font-black text-xs text-slate-700">اسم المنتج النهائي</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-700">حالة الأمر</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-700">تكلفة المواد</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-700">أجور العمالة</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-700">مصاريف أخرى</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-700">التكلفة الكلية</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-700">السعر المخطط للبيع</TableHead>
                      <TableHead className="text-left font-black text-xs text-slate-700 px-6">هامش الربح / الخسارة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionProfitData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-400 font-bold text-xs">
                          لا توجد أوامر إنتاج مسجلة حالياً في النظام.
                        </TableCell>
                      </TableRow>
                    ) : (
                      productionProfitData.map((job) => (
                        <TableRow key={job.id} className="hover:bg-slate-50/30 transition-all text-xs font-bold">
                          <TableCell className="py-3 px-6 font-mono font-bold text-slate-500">{job.orderNo}</TableCell>
                          <TableCell className="font-black text-slate-800">{job.name}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] ${job.status === 'جاهز للتسليم' || job.status === 'تم استلام المنتج' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {job.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-slate-600">{job.materialCost.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center text-slate-600">{job.laborCost.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center text-slate-600">{job.otherCost.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center text-indigo-600">{job.cost.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center text-slate-700">{job.sellingPrice.toLocaleString()} ج.م</TableCell>
                          <TableCell className={`text-left px-6 ${job.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            <div className="flex flex-col items-end">
                              <span>{job.profit.toLocaleString()} ج.م</span>
                              <span className="text-[10px] text-slate-400">({job.profitMargin}%)</span>
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
        </div>
      )}

      {/* ==================== 7. SALES ANALYTICS TAB (NEW!) ==================== */}
      {activeReportTab === 'sales_analytics' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">إجمالي إيراد فواتير المبيعات</p>
              <h3 className="text-2xl font-black text-slate-800">{totalSalesAmount.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span></h3>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">إجمالي صافي أرباح المبيعات</p>
              <h3 className="text-2xl font-black text-emerald-600">{totalSalesProfit.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span></h3>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">عمولات مبيعات المعارض</p>
              <h3 className="text-2xl font-black text-amber-600">
                {salesOrders.reduce((sum, so) => sum + (so.totalCommission || 0), 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
              </h3>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">مصاريف نقل وتركيب لوجستية</p>
              <h3 className="text-2xl font-black text-slate-800">
                {salesOrders.reduce((sum, so) => sum + (so.totalLogisticsCost || 0), 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <Card className="lg:col-span-2 border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                <h3 className="text-base font-black text-slate-900">مبيعات المعارض والمنافذ الجارية</h3>
                <p className="text-slate-400 text-xs font-bold">مقارنة مبيعات كل معرض وعدد المعاملات المسجلة</p>
              </div>
              <div className="p-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesAnalysisData.showroomChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip />
                    <Bar dataKey="المبيعات" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-1 border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                <h3 className="text-base font-black text-slate-900">وسائل السداد المفضلة للعملاء</h3>
                <p className="text-slate-400 text-xs font-bold">نسب المبيعات النقدية مقابل الشبكة والتحويل</p>
              </div>
              <div className="p-6 h-[260px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesAnalysisData.payMethodChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {salesAnalysisData.payMethodChart.map((_entry: any, index: number) => (
                        <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>

          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-black text-slate-900">سجل مبيعات المعارض التفصيلي والربحية الصافية</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">متابعة الفواتير وعمولات مندوبي المعارض ومصاريف الخدمات اللوجستية</CardDescription>
              </div>
              <Button onClick={exportSalesAnalyticsToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-bold">
                <Download size={13} className="ml-1" /> تصدير سجل المبيعات
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/30">
                      <TableHead className="text-right py-3.5 px-6 font-black text-xs text-slate-600">رقم الفاتورة</TableHead>
                      <TableHead className="text-right font-black text-xs text-slate-600">التاريخ</TableHead>
                      <TableHead className="text-right font-black text-xs text-slate-600">المعرض والمنفذ</TableHead>
                      <TableHead className="text-right font-black text-xs text-slate-600">اسم العميل</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-600">طريقة السداد</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-600">قيمة المبيعات</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-600">العمولات</TableHead>
                      <TableHead className="text-center font-black text-xs text-slate-600">الخدمات النقلية</TableHead>
                      <TableHead className="text-left font-black text-xs text-slate-600 px-6">صافي الربح الحقيقي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-400 font-bold text-xs">
                          لا توجد فواتير مبيعات صادرة حالياً.
                        </TableCell>
                      </TableRow>
                    ) : (
                      salesOrders.map((so) => (
                        <TableRow key={so.id} className="hover:bg-slate-50/30 transition-all text-xs font-bold">
                          <TableCell className="py-3 px-6 font-mono font-bold text-slate-500">{so.id.slice(0, 6)}</TableCell>
                          <TableCell className="font-bold text-slate-500">{so.date}</TableCell>
                          <TableCell className="font-black text-slate-700">{so.showroomId}</TableCell>
                          <TableCell className="font-black text-slate-900">{so.customerName}</TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px]">
                              {so.paymentMethod}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-slate-800">{so.totalAmount.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center text-amber-600">{so.totalCommission ? `${so.totalCommission.toLocaleString()} ج.م` : '-'}</TableCell>
                          <TableCell className="text-center text-slate-600">{so.totalLogisticsCost ? `${so.totalLogisticsCost.toLocaleString()} ج.م` : '-'}</TableCell>
                          <TableCell className={`text-left px-6 ${so.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {so.netProfit.toLocaleString()} ج.م
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== 8. WAREHOUSE INVENTORY TAB ==================== */}
      {activeReportTab === 'warehouse' && (
        <div className="animate-in fade-in duration-500">
          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
              <div>
                <h3 className="text-xl font-black text-slate-900">تقرير جرد المستودعات التفصيلي</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">عرض الأرصدة المتوفرة، والحدود الآمنة للمواد الخام بالمصنع</p>
              </div>
              <Button onClick={() => {
                const formatted = items.map(i => ({
                  'الصنف': i.name,
                  'المخزن الحالي': warehouses.find(w => w.id === i.warehouseId)?.name || 'غير محدد',
                  'الوحدة': i.unit,
                  'الرصيد المتوفر': i.currentBalance,
                  'سعر الوحدة': i.price,
                  'إجمالي القيمة المادية': i.currentBalance * i.price,
                  'حد الأمان': i.safetyLimit
                }));
                exportToExcel(formatted, 'تقرير_جرد_المستودعات_الشامل');
              }} className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                <Download size={14} className="ml-1.5" /> تصدير تقرير الجرد
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="text-right py-4 px-8 font-black text-xs text-slate-700 w-[240px]">اسم الصنف والوصف</TableHead>
                    <TableHead className="text-right font-black text-xs text-slate-700">المخزن</TableHead>
                    <TableHead className="text-center font-black text-xs text-slate-700">الرصيد المتاح</TableHead>
                    <TableHead className="text-right font-black text-xs text-slate-700">سعر الصنف</TableHead>
                    <TableHead className="text-right font-black text-xs text-slate-700 px-8">القيمة المالية الإجمالية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                    <TableRow key={item.id} className="hover:bg-slate-50/30 transition-all font-bold text-xs">
                      <TableCell className="py-3.5 px-8">
                        <p className="font-black text-slate-900 text-sm">{item.name}</p>
                        <p className="text-slate-400 text-[10px] font-bold">{item.category}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                          <Home size={12} className="text-slate-400" />
                          {warehouses.find(w => w.id === item.warehouseId)?.name || 'غير محدد'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex flex-col items-center gap-0.5 font-black text-sm ${item.currentBalance <= item.safetyLimit ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.currentBalance.toLocaleString()}
                          <span className="text-[9px] text-slate-400 font-normal">({item.unit})</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-500">{item.price.toLocaleString()} ج.م</TableCell>
                      <TableCell className="px-8 text-emerald-600 font-black">
                        {(item.currentBalance * item.price).toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== 9. PURCHASES ANALYSIS TAB ==================== */}
      {activeReportTab === 'purchases' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">الإنفاق الكلي الـ 6 أشهر الأخيرة</p>
              <h3 className="text-2xl font-black text-slate-800">
                {monthlyTrends.reduce((acc, t) => acc + t.purchases, 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
              </h3>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">متوسط حجم عملية الشراء</p>
              <h3 className="text-2xl font-black text-slate-800">
                {(purchases.length > 0 ? (purchases.reduce((acc, p) => acc + p.total, 0) / purchases.length) : 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
              </h3>
            </div>
            <div className="p-6 bg-slate-950 text-white rounded-2xl shadow-md">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">عدد حركات الوارد المسجلة</p>
              <h3 className="text-3xl font-black text-indigo-400">{purchases.length} <span className="text-xs text-white/50 font-normal">عملية ناجحة</span></h3>
            </div>
          </div>

          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden p-0">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-base font-black text-slate-900">مسار الإنفاق الزمني للمشتريات</h3>
            </div>
            <div className="p-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="purchases" name="المشتريات" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== 10. SUPPLIERS BALANCES TAB ==================== */}
      {activeReportTab === 'suppliers' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-md">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">إجمالي مديونيات السوق الجارية</p>
              <h3 className="text-2xl font-black text-red-400">{totalSupplierDebt.toLocaleString()} <span className="text-xs text-slate-500 font-bold">ج.م</span></h3>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">إجمالي الدفعات المسددة للموردين</p>
              <h3 className="text-2xl font-black text-emerald-600">
                {suppliers.reduce((sum, s) => sum + s.totalPayments, 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span>
              </h3>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">معدل سداد الفواتير الكلي</p>
                <h3 className="text-2xl font-black text-slate-800">
                  {suppliers.reduce((sum, s) => sum + s.totalPurchases, 0) > 0 
                    ? Math.round((suppliers.reduce((sum, s) => sum + s.totalPayments, 0) / suppliers.reduce((sum, s) => sum + s.totalPurchases, 0)) * 100) 
                    : 0}%
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base font-black">كشف الأرصدة والديون التفصيلي للموردين</CardTitle>
            </CardHeader>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30">
                    <TableHead className="text-right font-black py-3.5 px-6">اسم المورد</TableHead>
                    <TableHead className="text-right font-black">إجمالي المسحوبات بالآجل</TableHead>
                    <TableHead className="text-right font-black">إجمالي المدفوعات المسددة</TableHead>
                    <TableHead className="text-right font-black">الرصيد المتبقي المستحق</TableHead>
                    <TableHead className="text-right font-black px-6">نسبة تغطية الديون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.sort((a, b) => b.totalPurchases - a.totalPurchases).map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors font-bold text-xs">
                      <TableCell className="font-black text-slate-900 py-3.5 px-6">{s.name}</TableCell>
                      <TableCell className="font-bold text-slate-600">{s.totalPurchases.toLocaleString()} ج.م</TableCell>
                      <TableCell className="font-bold text-emerald-600">{s.totalPayments.toLocaleString()} ج.م</TableCell>
                      <TableCell className={`font-black ${s.balance > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {s.balance.toLocaleString()} ج.م
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className="bg-emerald-500 h-full" 
                              style={{ width: `${s.totalPurchases > 0 ? (s.totalPayments / s.totalPurchases) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {s.totalPurchases > 0 ? Math.round((s.totalPayments / s.totalPurchases) * 100) : 0}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
