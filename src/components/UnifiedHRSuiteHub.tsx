import React, { useState, useMemo } from 'react';
import { 
  Users, CheckCircle2, Layers, DollarSign, CreditCard, 
  History, BarChart3, ChevronLeft, ArrowRight, Sparkles, 
  Calendar, Clock, ShieldCheck, TrendingUp, AlertCircle, 
  Eye, FileText, ChevronRight, Search, PlusCircle, Check,
  Wallet, Award, ArrowUpRight, Filter
} from 'lucide-react';
import { Employee, Attendance, FinancialTransaction, Loan, Payroll, ProductionRecord, CompanySettings } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export interface UnifiedHRSuiteHubProps {
  activeTab: string;
  onTabChange: (tab: string, employeeId?: string) => void;
  employees: Employee[];
  attendance: Attendance[];
  transactions: FinancialTransaction[];
  loans: Loan[];
  payrolls: Payroll[];
  productionRecords: ProductionRecord[];
  companySettings?: CompanySettings;
  onOpenEmployee360?: (emp: Employee) => void;
  targetEmployeeId?: string | null;
}

export const UnifiedHRSuiteHub: React.FC<UnifiedHRSuiteHubProps> = ({
  activeTab,
  onTabChange,
  employees = [],
  attendance = [],
  transactions = [],
  loans = [],
  payrolls = [],
  productionRecords = [],
  companySettings,
  onOpenEmployee360,
  targetEmployeeId
}) => {
  const [selectedQuickEmployee, setSelectedQuickEmployee] = useState<string>('');
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // 1. Operational steps sequence
  const hrSteps = useMemo(() => [
    {
      id: 'employees',
      label: 'ملفات الموظفين',
      shortLabel: 'الموظفون',
      icon: <Users size={16} />,
      badge: `${employees.filter(e => e.status === 'نشط').length} نشط`,
      desc: 'العقود وفئات الأجور والبدلات ومجموعات الإنتاج',
      status: 'أساسي'
    },
    {
      id: 'attendance',
      label: 'دفتر الحضور',
      shortLabel: 'الحضور',
      icon: <CheckCircle2 size={16} />,
      badge: `${(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return attendance.filter(a => a.date === todayStr && (a.status === 'حضور' || a.status === 'تأخير')).length;
      })()} اليوم`,
      desc: 'تسجيل الحضور والانصراف وحساب ساعات وتأخيرات الشيفت',
      status: 'يومي'
    },
    {
      id: 'hrProduction',
      label: 'سجل الإنتاج',
      shortLabel: 'الإنتاجية',
      icon: <Layers size={16} />,
      badge: `${productionRecords.length} عملية`,
      desc: 'حساب إنتاج العمال بالقطعة وأوامر الشغل وتسعير أ/ب',
      status: 'مستمر'
    },
    {
      id: 'hrTransactions',
      label: 'التسويات المالية',
      shortLabel: 'التسويات',
      icon: <DollarSign size={16} />,
      badge: `${transactions.length} قيد`,
      desc: 'المكافآت، الإضافي، البدلات، الجزاءات، والمصروفات',
      status: 'دوري'
    },
    {
      id: 'loans',
      label: 'طلبات السلف',
      shortLabel: 'السلف',
      icon: <CreditCard size={16} />,
      badge: `${loans.filter(l => l.status === 'نشط').length} نشطة`,
      desc: 'إدارة السلف وجدولة الأقساط والاستقطاع الآلي',
      status: 'ائتماني'
    },
    {
      id: 'payroll',
      label: 'مسير الرواتب',
      shortLabel: 'الرواتب',
      icon: <Wallet size={16} />,
      badge: `${payrolls.filter(p => p.status === 'مسودة').length} مسودة`,
      desc: 'إصدار كشوف الرواتب الأسبوعية واليومية والاستقطاعات',
      status: 'حسابي'
    },
    {
      id: 'archive',
      label: 'أرشيف المسيرات',
      shortLabel: 'الأرشيف',
      icon: <History size={16} />,
      badge: `${payrolls.filter(p => p.status === 'مدفوع').length} معتمد`,
      desc: 'المسيرات المسددة وقسائم الصرف وإثباتات الخزينة',
      status: 'توثيقي'
    },
    {
      id: 'payrollMasterReport',
      label: 'كشف الأجور الشامل',
      shortLabel: 'التقرير الشامل',
      icon: <BarChart3 size={16} />,
      badge: 'تحليلي',
      desc: 'التحليل الاستراتيجي لتكاليف الأجور ومراكز التكلفة',
      status: 'إداري'
    }
  ], [employees, attendance, productionRecords, transactions, loans, payrolls]);

  // 2. High-Level Live Module KPIs
  const liveStats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const activeEmps = employees.filter(e => e.status === 'نشط');
    const todayPresent = attendance.filter(a => a.date === todayStr && (a.status === 'حضور' || a.status === 'تأخير')).length;
    const todayAbsent = attendance.filter(a => a.date === todayStr && a.status === 'غياب').length;
    const attRate = activeEmps.length > 0 ? Math.round((todayPresent / activeEmps.length) * 100) : 0;
    
    const activeLoansTotal = loans.filter(l => l.status === 'نشط').reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
    const draftPayrollsList = payrolls.filter(p => p.status === 'مسودة');
    const draftNetTotal = draftPayrollsList.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const totalProductionValue = productionRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    return {
      activeEmpsCount: activeEmps.length,
      todayPresent,
      todayAbsent,
      attRate,
      activeLoansTotal,
      draftPayrollsCount: draftPayrollsList.length,
      draftNetTotal,
      totalProductionValue
    };
  }, [employees, attendance, loans, payrolls, productionRecords]);

  const currentStepIndex = hrSteps.findIndex(s => s.id === activeTab);

  return (
    <div className="mb-4 sm:mb-6 md:mb-8 space-y-3 sm:space-y-4 print:hidden">
      {/* 1. Header Command Hub Card */}
      <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Decorative backdrop light */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          {/* Title & Badge */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0 mt-0.5">
              <DollarSign size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white">
                  منظومة الأجور والرواتب المتكاملة
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ربط محاسبي وتحديث فوري 100%
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
                ربط إلكتروني ذكي يجمع ملفات الموظفين، الحضور، الإنتاج، التسويات، السلف، وإصدار وصرف المسيرات دفعة واحدة.
              </p>
            </div>
          </div>

          {/* Quick 360 Employee Lookup */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <div className="relative">
              <select
                aria-label="اختيار موظف لعرض بطاقة الموظف الشاملة"
                className="h-10 sm:h-11 px-3 pl-8 bg-slate-800/90 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-200 outline-none hover:border-slate-600 focus:border-blue-500 transition-colors cursor-pointer max-w-[220px]"
                value={selectedQuickEmployee}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedQuickEmployee(val);
                  if (val && onOpenEmployee360) {
                    const emp = employees.find(x => x.id === val);
                    if (emp) onOpenEmployee360(emp);
                  }
                }}
              >
                <option value="">🔍 بحث سريع: بطاقة موظف 360°</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} {e.department ? `(${e.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTabChange('attendance')}
                className="h-10 rounded-xl text-xs font-black border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white"
                title="تسجيل الحضور"
              >
                <CheckCircle2 size={14} className="ml-1 text-emerald-400" />
                الحضور
              </Button>
              <Button
                size="sm"
                onClick={() => onTabChange('payroll')}
                className="h-10 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/20"
                title="مسير الرواتب"
              >
                <Wallet size={14} className="ml-1" />
                مسير الرواتب
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Real-Time Operational Pulse Bar (KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-800/80 text-right">
          {/* KPI 1: Active Employees */}
          <div 
            onClick={() => onTabChange('employees')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>القوى العاملة</span>
              <Users size={13} className="text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-white">{liveStats.activeEmpsCount}</span>
              <span className="text-[10px] text-slate-400">موظف نشط</span>
            </div>
          </div>

          {/* KPI 2: Today Attendance */}
          <div 
            onClick={() => onTabChange('attendance')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>حضور اليوم</span>
              <CheckCircle2 size={13} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-emerald-400">{liveStats.todayPresent}</span>
              <span className="text-[10px] text-slate-400">حاضر ({liveStats.attRate}%)</span>
            </div>
          </div>

          {/* KPI 3: Active Loans */}
          <div 
            onClick={() => onTabChange('loans')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>سلف قائمة للخصم</span>
              <CreditCard size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-amber-400">{liveStats.activeLoansTotal.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400">ج.م مستحق</span>
            </div>
          </div>

          {/* KPI 4: Pending Payroll */}
          <div 
            onClick={() => onTabChange('payroll')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>مسير الأسبوع</span>
              <Wallet size={13} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono text-indigo-300">
                {liveStats.draftPayrollsCount > 0 ? `${liveStats.draftNetTotal.toLocaleString()} ج.م` : 'مُعتمد بالكامل'}
              </span>
              <span className="text-[10px] text-slate-400">
                {liveStats.draftPayrollsCount > 0 ? `(${liveStats.draftPayrollsCount} مسودة)` : 'جاهز'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational Workflow Pipeline (The 8 Connected Stages) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-xs">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 text-slate-500 text-xs font-black">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>مسار الدورة المحاسبية للأجور والرواتب (انتقال فوري متصل)</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
            القسم النشط: <strong className="text-blue-600">{hrSteps.find(s => s.id === activeTab)?.label}</strong>
          </span>
        </div>

        {/* Scrollable Stage Pills */}
        <div className="flex items-stretch gap-1.5 sm:gap-2 overflow-x-auto pt-2 pb-1 custom-scrollbar">
          {hrSteps.map((step, idx) => {
            const isActive = activeTab === step.id;
            const isCompleted = currentStepIndex > idx;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onTabChange(step.id)}
                className={`flex-1 min-w-[130px] sm:min-w-[155px] p-2 sm:p-2.5 rounded-xl text-right transition-all duration-200 relative group cursor-pointer border ${
                  isActive 
                    ? 'bg-blue-50/80 border-blue-500/60 shadow-sm ring-2 ring-blue-500/10' 
                    : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-white text-slate-500 group-hover:text-blue-600 border border-slate-200'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {step.badge}
                  </span>
                </div>

                <div className="font-black text-xs text-slate-800 group-hover:text-blue-600 truncate">
                  {step.shortLabel}
                </div>
                <div className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                  {step.desc}
                </div>

                {/* Progress bar line at bottom */}
                <div className={`h-1 w-full rounded-full mt-2 transition-all ${
                  isActive ? 'bg-blue-600' : isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                }`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UnifiedHRSuiteHub;
