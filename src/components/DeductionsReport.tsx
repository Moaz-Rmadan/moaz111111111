import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Printer, Download, Clock, AlertTriangle, 
  Calendar, ChevronDown, ChevronRight, Eye, RefreshCw, 
  Wallet, FileText, CheckCircle2, ArrowDownLeft, ShieldAlert, 
  Sparkles, User, MessageSquare, DollarSign, X, Layers, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, Attendance, FinancialTransaction, Loan, CompanySettings } from '../types';
import { PrintHeader, PrintSignatures } from './PrintHeader';
import { SearchableSelect } from './SearchableSelect';
import { tafqeetArabic } from '../lib/tafqeet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

export interface DeductionsReportProps {
  attendance: Attendance[];
  transactions: FinancialTransaction[];
  loans: Loan[];
  companyInfo?: CompanySettings;
  companySettings?: CompanySettings;
  employees: Employee[];
}

export interface DayDelayRecord {
  id: string;
  date: string;
  dayName: string;
  checkIn: string;
  checkOut: string;
  shiftStart: string;
  shiftEnd: string;
  lateMinutes: number;
  earlyMinutes: number;
  totalLostMinutes: number;
  deductionAmount: number;
  isExcused: boolean;
  status: string;
}

export interface EmployeeDeductionsSummary {
  employee: Employee;
  // Minutes deductions
  totalLateMinutes: number;
  totalEarlyMinutes: number;
  totalLostMinutes: number;
  minuteDeductionsAmount: number;
  delayDaysCount: number;
  dayDelayRecords: DayDelayRecord[];
  
  // Administrative Penalties
  penaltiesCount: number;
  penaltiesAmount: number;
  penaltyTransactions: FinancialTransaction[];

  // Expenses & Petty Cash
  expensesCount: number;
  expensesAmount: number;
  expenseTransactions: FinancialTransaction[];

  // Loans & Advances
  activeLoansCount: number;
  totalLoansGranted: number;
  loansRepaidAmount: number;
  loansRemainingAmount: number;
  loanInstallmentDeduction: number;
  loanRecords: Loan[];

  // Fixed Deductions (Insurance & Tax)
  socialInsurance: number;
  incomeTax: number;
  fixedDeductionsAmount: number;

  // Grand Total
  grandTotalDeductions: number;
}

export const DeductionsReport: React.FC<DeductionsReportProps> = ({
  attendance = [],
  transactions = [],
  loans = [],
  companyInfo,
  companySettings,
  employees = []
}) => {
  const currentSettings = companySettings || companyInfo;

  // Date Presets State
  const [datePreset, setDatePreset] = useState<'this_month' | 'this_week' | 'last_month' | 'all' | 'custom'>('this_month');
  
  // Helper to format ISO date YYYY-MM-DD
  const formatISO = (d: Date) => d.toISOString().split('T')[0];

  // Initialize dates
  const defaultDates = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: formatISO(startOfMonth),
      end: formatISO(endOfMonth)
    };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);

  // Handle Preset changes
  const handlePresetChange = (preset: 'this_month' | 'this_week' | 'last_month' | 'all' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'this_month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatISO(s));
      setEndDate(formatISO(e));
    } else if (preset === 'this_week') {
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      const diff = now.getDate() - (day === 6 ? 0 : day + 1); // Start on Saturday
      const s = new Date(now);
      s.setDate(diff);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      setStartDate(formatISO(s));
      setEndDate(formatISO(e));
    } else if (preset === 'last_month') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatISO(s));
      setEndDate(formatISO(e));
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('الكل');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('الكل');
  const [deductionCategory, setDeductionCategory] = useState<'all' | 'minutes' | 'penalties' | 'loans' | 'expenses' | 'fixed'>('all');
  const [sortBy, setSortBy] = useState<'totalDesc' | 'totalAsc' | 'minutesDesc' | 'penaltiesDesc' | 'loansDesc' | 'nameAsc'>('totalDesc');
  const [minAmount, setMinAmount] = useState<number | ''>('');

  // Modal State for individual employee inspection
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<EmployeeDeductionsSummary | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'minutes' | 'penalties' | 'loans' | 'expenses' | 'summary'>('minutes');

  // List of departments for dropdown
  const departments = useMemo(() => {
    return ['الكل', ...new Set(employees.map(e => e.department).filter(Boolean) as string[])];
  }, [employees]);

  // Options for SearchableSelect
  const deptOptions = useMemo(() => {
    return departments.map(d => ({
      id: d,
      name: d === 'الكل' ? 'جميع الأقسام' : d,
      subtext: d === 'الكل' ? `${employees.length} موظف` : `${employees.filter(e => e.department === d).length} موظف`
    }));
  }, [departments, employees]);

  const employeeOptions = useMemo(() => {
    return [
      { id: 'الكل', name: 'جميع الموظفين (الكل)', subtext: 'كشف شامل' },
      ...employees.map(e => ({
        id: e.id,
        name: e.name,
        subtext: `${e.department || 'عام'} • ${e.position || 'موظف'}`
      }))
    ];
  }, [employees]);

  // Arabic day names
  const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Calculate detailed deductions summary for all employees
  const employeeSummaries: EmployeeDeductionsSummary[] = useMemo(() => {
    return employees.map(emp => {
      // 1. Filter attendance for this employee in date range
      const empAttendance = attendance.filter(a => {
        if (!a || a.employeeId !== emp.id) return false;
        if (!a.date) return false;
        if (datePreset === 'all') return true;
        return a.date >= startDate && a.date <= endDate;
      });

      // Shift parameters
      const shiftStartStr = emp.shiftStart || '08:00';
      const shiftEndStr = emp.shiftEnd || '18:00';
      const [sH, sM] = shiftStartStr.split(':').map(Number);
      const [eH, eM] = shiftEndStr.split(':').map(Number);
      const officialStart = (isNaN(sH) ? 8 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const officialEnd = (isNaN(eH) ? 18 : eH) * 60 + (isNaN(eM) ? 0 : eM);
      const shiftDurationMins = Math.max(120, officialEnd - officialStart);
      const gracePeriod = 15; // 15 mins grace period
      const minuteRate = emp.dailyRate > 0 ? (emp.dailyRate / shiftDurationMins) : 0;

      let totalLateMinutes = 0;
      let totalEarlyMinutes = 0;
      let totalLostMinutes = 0;
      let minuteDeductionsAmount = 0;
      let delayDaysCount = 0;
      const dayDelayRecords: DayDelayRecord[] = [];

      empAttendance.forEach(att => {
        if (!att.checkIn) return;
        const [inH, inM] = att.checkIn.split(':').map(Number);
        const checkInMins = inH * 60 + inM;
        let lateMins = 0;
        let earlyMins = 0;

        const deductLate = currentSettings?.deductLateArrival !== false && !att.isExcused;
        if (deductLate && checkInMins > officialStart + gracePeriod) {
          lateMins = checkInMins - officialStart;
        }

        if (att.checkOut) {
          const [outH, outM] = att.checkOut.split(':').map(Number);
          const checkOutMins = outH * 60 + outM;
          const deductEarly = currentSettings?.deductEarlyDeparture !== false && !att.isExcused;
          if (deductEarly && checkOutMins < officialEnd) {
            earlyMins = Math.max(0, officialEnd - checkOutMins);
          }
        }

        const lostMins = lateMins + earlyMins;
        if (lostMins > 0 || att.status === 'تأخير') {
          delayDaysCount += 1;
          const dayDeduction = Math.min(emp.dailyRate, lostMins * minuteRate);
          minuteDeductionsAmount += dayDeduction;
          totalLateMinutes += lateMins;
          totalEarlyMinutes += earlyMins;
          totalLostMinutes += lostMins;

          const dateObj = new Date(att.date);
          const dayName = !isNaN(dateObj.getTime()) ? arabicDayNames[dateObj.getDay()] : 'يوم';

          dayDelayRecords.push({
            id: att.id || `${att.employeeId}-${att.date}`,
            date: att.date,
            dayName,
            checkIn: att.checkIn,
            checkOut: att.checkOut || '--',
            shiftStart: shiftStartStr,
            shiftEnd: shiftEndStr,
            lateMinutes: lateMins,
            earlyMinutes: earlyMins,
            totalLostMinutes: lostMins,
            deductionAmount: Math.round(dayDeduction * 100) / 100,
            isExcused: !!att.isExcused,
            status: att.status || 'حضور'
          });
        }
      });

      minuteDeductionsAmount = Math.round(minuteDeductionsAmount * 100) / 100;

      // 2. Financial Transactions in date range
      const empTransactions = transactions.filter(t => {
        if (!t || t.employeeId !== emp.id) return false;
        if (datePreset === 'all') return true;
        return t.date >= startDate && t.date <= endDate;
      });

      // Administrative Penalties
      const penaltyTransactions = empTransactions.filter(t => 
        (t.type as string) === 'خصم' || 
        (t.type as string) === 'جزاء' || 
        (t.type as string) === 'خصومات' || 
        (t.type as string) === 'تأخير'
      );
      const penaltiesAmount = penaltyTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Expenses & Petty Cash Deductions
      const expenseTransactions = empTransactions.filter(t => 
        (t.type as string) === 'مصروف' || 
        (t.type as string) === 'سلفة' || 
        (t.type as string) === 'عهدة'
      );
      const expensesAmount = expenseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Loan Repayments & Outstanding Balances
      const empLoans = loans.filter(l => l && l.employeeId === emp.id);
      const activeLoans = empLoans.filter(l => l.status === 'نشط');
      const totalLoansGranted = empLoans.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
      const loansRemainingAmount = activeLoans.reduce((sum, l) => sum + (Number(l.remainingAmount) || 0), 0);
      const loansRepaidAmount = Math.max(0, totalLoansGranted - loansRemainingAmount);

      // Current Period Loan Installments
      const manualLoanDeductions = empTransactions.filter(t => 
        (t.type as string) === 'خصم سلف' || 
        (t.type as string) === 'سلفة مستردة'
      ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const autoInstallments = activeLoans.reduce((sum, l) => {
        if (l.deductionMode === 'auto_installment' && l.installments && l.installments > 0) {
          return sum + (l.amount / l.installments);
        }
        if (l.deductionMode === 'auto_percentage') {
          return sum + (emp.dailyRate * 6 * 0.1);
        }
        return sum;
      }, 0);

      const loanInstallmentDeduction = manualLoanDeductions > 0 ? manualLoanDeductions : Math.round(autoInstallments * 100) / 100;

      // Fixed Deductions (Insurance & Tax)
      const socialInsurance = emp.socialInsuranceDeduction || 0;
      const incomeTax = emp.incomeTaxDeduction || 0;
      const fixedDeductionsAmount = socialInsurance + incomeTax;

      // Grand Total Deductions
      const grandTotalDeductions = minuteDeductionsAmount + penaltiesAmount + expensesAmount + loanInstallmentDeduction + fixedDeductionsAmount;

      return {
        employee: emp,
        totalLateMinutes,
        totalEarlyMinutes,
        totalLostMinutes,
        minuteDeductionsAmount,
        delayDaysCount,
        dayDelayRecords,
        penaltiesCount: penaltyTransactions.length,
        penaltiesAmount,
        penaltyTransactions,
        expensesCount: expenseTransactions.length,
        expensesAmount,
        expenseTransactions,
        activeLoansCount: activeLoans.length,
        totalLoansGranted,
        loansRepaidAmount,
        loansRemainingAmount,
        loanInstallmentDeduction,
        loanRecords: empLoans,
        socialInsurance,
        incomeTax,
        fixedDeductionsAmount,
        grandTotalDeductions: Math.round(grandTotalDeductions * 100) / 100
      };
    });
  }, [employees, attendance, transactions, loans, startDate, endDate, datePreset, currentSettings]);

  // Filtered and Sorted summaries
  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter(summary => {
      const emp = summary.employee;
      // Search matching name, department, position, phone, national ID
      const matchesSearch = !searchTerm.trim() || 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.phone && emp.phone.includes(searchTerm)) ||
        (emp.nationalId && emp.nationalId.includes(searchTerm));

      const matchesDept = selectedDept === 'الكل' || emp.department === selectedDept;
      const matchesEmp = selectedEmployeeId === 'الكل' || emp.id === selectedEmployeeId;

      // Category filter
      let matchesCategory = true;
      if (deductionCategory === 'minutes') matchesCategory = summary.minuteDeductionsAmount > 0;
      else if (deductionCategory === 'penalties') matchesCategory = summary.penaltiesAmount > 0;
      else if (deductionCategory === 'loans') matchesCategory = (summary.loansRemainingAmount > 0 || summary.loanInstallmentDeduction > 0);
      else if (deductionCategory === 'expenses') matchesCategory = summary.expensesAmount > 0;
      else if (deductionCategory === 'fixed') matchesCategory = summary.fixedDeductionsAmount > 0;

      // Min amount filter
      const matchesMin = minAmount === '' || summary.grandTotalDeductions >= Number(minAmount);

      return matchesSearch && matchesDept && matchesEmp && matchesCategory && matchesMin;
    }).sort((a, b) => {
      if (sortBy === 'totalDesc') return b.grandTotalDeductions - a.grandTotalDeductions;
      if (sortBy === 'totalAsc') return a.grandTotalDeductions - b.grandTotalDeductions;
      if (sortBy === 'minutesDesc') return b.minuteDeductionsAmount - a.minuteDeductionsAmount;
      if (sortBy === 'penaltiesDesc') return b.penaltiesAmount - a.penaltiesAmount;
      if (sortBy === 'loansDesc') return b.loansRemainingAmount - a.loansRemainingAmount;
      if (sortBy === 'nameAsc') return a.employee.name.localeCompare(b.employee.name, 'ar');
      return 0;
    });
  }, [employeeSummaries, searchTerm, selectedDept, selectedEmployeeId, deductionCategory, minAmount, sortBy]);

  // Total KPIs
  const totalKPIs = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => {
      acc.totalMinutesAmount += s.minuteDeductionsAmount;
      acc.totalLostMinutes += s.totalLostMinutes;
      acc.totalPenaltiesAmount += s.penaltiesAmount;
      acc.totalPenaltiesCount += s.penaltiesCount;
      acc.totalExpensesAmount += s.expensesAmount;
      acc.totalLoanDeductions += s.loanInstallmentDeduction;
      acc.totalOutstandingLoans += s.loansRemainingAmount;
      acc.totalFixedDeductions += s.fixedDeductionsAmount;
      acc.grandTotal += s.grandTotalDeductions;
      acc.employeesWithDeductions += s.grandTotalDeductions > 0 ? 1 : 0;
      return acc;
    }, {
      totalMinutesAmount: 0,
      totalLostMinutes: 0,
      totalPenaltiesAmount: 0,
      totalPenaltiesCount: 0,
      totalExpensesAmount: 0,
      totalLoanDeductions: 0,
      totalOutstandingLoans: 0,
      totalFixedDeductions: 0,
      grandTotal: 0,
      employeesWithDeductions: 0
    });
  }, [filteredSummaries]);

  // Export to Excel
  const handleExportXLSX = () => {
    const data = filteredSummaries.map((s, idx) => ({
      'م': idx + 1,
      'كود الموظف': s.employee.id.substring(0, 6),
      'اسم الموظف': s.employee.name,
      'القسم': s.employee.department || 'عام',
      'الوظيفة': s.employee.position || 'موظف',
      'سعر اليومية (ج.م)': s.employee.dailyRate || 0,
      'دقائق التأخير': s.totalLateMinutes,
      'دقائق الخروج المبكر': s.totalEarlyMinutes,
      'إجمالي الدقائق المستقطعة': s.totalLostMinutes,
      'خصومات الدقائق والتأخير (ج.م)': s.minuteDeductionsAmount,
      'عدد أيام التأخير': s.delayDaysCount,
      'الجزاءات الإدارية (ج.م)': s.penaltiesAmount,
      'عدد الجزاءات': s.penaltiesCount,
      'المصروفات والعهد (ج.م)': s.expensesAmount,
      'سداد أقساط السلف (ج.م)': s.loanInstallmentDeduction,
      'رصيد السلف القائم (ج.م)': s.loansRemainingAmount,
      'استقطاع التأمينات والضرائب (ج.م)': s.fixedDeductionsAmount,
      'إجمالي الاستقطاعات الشاملة (ج.م)': s.grandTotalDeductions
    }));

    // Add totals row
    data.push({
      'م': '' as any,
      'كود الموظف': 'الإجمالي العام',
      'اسم الموظف': `${filteredSummaries.length} موظف`,
      'القسم': '',
      'الوظيفة': '',
      'سعر اليومية (ج.م)': 0,
      'دقائق التأخير': filteredSummaries.reduce((sum, s) => sum + s.totalLateMinutes, 0),
      'دقائق الخروج المبكر': filteredSummaries.reduce((sum, s) => sum + s.totalEarlyMinutes, 0),
      'إجمالي الدقائق المستقطعة': totalKPIs.totalLostMinutes,
      'خصومات الدقائق والتأخير (ج.م)': totalKPIs.totalMinutesAmount,
      'عدد أيام التأخير': filteredSummaries.reduce((sum, s) => sum + s.delayDaysCount, 0),
      'الجزاءات الإدارية (ج.م)': totalKPIs.totalPenaltiesAmount,
      'عدد الجزاءات': totalKPIs.totalPenaltiesCount,
      'المصروفات والعهد (ج.م)': totalKPIs.totalExpensesAmount,
      'سداد أقساط السلف (ج.م)': totalKPIs.totalLoanDeductions,
      'رصيد السلف القائم (ج.م)': totalKPIs.totalOutstandingLoans,
      'استقطاع التأمينات والضرائب (ج.م)': totalKPIs.totalFixedDeductions,
      'إجمالي الاستقطاعات الشاملة (ج.م)': totalKPIs.grandTotal
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
      { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 22 }, { wch: 24 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الاستقطاعات والجزاءات");
    XLSX.writeFile(workbook, `كشف_الاستقطاعات_والجزاءات_${startDate}_إلى_${endDate}.xlsx`);
  };

  // Safe print execution
  const handlePrint = () => {
    window.print();
  };

  // Send WhatsApp Statement
  const handleWhatsApp = (summary: EmployeeDeductionsSummary) => {
    const emp = summary.employee;
    const phone = emp.phone ? emp.phone.replace(/[^0-9]/g, '') : '';
    const msg = `*بيان استقطاعات وجزاءات الموظف:* ${emp.name}
*القسم:* ${emp.department || 'عام'} | *الوظيفة:* ${emp.position || 'موظف'}
*الفترة:* من ${startDate} إلى ${endDate}

⏱️ *خصومات التأخير والانصراف بالدقيقة:*
• إجمالي الدقائق المستقطعة: ${summary.totalLostMinutes} دقيقة (${summary.delayDaysCount} أيام)
• القيمة المستقطعة للتأخير: -${summary.minuteDeductionsAmount.toLocaleString()} ج.م

⚖️ *الجزاءات والخصومات الإدارية:*
• عدد الجزاءات: ${summary.penaltiesCount}
• إجمالي الجزاءات: -${summary.penaltiesAmount.toLocaleString()} ج.م

💵 *المصروفات والعهد المسحوبة:* -${summary.expensesAmount.toLocaleString()} ج.م
💳 *أقساط السلف والذمم:* -${summary.loanInstallmentDeduction.toLocaleString()} ج.م (الرصيد المتبقي: ${summary.loansRemainingAmount.toLocaleString()} ج.م)
🏛️ *استقطاعات ثابتة (تأمينات/ضرائب):* -${summary.fixedDeductionsAmount.toLocaleString()} ج.م

🔴 *إجمالي كافة الاستقطاعات:* -${summary.grandTotalDeductions.toLocaleString()} ج.م
_${companyInfo?.name || 'إدارة الشؤون المالية والموارد البشرية'}_`;

    const encoded = encodeURIComponent(msg);
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('2') ? phone : '2' + phone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Toolbar & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[20px] border border-slate-200/80 shadow-sm print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black shadow-inner">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 className="font-black text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                كشف الاستقطاعات والجزاءات والتأخيرات التفصيلي
                <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 font-bold text-xs px-2.5 py-0.5">
                  بالدقيقة والأقساط والعهد
                </Badge>
              </h2>
              <p className="text-slate-500 font-bold text-xs mt-0.5">
                متابعة دقيقة وشاملة لخصومات التأخير بالدقيقة، الجزاءات الإدارية، المصروفات، وأقساط السلف
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={handleExportXLSX}
            className="h-11 px-5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all"
          >
            <Download size={16} />
            <span>تصدير إكسيل (XLSX)</span>
          </Button>

          <Button 
            onClick={handlePrint}
            variant="outline"
            className="h-11 px-5 rounded-xl font-black text-xs border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer size={16} className="text-slate-500" />
            <span>طباعة الكشف المعتمد</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm('');
              setSelectedDept('الكل');
              setSelectedEmployeeId('الكل');
              setDeductionCategory('all');
              setMinAmount('');
              handlePresetChange('this_month');
            }}
            className="h-11 px-3 rounded-xl font-bold text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="إعادة ضبط الفلاتر"
          >
            <RefreshCw size={15} className="ml-1" />
            تفريغ
          </Button>
        </div>
      </div>

      {/* 2. Advanced Multi-Criteria Filter Controls Panel */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl sm:rounded-[20px] p-3.5 sm:p-5 space-y-4 print:hidden">
        {/* Date Preset Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar size={16} className="text-primary font-bold ml-1" />
              <span className="text-xs font-black text-slate-700">الفترة الزمنية:</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-inner overflow-x-auto max-w-full">
              <button
                onClick={() => handlePresetChange('this_week')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${datePreset === 'this_week' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                هذا الأسبوع
              </button>
              <button
                onClick={() => handlePresetChange('this_month')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${datePreset === 'this_month' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                هذا الشهر
              </button>
              <button
                onClick={() => handlePresetChange('last_month')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${datePreset === 'last_month' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                الشهر السابق
              </button>
              <button
                onClick={() => handlePresetChange('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${datePreset === 'all' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                كل الفترات
              </button>
            </div>
          </div>

          {/* Custom Date Range pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-xs font-black font-mono border-none outline-none text-slate-700 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-xs font-black font-mono border-none outline-none text-slate-700 bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Dropdowns & Search row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Universal Instant Search */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، الوظيفة، الهاتف..."
              className="h-11 rounded-xl border-slate-200 pr-10 font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Department Searchable Select */}
          <div>
            <SearchableSelect
              options={deptOptions}
              selectedValue={selectedDept}
              onChange={val => setSelectedDept(val || 'الكل')}
              placeholder="اختر القسم..."
              searchPlaceholder="ابحث في الأقسام..."
            />
          </div>

          {/* Employee Searchable Select */}
          <div>
            <SearchableSelect
              options={employeeOptions}
              selectedValue={selectedEmployeeId}
              onChange={val => setSelectedEmployeeId(val || 'الكل')}
              placeholder="اختر الموظف..."
              searchPlaceholder="ابحث باسم الموظف أو وظيفته..."
            />
          </div>

          {/* Sort By selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white font-black text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
            >
              <option value="totalDesc">ترتيب: الأعلى استقطاعاً</option>
              <option value="totalAsc">ترتيب: الأقل استقطاعاً</option>
              <option value="minutesDesc">ترتيب: الأكثر تأخيراً بالدقائق</option>
              <option value="penaltiesDesc">ترتيب: الأكثر جزاءات</option>
              <option value="loansDesc">ترتيب: الأكثر رصيد سلف</option>
              <option value="nameAsc">ترتيب: أبجدياً بالاسم</option>
            </select>
          </div>
        </div>

        {/* Deduction Category Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-400 ml-1">تصفية النوع:</span>
            {[
              { id: 'all', label: 'كافة الاستقطاعات' },
              { id: 'minutes', label: '⏱️ خصومات بالدقيقة فقط' },
              { id: 'penalties', label: '⚖️ جزاءات إدارية فقط' },
              { id: 'loans', label: '💳 سلف وذمم فقط' },
              { id: 'expenses', label: '💵 مصروفات وعهد فقط' },
              { id: 'fixed', label: '🏛️ استقطاعات ثابتة' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setDeductionCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  deductionCategory === cat.id
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-bold text-slate-400">
            مطابق للفلترة: <span className="font-black text-slate-800">{filteredSummaries.length}</span> من {employees.length} موظف
          </div>
        </div>
      </div>

      {/* 3. Official Print Header */}
      <PrintHeader
        title="كشف الاستقطاعات والجزاءات والتأخيرات المعتمد"
        subtitle="كشف تحليلي شامل لخصومات الدقائق، الجزاءات الإدارية، المصروفات، وأرصدة وأقساط السلف"
        periodText={`الفترة: من ${startDate} إلى ${endDate} | القسم: ${selectedDept === 'الكل' ? 'جميع الأقسام' : selectedDept}`}
        companyInfo={companyInfo}
        kpis={[
          { label: 'إجمالي الاستقطاعات الشاملة', value: `-${totalKPIs.grandTotal.toLocaleString()} ج.م`, highlight: true },
          { label: 'خصومات التأخير بالدقيقة', value: `-${totalKPIs.totalMinutesAmount.toLocaleString()} ج.م (${totalKPIs.totalLostMinutes} دقيقة)` },
          { label: 'إجمالي الجزاءات الإدارية', value: `-${totalKPIs.totalPenaltiesAmount.toLocaleString()} ج.م (${totalKPIs.totalPenaltiesCount} جزاء)` },
          { label: 'إجمالي السلف القائمة', value: `${totalKPIs.totalOutstandingLoans.toLocaleString()} ج.م` },
        ]}
      />

      {/* 4. Rich KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
        {/* Minute Deductions KPI */}
        <Card className="border-none bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white shadow-sm border border-amber-100 rounded-2xl">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-amber-800 font-bold text-xs">خصومات التأخير بالدقيقة</p>
              <h4 className="text-2xl font-black font-mono text-amber-900">
                -{totalKPIs.totalMinutesAmount.toLocaleString('en-US')} <span className="text-xs font-bold text-amber-700">ج.م</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                <Clock size={13} />
                <span>{totalKPIs.totalLostMinutes.toLocaleString()} دقيقة تأخير</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Penalties KPI */}
        <Card className="border-none bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white shadow-sm border border-rose-100 rounded-2xl">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-rose-800 font-bold text-xs">الجزاءات الإدارية المباشرة</p>
              <h4 className="text-2xl font-black font-mono text-rose-900">
                -{totalKPIs.totalPenaltiesAmount.toLocaleString('en-US')} <span className="text-xs font-bold text-rose-700">ج.م</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700">
                <ShieldAlert size={13} />
                <span>{totalKPIs.totalPenaltiesCount} حركة جزاء مسجلة</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Loans Repayments & Balance KPI */}
        <Card className="border-none bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white shadow-sm border border-indigo-100 rounded-2xl">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-indigo-800 font-bold text-xs">أقساط السلف والذمم</p>
              <h4 className="text-2xl font-black font-mono text-indigo-900">
                -{totalKPIs.totalLoanDeductions.toLocaleString('en-US')} <span className="text-xs font-bold text-indigo-700">ج.م</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                <Wallet size={13} />
                <span>قائم: {totalKPIs.totalOutstandingLoans.toLocaleString()} ج.م</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Expenses & Petty Cash KPI */}
        <Card className="border-none bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-white shadow-sm border border-orange-100 rounded-2xl">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-orange-800 font-bold text-xs">المصروفات والعهد</p>
              <h4 className="text-2xl font-black font-mono text-orange-900">
                -{totalKPIs.totalExpensesAmount.toLocaleString('en-US')} <span className="text-xs font-bold text-orange-700">ج.م</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-700">
                <DollarSign size={13} />
                <span>خصم عهد ومصروفات</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Grand Total Deductions KPI */}
        <Card className="border-none bg-slate-900 text-white shadow-xl shadow-slate-900/10 rounded-2xl">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-slate-300 font-bold text-xs">إجمالي كافة الاستقطاعات</p>
              <h4 className="text-2xl font-black font-mono text-rose-400">
                -{totalKPIs.grandTotal.toLocaleString('en-US')} <span className="text-xs font-bold text-slate-300">ج.م</span>
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                <User size={13} />
                <span>{totalKPIs.employeesWithDeductions} موظف مشمول</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-rose-400 flex items-center justify-center">
              <ArrowDownLeft size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Main Deductions Data Table */}
      <Card className="border border-slate-200/80 rounded-[20px] overflow-hidden shadow-sm bg-white print:border-none print:shadow-none print:rounded-none">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <FileText className="text-rose-600" size={20} />
              جدول استقطاعات العاملين التفصيلي
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              اضغط على أي موظف أو زر التفاصيل لعرض سجل الدقائق وحركات الجزاءات يوماً بيوم
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
              إجمالي الكشف: <span className="text-rose-600 font-mono font-black">-{totalKPIs.grandTotal.toLocaleString()} ج.م</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <Table>
            <TableHeader className="bg-slate-50/80 print:bg-slate-100">
              <TableRow className="border-slate-200">
                <TableHead className="text-right font-black text-slate-900 py-3 print:py-1.5">الموظف والوظيفة</TableHead>
                <TableHead className="text-right font-black text-slate-900">القسم</TableHead>
                <TableHead className="text-right font-black text-slate-900">الفئة / اليومية</TableHead>
                <TableHead className="text-right font-black text-amber-900 bg-amber-50/50 print:bg-transparent print:text-slate-900">
                  خصم التأخير بالدقيقة
                </TableHead>
                <TableHead className="text-right font-black text-rose-900 bg-rose-50/50 print:bg-transparent print:text-slate-900">
                  جزاءات إدارية
                </TableHead>
                <TableHead className="text-right font-black text-orange-900 bg-orange-50/50 print:bg-transparent print:text-slate-900">
                  مصروفات وعهد
                </TableHead>
                <TableHead className="text-right font-black text-indigo-900 bg-indigo-50/50 print:bg-transparent print:text-slate-900">
                  أقساط السلف
                </TableHead>
                <TableHead className="text-right font-black text-slate-900">
                  رصيد السلف
                </TableHead>
                <TableHead className="text-right font-black text-rose-700 bg-rose-100/50 print:bg-transparent print:text-slate-900">
                  إجمالي الاستقطاع
                </TableHead>
                <TableHead className="text-center font-black text-slate-900 print:hidden">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSummaries.map((s) => {
                const emp = s.employee;

                return (
                  <TableRow 
                    key={emp.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group print:hover:bg-transparent"
                    onClick={() => {
                      setSelectedEmployeeDetail(s);
                      setActiveModalTab('minutes');
                    }}
                  >
                    {/* Employee info */}
                    <TableCell className="py-3 print:py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 print:hidden">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900">
                            {emp.name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {emp.position || 'موظف'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Department */}
                    <TableCell className="font-bold text-slate-700 text-xs print:py-1.5">
                      {emp.department || 'عام'}
                    </TableCell>

                    {/* Daily Rate */}
                    <TableCell className="font-mono font-bold text-slate-700 text-xs print:py-1.5">
                      {emp.dailyRate > 0 ? `${emp.dailyRate.toLocaleString()} ج.م` : '--'}
                    </TableCell>

                    {/* Minute Delay Deductions */}
                    <TableCell className="bg-amber-50/30 print:bg-transparent print:py-1.5">
                      {s.minuteDeductionsAmount > 0 ? (
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-slate-950 text-xs">
                            -{s.minuteDeductionsAmount.toLocaleString()} ج.م
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">
                            ({s.totalLostMinutes} دقيقة)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Administrative Penalties */}
                    <TableCell className="bg-rose-50/30 print:bg-transparent print:py-1.5">
                      {s.penaltiesAmount > 0 ? (
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-slate-950 text-xs">
                            -{s.penaltiesAmount.toLocaleString()} ج.م
                          </span>
                          {s.penaltiesCount > 1 && (
                            <span className="text-[9px] font-bold text-slate-500">
                              ({s.penaltiesCount} جزاء)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Expenses / Petty Cash */}
                    <TableCell className="bg-orange-50/30 print:bg-transparent print:py-1.5">
                      {s.expensesAmount > 0 ? (
                        <span className="font-mono font-black text-slate-950 text-xs">
                          -{s.expensesAmount.toLocaleString()} ج.م
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Loan Installments */}
                    <TableCell className="bg-indigo-50/30 print:bg-transparent print:py-1.5">
                      {s.loanInstallmentDeduction > 0 ? (
                        <span className="font-mono font-black text-slate-950 text-xs">
                          -{s.loanInstallmentDeduction.toLocaleString()} ج.م
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Active Loan Remaining Balance */}
                    <TableCell className="font-mono font-bold text-slate-700 text-xs print:py-1.5">
                      {s.loansRemainingAmount > 0 ? (
                        <span className="font-black text-slate-900">{s.loansRemainingAmount.toLocaleString()} ج.م</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>

                    {/* Grand Total Deductions */}
                    <TableCell className="bg-rose-100/30 print:bg-transparent font-mono font-black text-slate-950 text-xs print:py-1.5">
                      {s.grandTotalDeductions > 0 ? (
                        <span className="font-black text-slate-950">
                          -{s.grandTotalDeductions.toLocaleString()} ج.م
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center print:hidden" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedEmployeeDetail(s);
                            setActiveModalTab('minutes');
                          }}
                          className="h-8 px-2.5 rounded-lg font-black text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="عرض تفاصيل الاستقطاعات يوماً بيوم"
                        >
                          <Eye size={14} className="ml-1" />
                          تفاصيل
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleWhatsApp(s)}
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="إرسال بيان الاستقطاعات عبر واتساب"
                        >
                          <MessageSquare size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredSummaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-slate-400 font-bold">
                    <AlertCircle size={40} className="mx-auto mb-3 opacity-30 text-rose-500" />
                    <p className="text-base font-black text-slate-700">لا توجد سجلات استقطاعات مطابقة للبحث المحدد</p>
                    <p className="text-xs text-slate-400 mt-1">جرب تغيير شروط الفلترة، القسم، أو توسيع الفترة الزمنية</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {/* Official Table Footer */}
            <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900">
              <tr>
                <td colSpan={3} className="py-4 px-4 text-right font-black text-slate-900 text-sm">
                  الإجمالي العام للكشف ({filteredSummaries.length} موظف):
                </td>
                <td className="text-right font-black font-mono text-amber-900 bg-amber-100/50">
                  -{totalKPIs.totalMinutesAmount.toLocaleString()} ج.م
                  <div className="text-[10px] font-bold text-amber-700 font-sans">({totalKPIs.totalLostMinutes} دقيقة)</div>
                </td>
                <td className="text-right font-black font-mono text-rose-900 bg-rose-100/50">
                  -{totalKPIs.totalPenaltiesAmount.toLocaleString()} ج.م
                  <div className="text-[10px] font-bold text-rose-700 font-sans">({totalKPIs.totalPenaltiesCount} جزاء)</div>
                </td>
                <td className="text-right font-black font-mono text-orange-900 bg-orange-100/50">
                  -{totalKPIs.totalExpensesAmount.toLocaleString()} ج.م
                </td>
                <td className="text-right font-black font-mono text-indigo-900 bg-indigo-100/50">
                  -{totalKPIs.totalLoanDeductions.toLocaleString()} ج.م
                </td>
                <td className="text-right font-black font-mono text-slate-900">
                  {totalKPIs.totalOutstandingLoans.toLocaleString()} ج.م
                </td>
                <td className="text-right font-black font-mono text-rose-900 bg-rose-200/80 text-base">
                  -{totalKPIs.grandTotal.toLocaleString()} ج.م
                </td>
                <td className="text-center print:hidden">-</td>
              </tr>
            </tfoot>
          </Table>
        </div>
      </Card>

      {/* 6. Print Signatures & Tafqeet */}
      <PrintSignatures
        tafqeetText={tafqeetArabic(totalKPIs.grandTotal, 'جنيه مصري')}
        preparedByTitle="مسؤول الموارد البشرية والرواتب"
        auditedByTitle="المراجعة والتدقيق المالي"
        approvedByTitle="اعتماد الإدارة العامة"
      />

      {/* 7. Individual Employee Deductions Drill-Down Modal */}
      {selectedEmployeeDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-auto print:hidden">
          <div className="bg-white rounded-2xl sm:rounded-[24px] max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-base sm:text-lg shrink-0">
                  {selectedEmployeeDetail.employee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-xl text-slate-900 flex items-center gap-2">
                    {selectedEmployeeDetail.employee.name}
                    <Badge variant="outline" className="font-bold text-[10px] sm:text-xs bg-white">
                      {selectedEmployeeDetail.employee.department || 'عام'}
                    </Badge>
                  </h3>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5">
                    كشف حساب تفصيلي للاستقطاعات والخصومات بالدقيقة للفترة من {startDate} إلى {endDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button 
                  onClick={() => handleWhatsApp(selectedEmployeeDetail)}
                  className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <MessageSquare size={14} />
                  واتساب
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedEmployeeDetail(null)}
                  className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-xl border-slate-200"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Modal KPI Mini Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-6 bg-slate-100/40 border-b border-slate-100">
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/60 shadow-xs">
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 block">خصومات التأخير بالدقيقة</span>
                <span className="font-mono font-black text-amber-900 text-sm sm:text-base">
                  -{selectedEmployeeDetail.minuteDeductionsAmount.toLocaleString()} ج.م
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block">{selectedEmployeeDetail.totalLostMinutes} دقيقة</span>
              </div>
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/60 shadow-xs">
                <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 block">الجزاءات الإدارية</span>
                <span className="font-mono font-black text-rose-900 text-sm sm:text-base">
                  -{selectedEmployeeDetail.penaltiesAmount.toLocaleString()} ج.م
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block">{selectedEmployeeDetail.penaltiesCount} حركة جزاء</span>
              </div>
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/60 shadow-xs">
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 block">أقساط السلف والعهد</span>
                <span className="font-mono font-black text-indigo-900 text-sm sm:text-base">
                  -{(selectedEmployeeDetail.loanInstallmentDeduction + selectedEmployeeDetail.expensesAmount).toLocaleString()} ج.م
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block truncate">متبقي: {selectedEmployeeDetail.loansRemainingAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl shadow-md">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 block">إجمالي الاستقطاعات</span>
                <span className="font-mono font-black text-rose-400 text-sm sm:text-base">
                  -{selectedEmployeeDetail.grandTotalDeductions.toLocaleString()} ج.م
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block">صافي الاستقطاع</span>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 pt-3 sm:pt-4 border-b border-slate-100 bg-white overflow-x-auto whitespace-nowrap custom-scrollbar">
              <button
                onClick={() => setActiveModalTab('minutes')}
                className={`pb-3 px-3 sm:px-4 text-xs font-black transition-all whitespace-nowrap relative shrink-0 ${
                  activeModalTab === 'minutes'
                    ? 'text-amber-600 border-b-2 border-amber-600 font-black'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ⏱️ سجل التأخيرات ({selectedEmployeeDetail.dayDelayRecords.length})
              </button>
              <button
                onClick={() => setActiveModalTab('penalties')}
                className={`pb-3 px-3 sm:px-4 text-xs font-black transition-all whitespace-nowrap relative shrink-0 ${
                  activeModalTab === 'penalties'
                    ? 'text-rose-600 border-b-2 border-rose-600 font-black'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ⚖️ حركات الجزاءات ({selectedEmployeeDetail.penaltiesCount})
              </button>
              <button
                onClick={() => setActiveModalTab('loans')}
                className={`pb-3 px-3 sm:px-4 text-xs font-black transition-all whitespace-nowrap relative shrink-0 ${
                  activeModalTab === 'loans'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-black'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                💳 السلف والأقساط ({selectedEmployeeDetail.loanRecords.length})
              </button>
              <button
                onClick={() => setActiveModalTab('expenses')}
                className={`pb-3 px-3 sm:px-4 text-xs font-black transition-all whitespace-nowrap relative shrink-0 ${
                  activeModalTab === 'expenses'
                    ? 'text-orange-600 border-b-2 border-orange-600 font-black'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                💵 المصروفات والعهد ({selectedEmployeeDetail.expensesCount})
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Tab 1: Minutes delay log */}
              {activeModalTab === 'minutes' && (
                <div className="space-y-4">
                  {selectedEmployeeDetail.dayDelayRecords.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="font-black text-slate-700 text-sm">سجل انضباط ممتاز!</p>
                      <p className="text-xs text-slate-400">لا توجد أي دقائق تأخير أو انصراف مبكر مسجلة في هذه الفترة</p>
                    </div>
                  ) : (
                    <Table className="bg-white rounded-xl overflow-hidden border border-slate-200/70">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-right font-black text-xs">اليوم والتاريخ</TableHead>
                          <TableHead className="text-right font-black text-xs">مواعيد الوردية</TableHead>
                          <TableHead className="text-right font-black text-xs">الحضور الفعلي</TableHead>
                          <TableHead className="text-right font-black text-xs">الانصراف الفعلي</TableHead>
                          <TableHead className="text-right font-black text-xs text-amber-700">دقائق التأخير</TableHead>
                          <TableHead className="text-right font-black text-xs text-amber-700">دقائق الخروج</TableHead>
                          <TableHead className="text-right font-black text-xs text-rose-700">استقطاع اليوم</TableHead>
                          <TableHead className="text-center font-black text-xs">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployeeDetail.dayDelayRecords.map(day => (
                          <TableRow key={day.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-xs">
                              <span className="font-black text-slate-800">{day.dayName}</span>
                              <span className="block font-mono text-[10px] text-slate-400">{day.date}</span>
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-500">
                              {day.shiftStart} - {day.shiftEnd}
                            </TableCell>
                            <TableCell className="font-mono font-black text-xs text-slate-800">
                              {day.checkIn}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-xs text-slate-600">
                              {day.checkOut}
                            </TableCell>
                            <TableCell className="font-mono font-black text-amber-700 text-xs">
                              {day.lateMinutes > 0 ? `${day.lateMinutes} دقيقة` : '--'}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-amber-700 text-xs">
                              {day.earlyMinutes > 0 ? `${day.earlyMinutes} دقيقة` : '--'}
                            </TableCell>
                            <TableCell className="font-mono font-black text-rose-600 text-xs">
                              -{day.deductionAmount.toLocaleString()} ج.م
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`font-bold text-[10px] ${day.isExcused ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                {day.isExcused ? 'بعذر مقبول' : 'بدون عذر'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Tab 2: Penalties log */}
              {activeModalTab === 'penalties' && (
                <div className="space-y-4">
                  {selectedEmployeeDetail.penaltyTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="font-black text-slate-700 text-sm">لا توجد جزاءات إدارية مسجلة</p>
                    </div>
                  ) : (
                    <Table className="bg-white rounded-xl overflow-hidden border border-slate-200/70">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-right font-black text-xs">التاريخ</TableHead>
                          <TableHead className="text-right font-black text-xs">نوع الاستقطاع</TableHead>
                          <TableHead className="text-right font-black text-xs">البيان والسبب</TableHead>
                          <TableHead className="text-right font-black text-xs text-rose-700">المبلغ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployeeDetail.penaltyTransactions.map((tx, idx) => (
                          <TableRow key={tx.id || idx} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono font-bold text-xs">{tx.date}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px]">
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-xs text-slate-700">{tx.description || 'خصم مباشر'}</TableCell>
                            <TableCell className="font-mono font-black text-rose-600 text-xs">
                              -{Number(tx.amount || 0).toLocaleString()} ج.م
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Tab 3: Loans log */}
              {activeModalTab === 'loans' && (
                <div className="space-y-4">
                  {selectedEmployeeDetail.loanRecords.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="font-black text-slate-700 text-sm">لا توجد سجلات سلف مسجلة للموظف</p>
                    </div>
                  ) : (
                    <Table className="bg-white rounded-xl overflow-hidden border border-slate-200/70">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-right font-black text-xs">تاريخ السلفة</TableHead>
                          <TableHead className="text-right font-black text-xs">مبلغ السلفة الأصلي</TableHead>
                          <TableHead className="text-right font-black text-xs">ما تم سداده</TableHead>
                          <TableHead className="text-right font-black text-xs text-rose-700">المتبقي القائم</TableHead>
                          <TableHead className="text-center font-black text-xs">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployeeDetail.loanRecords.map((loan, idx) => (
                          <TableRow key={loan.id || idx}>
                            <TableCell className="font-mono font-bold text-xs">{loan.date}</TableCell>
                            <TableCell className="font-mono font-bold text-xs">{loan.amount?.toLocaleString()} ج.م</TableCell>
                            <TableCell className="font-mono font-bold text-xs text-emerald-600">
                              {(loan.amount - (loan.remainingAmount || 0)).toLocaleString()} ج.م
                            </TableCell>
                            <TableCell className="font-mono font-black text-xs text-rose-700">
                              {loan.remainingAmount?.toLocaleString()} ج.م
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`border-none font-bold text-[10px] ${loan.status === 'نشط' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {loan.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Tab 4: Expenses log */}
              {activeModalTab === 'expenses' && (
                <div className="space-y-4">
                  {selectedEmployeeDetail.expenseTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="font-black text-slate-700 text-sm">لا توجد عهد أو مصروفات مسجلة</p>
                    </div>
                  ) : (
                    <Table className="bg-white rounded-xl overflow-hidden border border-slate-200/70">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-right font-black text-xs">التاريخ</TableHead>
                          <TableHead className="text-right font-black text-xs">النوع</TableHead>
                          <TableHead className="text-right font-black text-xs">البيان والتفاصيل</TableHead>
                          <TableHead className="text-right font-black text-xs text-orange-700">المبلغ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmployeeDetail.expenseTransactions.map((tx, idx) => (
                          <TableRow key={tx.id || idx}>
                            <TableCell className="font-mono font-bold text-xs">{tx.date}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-[10px]">
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-xs text-slate-700">{tx.description}</TableCell>
                            <TableCell className="font-mono font-black text-orange-700 text-xs">
                              -{Number(tx.amount || 0).toLocaleString()} ج.م
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                إجمالي استقطاعات الموظف: <span className="font-mono font-black text-rose-600 text-sm">-{selectedEmployeeDetail.grandTotalDeductions.toLocaleString()} ج.م</span>
              </span>
              <Button 
                onClick={() => setSelectedEmployeeDetail(null)}
                className="h-10 px-6 rounded-xl font-bold bg-slate-900 text-white"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
