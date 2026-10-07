import React, { useMemo } from 'react';
import { 
  X, User, Calendar, Clock, DollarSign, Wallet, 
  CreditCard, CheckCircle2, AlertTriangle, Layers, 
  FileText, ArrowUpRight, TrendingUp, Shield, 
  Phone, Building2, Briefcase, Award, ArrowRight
} from 'lucide-react';
import { Employee, Attendance, FinancialTransaction, Loan, Payroll, ProductionRecord, CompanySettings } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tafqeetArabic } from '../lib/tafqeet';

export interface EmployeeHR360ModalProps {
  employee: Employee | null;
  attendance: Attendance[];
  transactions: FinancialTransaction[];
  loans: Loan[];
  payrolls: Payroll[];
  productionRecords: ProductionRecord[];
  companySettings?: CompanySettings;
  onNavigateTab: (tab: string, employeeId?: string) => void;
  onClose: () => void;
}

export const EmployeeHR360Modal: React.FC<EmployeeHR360ModalProps> = ({
  employee,
  attendance = [],
  transactions = [],
  loans = [],
  payrolls = [],
  productionRecords = [],
  companySettings,
  onNavigateTab,
  onClose
}) => {
  if (!employee) return null;

  // 1. Employee-specific data slices
  const empAttendance = useMemo(() => {
    return attendance.filter(a => a && a.employeeId === employee.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [attendance, employee.id]);

  const empProduction = useMemo(() => {
    return productionRecords.filter(r => r && r.employeeId === employee.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [productionRecords, employee.id]);

  const empTransactions = useMemo(() => {
    return transactions.filter(t => t && t.employeeId === employee.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, employee.id]);

  const empLoans = useMemo(() => {
    return loans.filter(l => l && l.employeeId === employee.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [loans, employee.id]);

  const empPayrolls = useMemo(() => {
    return payrolls.filter(p => p && p.employeeId === employee.id).sort((a, b) => (b.year - a.year) || ((b.weekNumber || 0) - (a.weekNumber || 0)));
  }, [payrolls, employee.id]);

  // 2. Calculations
  const activeLoans = empLoans.filter(l => l.status === 'نشط');
  const totalLoanRemaining = activeLoans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  const totalLoanPaid = empLoans.reduce((sum, l) => sum + (l.paidAlready || 0), 0);

  const totalProductionAmount = empProduction.reduce((sum, r) => sum + (Number(r.total) || 0) + (Number(r.earlyBonus) || 0) + (Number(r.qualityBonus) || 0), 0);

  const totalOvertime = empTransactions.filter(t => t.type === 'إضافي' || t.type === 'أوفرتايم').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalBonuses = empTransactions.filter(t => t.type === 'مكافأة' || t.type === 'مكافآت' || t.type === 'بدل').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalDeductions = empTransactions.filter(t => t.type === 'خصم' || t.type === 'جزاء').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpenses = empTransactions.filter(t => t.type === 'مصروف' || t.type === 'سلفة' || t.type === 'عهدة').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Present days
  const presentDaysCount = empAttendance.filter(a => a.status === 'حضور' || a.status === 'تأخير').length;
  const absentDaysCount = empAttendance.filter(a => a.status === 'غياب').length;

  // Fixed allowances
  const monthlyFixedAllowances = (employee.transportAllowance || 0) + (employee.housingAllowance || 0) + (employee.phoneAllowance || 0) + (employee.workNatureAllowance || 0) + (employee.allowances || 0);

  // Latest payroll or estimated current calculation
  const latestPayroll = empPayrolls[0];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 z-[9999] overflow-y-auto no-print">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200 text-right">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0 font-black text-xl">
              {employee.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                  {employee.name}
                </h3>
                <Badge className={`rounded-lg px-2.5 py-0.5 font-black text-xs ${
                  employee.status === 'نشط' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {employee.status}
                </Badge>
                <Badge className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-bold">
                  {employee.payMethod === 'production' ? 'أجر بالإنتاج (قطعة)' : 'أجر يومي/شهري'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium mt-1">
                <span>{employee.department || 'عام'} • {employee.position || 'عامل'}</span>
                {employee.phone && <span>• 📞 {employee.phone}</span>}
                {employee.shiftStart && <span>• ⏰ الشيفت: {employee.shiftStart} إلى {employee.shiftEnd || '18:00'}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {/* 1. Quick Financial Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">فئة الأجر الأساسي</span>
              <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
                {employee.dailyRate ? `${employee.dailyRate.toLocaleString()} ج.م/يوم` : `${employee.pieceRate || 0} ج.م/قطعة`}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {employee.productionGroup ? `مجموعة الإنتاج: (${employee.productionGroup})` : 'أجر مباشر'}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">سجل الحضور المسجل</span>
              <span className="text-lg font-black font-mono text-emerald-600 mt-0.5 block">
                {presentDaysCount} يوم حضور
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                مقابل {absentDaysCount} يوم غياب
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">إجمالي الإنتاج بالقطعة</span>
              <span className="text-lg font-black font-mono text-purple-600 mt-0.5 block">
                {totalProductionAmount.toLocaleString()} ج.م
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {empProduction.length} أمر تشغيل مسجل
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">السلف القائمة للخصم</span>
              <span className="text-lg font-black font-mono text-amber-600 mt-0.5 block">
                {totalLoanRemaining.toLocaleString()} ج.م
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                تم سداد: {totalLoanPaid.toLocaleString()} ج.م
              </span>
            </div>
          </div>

          {/* 2. Direct Cross-Navigation Hub for this Employee */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              الانتقال المباشر لبيانات الموظف عبر الموديولات:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateTab('attendance', employee.id);
                }}
                className="h-10 rounded-xl font-bold text-xs border-slate-200 hover:border-emerald-500 hover:text-emerald-700 justify-start"
              >
                <CheckCircle2 size={15} className="ml-1.5 text-emerald-500 shrink-0" />
                دفتر الحضور ({empAttendance.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateTab('hrProduction', employee.id);
                }}
                className="h-10 rounded-xl font-bold text-xs border-slate-200 hover:border-purple-500 hover:text-purple-700 justify-start"
              >
                <Layers size={15} className="ml-1.5 text-purple-500 shrink-0" />
                سجل الإنتاج ({empProduction.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateTab('hrTransactions', employee.id);
                }}
                className="h-10 rounded-xl font-bold text-xs border-slate-200 hover:border-blue-500 hover:text-blue-700 justify-start"
              >
                <DollarSign size={15} className="ml-1.5 text-blue-500 shrink-0" />
                التسويات ({empTransactions.length})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateTab('loans', employee.id);
                }}
                className="h-10 rounded-xl font-bold text-xs border-slate-200 hover:border-amber-500 hover:text-amber-700 justify-start"
              >
                <CreditCard size={15} className="ml-1.5 text-amber-500 shrink-0" />
                السلف ({empLoans.length})
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onNavigateTab('payroll', employee.id);
                }}
                className="h-10 rounded-xl font-black text-xs bg-slate-900 hover:bg-blue-600 text-white justify-start"
              >
                <Wallet size={15} className="ml-1.5 text-blue-400 shrink-0" />
                مسير الرواتب ⬅️
              </Button>
            </div>
          </div>

          {/* 3. Detailed Data Tabs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box A: Recent Production & Piecework */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                  <Layers size={15} className="text-purple-600" />
                  أحدث عمليات الإنتاج المسجلة
                </span>
                <span className="text-[11px] font-bold text-purple-600">
                  الإجمالي: {totalProductionAmount.toLocaleString()} ج.م
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {empProduction.slice(0, 5).map(r => (
                  <div key={r.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {r.date} • الكمية: {r.quantity} × {r.rate} ج.م {r.jobOrderNo ? `(شغل: ${r.jobOrderNo})` : ''}
                      </div>
                    </div>
                    <span className="font-mono font-black text-purple-700 text-sm">
                      +{r.total.toLocaleString()} ج.م
                    </span>
                  </div>
                ))}
                {empProduction.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold">
                    لا توجد سجلات إنتاج مسجلة لهذا الموظف
                  </div>
                )}
              </div>
            </div>

            {/* Box B: Transactions & Adjustments */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-blue-600" />
                  المكافآت والبدلات والخصومات
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  +{totalBonuses + totalOvertime} / -{totalDeductions + totalExpenses} ج.م
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {empTransactions.slice(0, 5).map(t => {
                  const isBonus = ['مكافأة', 'مكافآت', 'بدل', 'إضافي', 'أوفرتايم'].includes(t.type);
                  return (
                    <div key={t.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isBonus ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{t.type}: {t.description || 'بدون بيان'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{t.date}</div>
                      </div>
                      <span className={`font-mono font-black text-sm ${isBonus ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isBonus ? `+${t.amount}` : `-${t.amount}`} ج.م
                      </span>
                    </div>
                  );
                })}
                {empTransactions.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold">
                    لا توجد تسويات مالية مسجلة
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Active Loans & Installments Schedule */}
          {activeLoans.length > 0 && (
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-xs text-amber-900 flex items-center gap-1.5">
                  <CreditCard size={15} className="text-amber-700" />
                  السلف القائمة وجدول استقطاع الأقساط
                </span>
                <span className="text-xs font-black text-amber-900">
                  متبقي إجمالي: {totalLoanRemaining.toLocaleString()} ج.م
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {activeLoans.map(loan => (
                  <div key={loan.id} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">سلفة بتاريخ {loan.date}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        أصل السلفة: {loan.amount.toLocaleString()} ج.م • سدد: {loan.paidAlready || 0} ج.م
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-mono font-black text-amber-700 text-sm block">
                        {loan.remainingAmount.toLocaleString()} ج.م
                      </span>
                      <span className="text-[9px] text-slate-400">متبقي للخصم</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Fixed Allowances & Deductions Tree */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-black text-xs text-indigo-950 block">مكونات الأجر والبدلات الشهرية الثابتة</span>
              <span className="text-xs text-slate-600 mt-0.5 block">
                انتقال: {employee.transportAllowance || 0} ج.م • سكن: {employee.housingAllowance || 0} ج.م • اتصالات: {employee.phoneAllowance || 0} ج.م • تأمينات: {employee.socialInsuranceDeduction || 0} ج.م
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-400 block">إجمالي البدلات الثابتة</span>
              <span className="font-mono font-black text-indigo-700 text-base">
                +{monthlyFixedAllowances.toLocaleString()} ج.م/شهرياً
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-500">
            تم استخراج البيانات لحظياً ومباشرة من قاعدة بيانات الموظفين والعمليات الحسابية
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl font-bold h-10 px-5"
            >
              إغلاق
            </Button>
            <Button
              onClick={() => {
                onClose();
                onNavigateTab('payroll', employee.id);
              }}
              className="rounded-xl font-black h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md shadow-blue-500/20"
            >
              <Wallet size={16} />
              فتح مسير الرواتب للموظف
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHR360Modal;
