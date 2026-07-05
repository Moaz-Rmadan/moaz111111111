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
  Calendar, CheckCircle2, ChevronDown, ListFilter, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

import type { 
  Item, Supplier, Purchase, Issuance, Warehouse, 
  ProductionJob, JobLabor, JobOtherCost, Waste,
  BladeSharpening, PlateSharpening, MachineMaintenance, Safe, 
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
  bladeSharpening: BladeSharpening[];
  plateSharpening: PlateSharpening[];
  machineMaintenance: MachineMaintenance[];
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
  bladeSharpening,
  plateSharpening,
  machineMaintenance,
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
    'dashboard' | 'warehouse' | 'purchases' | 'suppliers' | 'ledger' | 'income_statement' | 'balance_sheet'
  >('dashboard');

  // General Ledger States
  const [ledgerAccount, setLedgerAccount] = useState<'safes' | 'sales' | 'purchases' | 'suppliers' | 'expenses'>('safes');
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Financial statements date filter
  const [statementPeriod, setStatementPeriod] = useState<'all' | 'year' | 'month'>('all');

  // Supplier Reports Data
  const supplierDebtData = useMemo(() => {
    return suppliers
      .filter(s => s.balance > 0)
      .map(s => ({ name: s.name, balance: s.balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [suppliers]);

  const supplierPurchasesData = useMemo(() => {
    return suppliers
      .map(s => ({ 
        name: s.name, 
        total: s.totalPurchases, 
        paid: s.totalPayments,
        debt: s.balance
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [suppliers]);

  const totalPaymentsAcrossSuppliers = useMemo(() => suppliers.reduce((acc, s) => acc + s.totalPayments, 0), [suppliers]);
  const totalDebtAcrossSuppliers = useMemo(() => suppliers.reduce((acc, s) => acc + s.balance, 0), [suppliers]);

  // Purchases logic
  const purchasesBySupplier = useMemo(() => {
    return suppliers.map(s => ({
      name: s.name,
      amount: purchases.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + p.total, 0)
    })).filter(s => s.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [suppliers, purchases]);

  const itemsByPurchaseValue = useMemo(() => {
    return items.map(item => ({
      name: item.name,
      value: purchases.filter(p => p.itemId === item.id).reduce((acc, p) => acc + p.total, 0)
    })).filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [items, purchases]);

  const purchaseTrends = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = format(d, 'MMM yyyy');
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const amount = purchases
        .filter(p => p.date >= format(firstDay, 'yyyy-MM-dd') && p.date <= format(lastDay, 'yyyy-MM-dd'))
        .reduce((acc, p) => acc + p.total, 0);
      return { name: monthStr, amount };
    }).reverse();
  }, [purchases]);

  const warehouseData = useMemo(() => {
    return warehouses.map(w => {
      const value = items
        .filter(i => i.warehouseId === w.id)
        .reduce((acc, i) => acc + (i.currentBalance * i.price), 0);
      return { name: w.name, value };
    });
  }, [warehouses, items]);

  const totalInventoryValue = useMemo(() => warehouseData.reduce((acc, w) => acc + w.value, 0), [warehouseData]);
  const totalSupplierDebt = useMemo(() => suppliers.reduce((acc, s) => acc + s.balance, 0), [suppliers]);
  
  const totalWasteValue = useMemo(() => {
    return wasteRecords.reduce((acc, w) => {
      const item = items.find(i => i.id === w.itemId);
      return acc + (w.quantity * (item?.price || 0));
    }, 0);
  }, [wasteRecords, items]);

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
        name: job.productName,
        orderNo: job.orderNo,
        cost: totalCost,
        sellingPrice: job.sellingPrice || 0,
        profit: profit
      };
    });
  }, [productionJobs, issuances, jobLabors, jobOtherCosts]);

  const totalProductionCost = useMemo(() => productionProfitData.reduce((acc, j) => acc + j.cost, 0), [productionProfitData]);

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
    { name: 'سن الصواني', value: plateSharpening.reduce((acc, s) => acc + s.cost, 0) },
    { name: 'سن الأسلحة', value: bladeSharpening.reduce((acc, s) => acc + s.cost, 0) },
    { name: 'صيانة الماكينات', value: machineMaintenance.reduce((acc, s) => acc + s.cost, 0) },
  ], [plateSharpening, bladeSharpening, machineMaintenance]);

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#34d399', '#8b5cf6', '#a78bfa'];

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // ==================== FINANCIAL STATEMENTS CORE LOGIC ====================

  // Period Date Filtering Helper
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
    return true;
  }, [statementPeriod]);

  // General Ledger dynamic row aggregation
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
        reference: `طلب مبيعات ${so.id.slice(0, 5)}`
      }));
    } else if (ledgerAccount === 'purchases') {
      rows = purchases.map(p => ({
        date: p.date,
        description: `شراء خامات ومواد - مورد: ${suppliers.find(s => s.id === p.supplierId)?.name || 'غير محدد'} (${p.quantity} ${p.unit})`,
        debit: p.total,
        credit: 0,
        reference: `فاتورة شراء`
      }));
    } else if (ledgerAccount === 'suppliers') {
      const pRows = purchases.map(p => ({
        date: p.date,
        description: `فاتورة شراء بالآجل - مورد: ${suppliers.find(s => s.id === p.supplierId)?.name || 'غير محدد'}`,
        debit: 0,
        credit: p.total,
        reference: 'فاتورة توريد'
      }));
      const payRows = supplierPayments.map(sp => ({
        date: sp.date,
        description: `سداد دفعة نقدية - مورد: ${suppliers.find(s => s.id === sp.supplierId)?.name || 'غير محدد'}`,
        debit: sp.amount,
        credit: 0,
        reference: 'سند صرف نقدي'
      }));
      rows = [...pRows, ...payRows];
    } else if (ledgerAccount === 'expenses') {
      const payRows = payrolls.map(p => ({
        date: p.paymentDate || p.startDate,
        description: `أجور ورواتب - فترة أسبوعية (${p.startDate} إلى ${p.endDate})`,
        debit: p.netSalary,
        credit: 0,
        reference: 'صرف الرواتب'
      }));
      const bladeRows = bladeSharpening.map(b => ({
        date: b.date,
        description: `مصروف سن أسلحة - ${b.bladeName}`,
        debit: b.cost,
        credit: 0,
        reference: 'سن أسلحة'
      }));
      const plateRows = plateSharpening.map(p => ({
        date: p.date,
        description: `مصروف سن صواني - ${p.plateName}`,
        debit: p.cost,
        credit: 0,
        reference: 'سن صواني'
      }));
      const maintRows = machineMaintenance.map(m => ({
        date: m.date,
        description: `صيانة ماكينات - ${m.machineName}`,
        debit: m.cost,
        credit: 0,
        reference: 'صيانة ماكينة'
      }));
      const generalRows = safeTransactions.filter(t => t.type === 'مصروفات').map(t => ({
        date: t.date,
        description: `مصروفات نثرية وتشغيلية - ${t.description}`,
        debit: t.amount,
        credit: 0,
        reference: 'مصروفات خزينة'
      }));
      const otherCosts = jobOtherCosts.map(j => ({
        date: j.date,
        description: `مصاريف تشغيلية للأوامر - ${j.description}`,
        debit: j.amount,
        credit: 0,
        reference: 'أمر تشغيل'
      }));
      rows = [...payRows, ...bladeRows, ...plateRows, ...maintRows, ...generalRows, ...otherCosts];
    }

    // Apply filters
    return rows.filter(r => {
      const matchesFrom = !ledgerDateFrom || r.date >= ledgerDateFrom;
      const matchesTo = !ledgerDateTo || r.date <= ledgerDateTo;
      const matchesSearch = !ledgerSearch || 
        r.description.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
        r.reference.toLowerCase().includes(ledgerSearch.toLowerCase());
      return matchesFrom && matchesTo && matchesSearch;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [ledgerAccount, safeTransactions, salesOrders, purchases, suppliers, supplierPayments, payrolls, bladeSharpening, plateSharpening, machineMaintenance, jobOtherCosts, ledgerDateFrom, ledgerDateTo, ledgerSearch]);

  // Running Ledger Balances
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

  // Income Statement (P&L) Calculations
  const pnlData = useMemo(() => {
    const revenues = salesOrders.filter(so => filterByPeriod(so.date)).reduce((sum, so) => sum + so.totalAmount, 0);
    
    const materialsConsumed = issuances.filter(iss => filterByPeriod(iss.date)).reduce((sum, iss) => sum + iss.total, 0);
    const directLabor = jobLabors.filter(jl => filterByPeriod(jl.date)).reduce((sum, jl) => sum + jl.total, 0);
    const directOther = jobOtherCosts.filter(jo => filterByPeriod(jo.date)).reduce((sum, jo) => sum + jo.amount, 0);
    const wasteMaterialsValue = wasteRecords.filter(w => filterByPeriod(w.date)).reduce((sum, w) => {
      const item = items.find(i => i.id === w.itemId);
      return sum + (w.quantity * (item?.price || 0));
    }, 0);
    const totalCOGS = materialsConsumed + directLabor + directOther + wasteMaterialsValue;
    const grossProfit = revenues - totalCOGS;

    const generalPayroll = payrolls.filter(p => p.paymentDate ? filterByPeriod(p.paymentDate) : filterByPeriod(p.startDate)).reduce((sum, p) => sum + p.netSalary, 0);
    const sharpening = bladeSharpening.filter(b => filterByPeriod(b.date)).reduce((sum, b) => sum + b.cost, 0) + 
                       plateSharpening.filter(p => filterByPeriod(p.date)).reduce((sum, p) => sum + p.cost, 0);
    const machineMaintenanceCost = machineMaintenance.filter(m => filterByPeriod(m.date)).reduce((sum, m) => sum + m.cost, 0);
    const commissions = salesOrders.filter(so => filterByPeriod(so.date)).reduce((sum, so) => sum + (so.totalCommission || 0), 0);
    const logistics = salesOrders.filter(so => filterByPeriod(so.date)).reduce((sum, so) => sum + (so.totalLogisticsCost || 0), 0);
    const administrative = safeTransactions.filter(t => t.type === 'مصروفات' && filterByPeriod(t.date)).reduce((sum, t) => sum + t.amount, 0);
    const totalOPEX = generalPayroll + sharpening + machineMaintenanceCost + commissions + logistics + administrative;
    const netProfit = grossProfit - totalOPEX;

    return {
      revenues,
      materialsConsumed,
      directLabor,
      directOther,
      wasteMaterialsValue,
      totalCOGS,
      grossProfit,
      generalPayroll,
      sharpening,
      machineMaintenanceCost,
      commissions,
      logistics,
      administrative,
      totalOPEX,
      netProfit
    };
  }, [salesOrders, issuances, jobLabors, jobOtherCosts, wasteRecords, items, payrolls, bladeSharpening, plateSharpening, machineMaintenance, safeTransactions, filterByPeriod]);

  // Balance Sheet Calculations (Cumulative State)
  const balanceSheetData = useMemo(() => {
    const cashAndBanks = safes.reduce((sum, s) => sum + s.balance, 0);
    const rawMaterialsInventory = items.reduce((sum, item) => sum + (item.currentBalance * item.price), 0);
    const employeeLoans = loans.filter(l => l.status === 'نشط').reduce((sum, l) => sum + l.remainingAmount, 0);
    const totalAssets = cashAndBanks + rawMaterialsInventory + employeeLoans;

    const supplierAccountsPayable = suppliers.reduce((sum, s) => sum + s.balance, 0);
    const totalLiabilities = supplierAccountsPayable;

    // Cumulative net income of all time
    const allRevenue = salesOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const allCOGS = issuances.reduce((sum, iss) => sum + iss.total, 0) +
                    jobLabors.reduce((sum, jl) => sum + jl.total, 0) +
                    jobOtherCosts.reduce((sum, jo) => sum + jo.amount, 0) +
                    wasteRecords.reduce((sum, w) => sum + (w.quantity * (items.find(i => i.id === w.itemId)?.price || 0)), 0);
    const allOPEX = payrolls.reduce((sum, p) => sum + p.netSalary, 0) +
                    bladeSharpening.reduce((sum, b) => sum + b.cost, 0) +
                    plateSharpening.reduce((sum, p) => sum + p.cost, 0) +
                    machineMaintenance.reduce((sum, m) => sum + m.cost, 0) +
                    salesOrders.reduce((sum, so) => sum + (so.totalCommission || 0), 0) +
                    salesOrders.reduce((sum, so) => sum + (so.totalLogisticsCost || 0), 0) +
                    safeTransactions.filter(t => t.type === 'مصروفات').reduce((sum, t) => sum + t.amount, 0);
    
    const retainedEarnings = allRevenue - allCOGS - allOPEX;
    const capitalReserves = totalAssets - totalLiabilities - retainedEarnings;
    const totalEquity = retainedEarnings + capitalReserves;

    return {
      cashAndBanks,
      rawMaterialsInventory,
      employeeLoans,
      totalAssets,
      supplierAccountsPayable,
      totalLiabilities,
      retainedEarnings,
      capitalReserves,
      totalEquity
    };
  }, [safes, items, loans, suppliers, salesOrders, issuances, jobLabors, jobOtherCosts, wasteRecords, payrolls, bladeSharpening, plateSharpening, machineMaintenance, safeTransactions]);

  // Excel exporters for financial statements
  const exportLedgerToExcel = () => {
    const formatted = ledgerRows.map((row, idx) => ({
      'التاريخ': row.date,
      'البيان الوصفي': row.description,
      'نوع الحركة': row.reference,
      'مدين (+)': row.debit,
      'دائن (-)': row.credit,
      'الرصيد الجاري': runningLedgerBalances[idx]
    }));
    exportToExcel(formatted, `دفتر_أستاذ_${ledgerAccount}`);
  };

  const exportIncomeStatementToExcel = () => {
    const list = [
      { 'البند المالي': 'إيرادات النشاط (المبيعات)', 'المبلغ (ج.م)': pnlData.revenues },
      { 'البند المالي': 'تكلفة المواد المباشرة المستهلكة', 'المبلغ (ج.م)': -pnlData.materialsConsumed },
      { 'البند المالي': 'تكلفة الأجور المباشرة للإنتاج', 'المبلغ (ج.م)': -pnlData.directLabor },
      { 'البند المالي': 'مصاريف إنتاجية أخرى مباشرة', 'المبلغ (ج.م)': -pnlData.directOther },
      { 'البند المالي': 'قيمة الهالك والفاقد من المواد', 'المبلغ (ج.م)': -pnlData.wasteMaterialsValue },
      { 'البند المالي': 'إجمالي تكلفة المبيعات (COGS)', 'المبلغ (ج.م)': -pnlData.totalCOGS },
      { 'البند المالي': 'مجمل ربح العمليات (Gross Profit)', 'المبلغ (ج.م)': pnlData.grossProfit },
      { 'البند المالي': 'الرواتب والأجور العامة والإدارية', 'المبلغ (ج.م)': -pnlData.generalPayroll },
      { 'البند المالي': 'مصاريف سن الصواني والأسلحة', 'المبلغ (ج.م)': -pnlData.sharpening },
      { 'البند المالي': 'مصاريف صيانة الآلات والمعدات', 'المبلغ (ج.م)': -pnlData.machineMaintenanceCost },
      { 'البند المالي': 'عمولات المبيعات للوسطاء وموظفي البيع', 'المبلغ (ج.م)': -pnlData.commissions },
      { 'البند المالي': 'تكاليف الخدمات اللوجستية والنقل', 'المبلغ (ج.م)': -pnlData.logistics },
      { 'البند المالي': 'مصاريف نثرية وإدارية عامة', 'المبلغ (ج.م)': -pnlData.administrative },
      { 'البند المالي': 'إجمالي المصاريف التشغيلية (OPEX)', 'المبلغ (ج.م)': -pnlData.totalOPEX },
      { 'البند المالي': 'صافي الأرباح التشغيلية (Net Income)', 'المبلغ (ج.م)': pnlData.netProfit }
    ];
    exportToExcel(list, 'قائمة_الدخل_المالية');
  };

  const exportBalanceSheetToExcel = () => {
    const list = [
      { 'التصنيف': 'الأصول المتداولة', 'البند': 'النقدية وما يعادلها (الخزائن والبنوك)', 'المبلغ (ج.م)': balanceSheetData.cashAndBanks },
      { 'التصنيف': 'الأصول المتداولة', 'البند': 'مخزون المواد الخام والسلع التقييمية', 'المبلغ (ج.م)': balanceSheetData.rawMaterialsInventory },
      { 'التصنيف': 'الأصول المتداولة', 'البند': 'ذمم وسلف العاملين النشطة', 'المبلغ (ج.م)': balanceSheetData.employeeLoans },
      { 'التصنيف': 'إجمالي الأصول', 'البند': 'إجمالي الأصول الحالية', 'المبلغ (ج.م)': balanceSheetData.totalAssets },
      { 'التصنيف': 'الالتزامات المتداولة', 'البند': 'أرصدة دائنة للموردين', 'المبلغ (ج.م)': balanceSheetData.supplierAccountsPayable },
      { 'التصنيف': 'إجمالي الالتزامات', 'البند': 'إجمالي الالتزامات المتداولة', 'المبلغ (ج.م)': balanceSheetData.totalLiabilities },
      { 'التصنيف': 'حقوق الملكية', 'البند': 'الأرباح المحتجزة / المبقاة', 'المبلغ (ج.م)': balanceSheetData.retainedEarnings },
      { 'التصنيف': 'حقوق الملكية', 'البند': 'رأس المال الموفر والاحتياطيات', 'المبلغ (ج.م)': balanceSheetData.capitalReserves },
      { 'التصنيف': 'إجمالي حقوق الملكية', 'البند': 'إجمالي حقوق الملكية المساهمة', 'المبلغ (ج.م)': balanceSheetData.totalEquity },
      { 'التصنيف': 'الموازنة العامة', 'البند': 'إجمالي الالتزامات وحقوق الملكية', 'المبلغ (ج.م)': balanceSheetData.totalLiabilities + balanceSheetData.totalEquity }
    ];
    exportToExcel(list, 'الميزانية_العمومية_المتكاملة');
  };

  return (
    <div className="space-y-12 pb-24 print:p-0 animate-in fade-in duration-1000" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 print:hidden">
        <div>
          <div className="flex items-center gap-3 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] px-4 py-1.5 bg-indigo-50 rounded-full w-fit mb-4">
            <Scale size={14} className="animate-spin-slow" />
            مركز التقارير المحاسبية والمخزنية
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">
            مركز التقارير المتقدم والشامل
          </h2>
          <p className="text-slate-500 mt-3 font-bold text-lg max-w-xl">
            إعداد الدفاتر اليومية، ميزان المراجعة، قائمة الدخل المهنية، والميزانية العمومية طبقاً للمعايير الدولية.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => window.print()} className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-2xl shadow-slate-900/20 transition-all hover:-translate-y-1">
            <Printer size={20} className="ml-2" />
            طباعة الكشف PDF
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100/80 backdrop-blur-sm rounded-[2rem] w-fit border border-slate-200/50 print:hidden shadow-xl shadow-slate-200/20">
        {[
          { id: 'dashboard', label: 'لوحة القيادة', icon: <Box size={18} /> },
          { id: 'ledger', label: 'دفتر الأستاذ', icon: <FileText size={18} /> },
          { id: 'income_statement', label: 'قائمة الدخل', icon: <TrendingUp size={18} /> },
          { id: 'balance_sheet', label: 'الميزانية العمومية', icon: <Scale size={18} /> },
          { id: 'warehouse', label: 'الجرد التفصيلي', icon: <Package size={18} /> },
          { id: 'purchases', label: 'تحليل المشتريات', icon: <ShoppingCart size={18} /> },
          { id: 'suppliers', label: 'أرصدة الموردين', icon: <Users size={18} /> }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-[1.5rem] font-black text-base transition-all duration-300 ${activeReportTab === tab.id ? 'bg-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] text-primary font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <span className={activeReportTab === tab.id ? 'text-primary' : 'text-slate-400'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents: P&L (قائمة الدخل) */}
      {activeReportTab === 'income_statement' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-3xl font-black text-slate-900">قائمة الدخل والأرباح والخسائر الشاملة</CardTitle>
                <p className="text-slate-400 font-bold text-base mt-2">تحليل تفصيلي للإيرادات، التكاليف المباشرة والغير مباشرة للنشاط.</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Period Filter */}
                <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button onClick={() => setStatementPeriod('all')} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${statementPeriod === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>الكل</button>
                  <button onClick={() => setStatementPeriod('year')} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${statementPeriod === 'year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>هذا العام</button>
                  <button onClick={() => setStatementPeriod('month')} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${statementPeriod === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>هذا الشهر</button>
                </div>
                <Button onClick={exportIncomeStatementToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-6 font-bold">
                  <Download size={16} className="ml-2" /> تصدير إكسيل
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <div className="max-w-4xl mx-auto space-y-8">
                
                {/* 1. Revenues */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-center py-4 bg-slate-50 px-6 rounded-2xl">
                    <span className="text-xl font-black text-slate-900">إجمالي الإيرادات والمبيعات</span>
                    <span className="text-2xl font-black text-emerald-600">{(pnlData.revenues).toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* 2. COGS */}
                <div className="space-y-3">
                  <h4 className="text-lg font-black text-slate-700 px-6">يخصم: تكلفة المبيعات المباشرة (COGS)</h4>
                  <div className="space-y-2 bg-slate-50/40 p-6 rounded-[2rem] border border-slate-100">
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>تكلفة الخامات والمواد المستهلكة (المنصرفة للإنتاج)</span>
                      <span>{(pnlData.materialsConsumed).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>تكلفة الأجور والعمالة المباشرة (أمر تشغيل)</span>
                      <span>{(pnlData.directLabor).toLocaleString()} ج.m</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>تكاليف إضافية مباشرة للمصنع</span>
                      <span>{(pnlData.directOther).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>خسائر وقيمة المواد الهالكة والفاقد</span>
                      <span className="text-rose-500">{(pnlData.wasteMaterialsValue).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 text-lg font-black text-slate-800">
                      <span>إجمالي تكلفة المبيعات</span>
                      <span>{(pnlData.totalCOGS).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* 3. Gross Profit */}
                <div className="border-b-2 border-double border-slate-200 pb-4">
                  <div className="flex justify-between items-center py-5 bg-indigo-50/50 px-8 rounded-2xl border border-indigo-100/50">
                    <span className="text-2xl font-black text-indigo-900">مجمل الربح تشغيلياً</span>
                    <span className="text-3xl font-black text-indigo-700">{(pnlData.grossProfit).toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* 4. OPEX */}
                <div className="space-y-3">
                  <h4 className="text-lg font-black text-slate-700 px-6">يخصم: المصاريف التشغيلية والإدارية (OPEX)</h4>
                  <div className="space-y-2 bg-slate-50/40 p-6 rounded-[2rem] border border-slate-100">
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>المرتبات والأجور العامة والمكافآت (غير المباشرة)</span>
                      <span>{(pnlData.generalPayroll).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>مصاريف سن أدوات المصنع (الأسلحة والصواني)</span>
                      <span>{(pnlData.sharpening).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>صيانة وإصلاح الماكينات والآلات</span>
                      <span>{(pnlData.machineMaintenanceCost).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>عمولات المبيعات اللوجستية والوسطاء</span>
                      <span>{(pnlData.commissions).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>مصاريف النقل، الخدمات، اللوجستيات والشحن</span>
                      <span>{(pnlData.logistics).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-base font-bold text-slate-600 border-b border-dashed border-slate-100">
                      <span>المصروفات النثرية والعمومية الأخرى</span>
                      <span>{(pnlData.administrative).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 text-lg font-black text-slate-800">
                      <span>إجمالي المصاريف الإدارية والتشغيلية</span>
                      <span>{(pnlData.totalOPEX).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* 5. Net Profit */}
                <div className="pt-4">
                  <div className={`flex justify-between items-center py-6 px-8 rounded-3xl border ${pnlData.netProfit >= 0 ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-2xl shadow-rose-500/20'}`}>
                    <span className="text-2xl font-black">صافي الأرباح المحققة (الربح / الخسارة)</span>
                    <span className="text-4xl font-black">{(pnlData.netProfit).toLocaleString()} ج.م</span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Contents: Balance Sheet (الميزانية العمومية) */}
      {activeReportTab === 'balance_sheet' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-3xl font-black text-slate-900">تقرير الميزانية العمومية والمركز المالي</CardTitle>
                <p className="text-slate-400 font-bold text-base mt-2">تقرير تراكمي يعكس أصول الشركة، الالتزامات المستحقة، ورأس المال الموظف.</p>
              </div>
              <Button onClick={exportBalanceSheetToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-6 font-bold">
                <Download size={16} className="ml-2" /> تصدير إكسيل الميزانية
              </Button>
            </CardHeader>
            <CardContent className="p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* Assets Column */}
                <div className="space-y-6">
                  <div className="p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-xl">
                    <span className="text-2xl font-black">الأصول (Assets)</span>
                    <span className="text-3xl font-black">{(balanceSheetData.totalAssets).toLocaleString()} ج.م</span>
                  </div>
                  
                  <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 space-y-4">
                    <h4 className="text-lg font-black text-slate-800 border-b border-dashed border-slate-200 pb-2">الأصول المتداولة</h4>
                    
                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-600">
                      <span>النقدية وما يعادلها (خزائن رئيسية وبنوك)</span>
                      <span className="font-mono text-slate-900">{(balanceSheetData.cashAndBanks).toLocaleString()} ج.م</span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-600">
                      <span>مخزون المواد الخام بأسعار التقييم الجاري</span>
                      <span className="font-mono text-slate-900">{(balanceSheetData.rawMaterialsInventory).toLocaleString()} ج.م</span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-600">
                      <span>سلف وذمم الموظفين المدينة (نشطة)</span>
                      <span className="font-mono text-slate-900">{(balanceSheetData.employeeLoans).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="space-y-6">
                  <div className="p-6 bg-slate-100 rounded-3xl text-slate-900 flex justify-between items-center border border-slate-200 shadow-sm">
                    <span className="text-2xl font-black">الالتزامات وحقوق الملكية</span>
                    <span className="text-3xl font-black">{(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity).toLocaleString()} ج.م</span>
                  </div>

                  {/* Liabilities Section */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 space-y-4">
                    <h4 className="text-lg font-black text-slate-800 border-b border-dashed border-slate-200 pb-2">الالتزامات المتداولة</h4>
                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-600">
                      <span>ذمم دائنة للموردين وأرصدة معلقة</span>
                      <span className="font-mono text-slate-900">{(balanceSheetData.supplierAccountsPayable).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 font-black text-slate-800 border-t border-slate-200">
                      <span>إجمالي الالتزامات</span>
                      <span>{(balanceSheetData.totalLiabilities).toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  {/* Owner's Equity Section */}
                  <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-8 space-y-4">
                    <h4 className="text-lg font-black text-slate-800 border-b border-dashed border-slate-200 pb-2">حقوق الملكية المساهمة</h4>
                    
                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-600">
                      <span>الأرباح المبقاة والمحقق تراكمياً</span>
                      <span className={`font-mono font-black ${balanceSheetData.retainedEarnings >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {(balanceSheetData.retainedEarnings).toLocaleString()} ج.م
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 font-bold text-slate-600">
                      <span>رأس المال المستثمر والاحتياطيات الموازنة</span>
                      <span className="font-mono text-slate-900">{(balanceSheetData.capitalReserves).toLocaleString()} ج.م</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 font-black text-slate-800 border-t border-slate-200">
                      <span>إجمالي حقوق الملكية</span>
                      <span>{(balanceSheetData.totalEquity).toLocaleString()} ج.م</span>
                    </div>
                  </div>

                </div>

              </div>
              
              {/* Perfect Balancing Note Indicator */}
              <div className="mt-12 bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4 text-emerald-800">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
                <div className="text-base font-bold">
                  الميزانية متزنة بالكامل مع الحساب التراكمي: <span className="underline">إجمالي الأصول</span> = <span className="underline">إجمالي الالتزامات وحقوق الملكية</span> ({balanceSheetData.totalAssets.toLocaleString()} ج.م). تم احتساب المركز المالي بنجاح تام.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Contents: General Ledger (دفتر الأستاذ) */}
      {activeReportTab === 'ledger' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-3xl font-black text-slate-900">دفتر الأستاذ المحاسبي المساعد</CardTitle>
                <p className="text-slate-400 font-bold text-base mt-2">دفاتر أستاذ حركية ومفصلة لكل نوع من الحسابات المالية.</p>
              </div>
              <Button onClick={exportLedgerToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-6 font-bold">
                <Download size={16} className="ml-2" /> تصدير الكشف الجاري
              </Button>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              
              {/* Ledger Query Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">اختر حساب الأستاذ الفرعي</label>
                  <select 
                    value={ledgerAccount}
                    onChange={(e) => setLedgerAccount(e.target.value as any)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 shadow-sm focus:outline-none"
                  >
                    <option value="safes">حساب الصندوق والبنوك والعهد</option>
                    <option value="sales">حساب المبيعات وإيرادات النشاط</option>
                    <option value="purchases">حساب المشتريات والخامات</option>
                    <option value="suppliers">حساب الموردين (الأرصدة المقابلة)</option>
                    <option value="expenses">حساب الأجور والمصروفات الإدارية والسن</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">تاريخ من</label>
                  <input 
                    type="date" 
                    value={ledgerDateFrom} 
                    onChange={(e) => setLedgerDateFrom(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 shadow-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">تاريخ إلى</label>
                  <input 
                    type="date" 
                    value={ledgerDateTo} 
                    onChange={(e) => setLedgerDateTo(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-800 shadow-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700">البحث بالبيان والوصف</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="ابحث عن حركة..." 
                      value={ledgerSearch} 
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white pr-10 pl-4 font-bold text-slate-800 shadow-sm focus:outline-none"
                    />
                    <Search className="absolute top-3.5 right-3 text-slate-400" size={16} />
                  </div>
                </div>
              </div>

              {/* Running Ledger Balance summary cards */}
              <div className="flex gap-4">
                <div className="p-6 bg-slate-900 text-white rounded-2xl flex-1">
                  <p className="text-xs text-slate-400 font-bold mb-2">نوع الرصيد الطبيعي للحساب</p>
                  <p className="text-lg font-black">
                    {ledgerAccount === 'sales' || ledgerAccount === 'suppliers' ? 'دائن (Credit Balance)' : 'مدين (Debit Balance)'}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex-1">
                  <p className="text-xs text-slate-400 font-bold mb-2">إجمالي الحركات المفعلة</p>
                  <p className="text-xl font-black text-slate-800">{ledgerRows.length} حركات مسجلة</p>
                </div>
                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex-1">
                  <p className="text-xs text-indigo-400 font-bold mb-2">الرصيد الختامي الجاري</p>
                  <p className="text-xl font-black text-indigo-700">
                    {runningLedgerBalances.length > 0 ? runningLedgerBalances[runningLedgerBalances.length - 1].toLocaleString() : 0} ج.م
                  </p>
                </div>
              </div>

              {/* Ledger Movements Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right py-4 font-black">التاريخ</TableHead>
                      <TableHead className="text-right font-black">البيان الوصفي للمحاسب</TableHead>
                      <TableHead className="text-right font-black">نوع الحركة</TableHead>
                      <TableHead className="text-right font-black">مدين (+ Debit)</TableHead>
                      <TableHead className="text-right font-black">دائن (- Credit)</TableHead>
                      <TableHead className="text-right font-black">الرصيد الجاري الكلي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                          لا توجد حركات مالية مطابقة للمعايير المحددة في هذا الدفتر الجاري.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerRows.map((row, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-4 font-mono font-bold text-slate-600">{row.date}</TableCell>
                          <TableCell className="font-black text-slate-900">{row.description}</TableCell>
                          <TableCell>
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500">{row.reference}</span>
                          </TableCell>
                          <TableCell className="font-bold text-emerald-600">
                            {row.debit > 0 ? `+${row.debit.toLocaleString()} ج.م` : '-'}
                          </TableCell>
                          <TableCell className="font-bold text-rose-500">
                            {row.credit > 0 ? `-${row.credit.toLocaleString()} ج.م` : '-'}
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

      {/* Existing Dashboard Tab contents */}
      {activeReportTab === 'dashboard' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:border-blue-500/30 transition-all cursor-default overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10">
                 <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-8 transform group-hover:rotate-12 transition-transform">
                   <Package size={28} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">القيمة الإجمالية للمخزون</p>
                 <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                    {totalInventoryValue.toLocaleString()}
                    <span className="text-sm text-slate-300 mr-2 font-bold uppercase tracking-widest">ج.م</span>
                 </h3>
               </div>
            </div>

            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:border-rose-500/30 transition-all cursor-default overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10">
                 <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-2xl shadow-rose-500/30 mb-8 transform group-hover:rotate-12 transition-transform">
                   <Users size={28} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">إجمالي مديونيات الموردين</p>
                 <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                    {totalSupplierDebt.toLocaleString()}
                    <span className="text-sm text-slate-300 mr-2 font-bold uppercase tracking-widest">ج.م</span>
                 </h3>
               </div>
            </div>

            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:border-emerald-500/30 transition-all cursor-default overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10">
                 <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 mb-8 transform group-hover:rotate-12 transition-transform">
                   <Activity size={28} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">تكلفة عمليات الإنتاج</p>
                 <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                    {totalProductionCost.toLocaleString()}
                    <span className="text-sm text-slate-300 mr-2 font-bold uppercase tracking-widest">ج.م</span>
                 </h3>
               </div>
            </div>

            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:border-amber-500/30 transition-all cursor-default overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10">
                 <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-2xl shadow-amber-500/30 mb-8 transform group-hover:rotate-12 transition-transform">
                   <Trash2 size={28} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">قيمة الهالك والـفـاقـد</p>
                 <h3 className="text-4xl font-black text-rose-600 tracking-tighter leading-none">
                    {totalWasteValue.toLocaleString()}
                    <span className="text-sm text-slate-300 mr-2 font-bold uppercase tracking-widest">ج.م</span>
                 </h3>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[3rem] bg-white overflow-hidden p-0">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">رصد المخازن</h3>
                  <p className="text-slate-400 font-bold text-sm italic">القيمة السوقية لكل مستودع مـنـفـصـلاً</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                   <Database size={24} />
                </div>
              </div>
              <div className="p-10 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={warehouseData}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e293b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.15)', padding: '20px', fontFamily: 'Inter, sans-serif' }}
                      formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'رصيد']}
                    />
                    <Bar dataKey="value" fill="url(#barGradient)" radius={[12, 12, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[3rem] bg-white overflow-hidden p-0">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">استهلاك القطاعات</h3>
                  <p className="text-slate-400 font-bold text-sm italic">نسب تـوزيـع المـواد الخـام حـسـب المـصـنـع</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                   <Target size={24} />
                </div>
              </div>
              <div className="p-10 h-[400px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costCenterData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={10}
                      dataKey="value"
                      stroke="none"
                    >
                      {costCenterData.map((_entry: any, index: number) => (
                        <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.15)', padding: '20px' }}
                      formatter={(value: number) => `${value.toLocaleString()} ج.م`} 
                    />
                    <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ paddingTop: '30px', fontWeight: 900, color: '#1e293b', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200/40 rounded-[3rem] bg-white overflow-hidden p-0">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">إحصائيات التدفق</h3>
                    <p className="text-slate-400 font-bold text-sm italic">مقارنة بـيـن إجمالي المشتريات والـمـنـصـرف شـهـريـاً</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div className="p-10 h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrends}>
                        <defs>
                          <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorIssuances" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.15)', padding: '20px' }} />
                        <Area type="monotone" dataKey="purchases" name="مشتريات" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPurchases)" />
                        <Area type="monotone" dataKey="issuances" name="منصرف" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIssuances)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </Card>

             <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[3rem] bg-white overflow-hidden p-0">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">الصيانة والسن</h3>
                    <p className="text-slate-400 font-bold text-sm italic">توزيـع تكـالـيـف الـصـورمـة والـسـن</p>
                  </div>
                </div>
                <div className="p-10 h-[400px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e293b' }} width={120} />
                        <Tooltip 
                           cursor={{ fill: '#f8fafc' }}
                           contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.1)', padding: '16px' }}
                           formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'التكلفة']}
                        />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 16, 16, 0]} barSize={40} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </Card>
          </div>

          {/* Quick Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[3rem] bg-white overflow-hidden p-0">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">رصد حركة المخزون</h3>
                  <p className="text-slate-400 font-bold text-sm italic">الأصناف الأعلى قيمة المتاحة في المستودعات</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                   <Layers size={24} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 h-16">
                    <TableRow className="hover:bg-transparent border-slate-100 uppercase tracking-widest text-[10px]">
                      <TableHead className="text-right font-black text-slate-900 px-10">الصنف</TableHead>
                      <TableHead className="text-center font-black text-slate-900">الرصيد</TableHead>
                      <TableHead className="text-center font-black text-slate-900">الوحدة</TableHead>
                      <TableHead className="text-right font-black text-slate-900 px-10">إجمالي القيمة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.sort((a, b) => (b.currentBalance * b.price) - (a.currentBalance * a.price)).slice(0, 8).map(item => (
                      <TableRow key={item.id} className="h-20 border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="px-10 font-black text-slate-900 text-lg">{item.name}</TableCell>
                        <TableCell className="text-center">
                           <div className={`font-black text-lg ${item.currentBalance <= item.safetyLimit ? 'text-rose-500' : 'text-slate-700'}`}>
                              {item.currentBalance.toLocaleString()}
                           </div>
                        </TableCell>
                        <TableCell className="text-center text-slate-400 font-bold text-xs uppercase">{item.unit}</TableCell>
                        <TableCell className="px-10 font-black text-emerald-600 text-xl tracking-tighter">
                          {(item.currentBalance * item.price).toLocaleString()} <span className="text-[10px] text-slate-300">ج.م</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-8 bg-slate-50 text-center border-t border-slate-100">
                 <Button variant="link" onClick={() => setActiveReportTab('warehouse')} className="text-primary font-black uppercase tracking-widest text-xs hover:no-underline">
                    عرض تقرير الجرد التفصيلي الكامل <ArrowLeft size={14} className="mr-2" />
                 </Button>
              </div>
            </Card>

            <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[3rem] bg-white overflow-hidden p-0">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">ديون الموردين الرئيسية</h3>
                  <p className="text-slate-400 font-bold text-sm italic">الأرصدة المستحقة للموردين ونسب السداد</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                   <Briefcase size={24} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 h-16">
                    <TableRow className="hover:bg-transparent border-slate-100 uppercase tracking-widest text-[10px]">
                      <TableHead className="text-right font-black text-slate-900 px-10">المورد</TableHead>
                      <TableHead className="text-right font-black text-slate-900">المبلغ المتبقي</TableHead>
                      <TableHead className="text-right font-black text-slate-900 px-10">التقدم المالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8).map(s => (
                      <TableRow key={s.id} className="h-20 border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="px-10 font-black text-slate-900 text-lg">{s.name}</TableCell>
                        <TableCell className="text-rose-600 font-black text-xl tracking-tighter">
                           {s.balance.toLocaleString()} <span className="text-[10px] text-slate-300">ج.م</span>
                        </TableCell>
                        <TableCell className="px-10">
                          <div className="flex items-center gap-4 min-w-[150px]">
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div 
                                style={{ width: `${(s.totalPayments / (s.totalPurchases || 1)) * 100}%` }}
                                className="h-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)] rounded-full" 
                              />
                            </div>
                            <span className="text-[11px] font-black text-slate-900 w-10 text-center font-mono">
                              {Math.round((s.totalPayments / (s.totalPurchases || 1)) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-8 bg-slate-50 text-center border-t border-slate-100">
                 <Button variant="link" onClick={() => setActiveReportTab('suppliers')} className="text-primary font-black uppercase tracking-widest text-xs hover:no-underline">
                    مراجعة أرصدة وكشوف حسابات الموردين <ArrowLeft size={14} className="mr-2" />
                 </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Warehouse Inventory Tab */}
      {activeReportTab === 'warehouse' && (
        <div className="animate-in fade-in duration-700">
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden p-0">
            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">تقرير جرد المخزن الشامل</h3>
                <p className="text-slate-400 font-bold text-lg italic mt-1">تفاصيل الأرصدة والقيمة لمجمل نشاط الشركة الحالي</p>
              </div>
              <Button onClick={() => exportToExcel(items.map(i => ({
                الصنف: i.name,
                المخزن: warehouses.find(w => w.id === i.warehouseId)?.name || 'غير محدد',
                الوحدة: i.unit,
                الرصيد: i.currentBalance,
                سعر_الوحدة: i.price,
                إجمالي_القيمة: i.currentBalance * i.price
              })), 'تقرير_الجرد_التفصيلي')} className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-2xl shadow-emerald-600/20 transition-all">
                <Download size={20} className="ml-2" />
                تصدير إكسيل الجرد
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white h-20">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-right font-black text-slate-900 px-10 text-[11px] uppercase tracking-[0.2em] w-[300px]">الصنف والوصف</TableHead>
                    <TableHead className="text-right font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">موقع التخزين</TableHead>
                    <TableHead className="text-center font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">الرصيد الحالي</TableHead>
                    <TableHead className="text-right font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">سعر الوحدة</TableHead>
                    <TableHead className="text-right font-black text-slate-900 px-10 text-[11px] uppercase tracking-[0.2em]">إجمالي القيمة التقديرية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                    <TableRow key={item.id} className="h-24 border-slate-50 hover:bg-slate-50/30 transition-all">
                      <TableCell className="px-10">
                         <p className="font-black text-slate-900 text-xl tracking-tight">{item.name}</p>
                         <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{item.category}</p>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 font-bold text-slate-600 bg-slate-100 w-fit px-4 py-2 rounded-xl border border-slate-200/50">
                            <Home size={14} className="text-slate-400" />
                            {warehouses.find(w => w.id === item.warehouseId)?.name || 'غير محدد'}
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex flex-col items-center gap-1 font-black text-2xl tracking-tighter ${item.currentBalance <= item.safetyLimit ? 'text-rose-600' : 'text-slate-900'}`}>
                           {item.currentBalance.toLocaleString()}
                           <span className="text-[10px] text-slate-300 uppercase tracking-[0.2em]">{item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-500 font-mono text-lg">
                        {item.price.toLocaleString()} <span className="text-[10px]">ج.م</span>
                      </TableCell>
                      <TableCell className="px-10">
                         <div className="font-black text-emerald-600 text-2xl tracking-tighter shadow-sm w-fit border-b-4 border-emerald-100">
                            {(item.currentBalance * item.price).toLocaleString()}
                            <span className="text-xs text-slate-300 mr-2">ج.م</span>
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

      {/* Purchases Tab */}
      {activeReportTab === 'purchases' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden relative">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">إنفاق الـ 6 أشهر الأخيرة</p>
               <div className="flex items-end gap-3 mb-2">
                 <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                   {purchaseTrends.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} 
                 </h3>
                 <span className="text-lg font-black text-slate-300 mb-2">ج.م</span>
               </div>
            </div>

            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden relative">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">متوسط قيمة الفاتورة</p>
               <div className="flex items-end gap-3 mb-2">
                 <h3 className="text-5xl font-black text-slate-900 tracking-tighter">
                   {(purchases.length > 0 ? (purchases.reduce((acc, p) => acc + p.total, 0) / purchases.length) : 0).toLocaleString()} 
                 </h3>
                 <span className="text-lg font-black text-slate-300 mb-2">ج.م</span>
               </div>
            </div>

            <div className="p-10 bg-slate-900 rounded-[2.5rem] shadow-2xl text-white overflow-hidden relative">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">كثافة حركات الشراء</p>
               <div className="flex items-end gap-3 mb-2">
                 <h3 className="text-7xl font-black tracking-tighter text-indigo-400">
                   {purchases.length}
                 </h3>
                 <span className="text-2xl font-black text-white/20 mb-3 tracking-tighter">عملية ناجحة</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden p-0">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">منحنى الشراء الزمني</h3>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                   <Activity size={20} />
                </div>
              </div>
              <div className="p-10 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={purchaseTrends}>
                    <defs>
                      <linearGradient id="colorPurchasesDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 900, fill: '#1e293b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.15)', padding: '20px' }}
                      formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'المشتريات']}
                    />
                    <Area type="stepAfter" dataKey="amount" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorPurchasesDetail)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden p-0">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">أكبر 7 بنود مشتريات قيمة</h3>
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                   <Target size={20} />
                </div>
              </div>
              <div className="p-10 h-[400px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={itemsByPurchaseValue}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {itemsByPurchaseValue.map((_entry: any, index: number) => (
                        <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.15)', padding: '20px' }}
                      formatter={(value: number) => `${value.toLocaleString()} ج.م`} 
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '30px', fontWeight: 900, color: '#1e293b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Suppliers tab */}
      {activeReportTab === 'suppliers' && (
        <div className="space-y-12 animate-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-10 bg-slate-900 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">إجمالي مديونيات السوق</p>
               <h3 className="text-4xl font-black tracking-tighter">{totalDebtAcrossSuppliers.toLocaleString()} <span className="text-lg text-slate-500">ج.م</span></h3>
            </div>
            
            <div className="p-10 bg-indigo-600 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
               <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">إجمالي المبالغ المسددة</p>
               <h3 className="text-4xl font-black tracking-tighter">{totalPaymentsAcrossSuppliers.toLocaleString()} <span className="text-lg text-indigo-300">ج.م</span></h3>
            </div>

            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">معدل السداد العام</p>
               <div className="flex items-center gap-6">
                 <h3 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
                    {totalPaymentsAcrossSuppliers + totalDebtAcrossSuppliers > 0 
                      ? Math.round((totalPaymentsAcrossSuppliers / (totalPaymentsAcrossSuppliers + totalDebtAcrossSuppliers)) * 100) 
                      : 0}%
                 </h3>
                 <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                       className="h-full bg-emerald-500" 
                       style={{ width: `${totalPaymentsAcrossSuppliers + totalDebtAcrossSuppliers > 0 ? (totalPaymentsAcrossSuppliers / (totalPaymentsAcrossSuppliers + totalDebtAcrossSuppliers)) * 100 : 0}%` }}
                    />
                 </div>
               </div>
            </div>

            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">عدد الموردين المسجلين</p>
               <h3 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{suppliers.length}</h3>
            </div>
          </div>

          <Card className="border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xl font-black">كشف الأرصدة والديون التفصيلي للموردين</CardTitle>
            </CardHeader>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-right font-black py-4">اسم المورد</TableHead>
                    <TableHead className="text-right font-black">إجمالي المسحوبات</TableHead>
                    <TableHead className="text-right font-black">إجمالي المدفوعات</TableHead>
                    <TableHead className="text-right font-black">الرصيد الحالي</TableHead>
                    <TableHead className="text-right font-black">نسبة التغطية والسداد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.sort((a, b) => b.totalPurchases - a.totalPurchases).map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-black text-slate-900 py-4">{s.name}</TableCell>
                      <TableCell className="font-bold text-slate-600">{s.totalPurchases.toLocaleString()} ج.م</TableCell>
                      <TableCell className="font-bold text-emerald-600">{s.totalPayments.toLocaleString()} ج.م</TableCell>
                      <TableCell className={`font-black ${s.balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {s.balance.toLocaleString()} ج.م
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-emerald-500 h-full" 
                                style={{ width: `${s.totalPurchases > 0 ? (s.totalPayments / s.totalPurchases) * 100 : 0}%` }}
                            />
                            </div>
                            <span className="text-xs font-bold text-slate-500">
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
