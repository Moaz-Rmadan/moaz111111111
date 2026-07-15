import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, ArrowDownRight, Calendar, Search, Filter, Printer, 
  MessageSquare, ShieldAlert, Clock, User, Download, FileText, 
  TrendingDown, CheckCircle2, RefreshCw, X, ChevronRight, BarChart3
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Legend, ComposedChart, Line
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Attendance, FinancialTransaction, Loan, CompanySettings } from '../types';

interface DeductionsViewProps {
  employees: Employee[];
  attendance: Attendance[];
  transactions: FinancialTransaction[];
  loans: Loan[];
  companyInfo?: CompanySettings;
}

interface DeductionEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  type: 'جزاء' | 'خصم' | 'تأخير وانصراف مبكر' | 'غياب' | 'خصم سلف';
  amount: number;
  reason: string;
  details?: string;
  referenceId?: string;
}

export function DeductionsView({
  employees,
  attendance,
  transactions,
  loans,
  companyInfo
}: DeductionsViewProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('الكل');
  const [deductionType, setDeductionType] = useState<string>('الكل');
  
  // Date Presets: default is "this_month"
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Selected Deduction for Printable Receipt / WhatsApp Modal
  const [selectedDeduction, setSelectedDeduction] = useState<DeductionEvent | null>(null);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return ['الكل', ...Array.from(depts)];
  }, [employees]);

  // Dynamic Date range calculation
  const dates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = '';
    let end = '';

    if (dateRangeMode === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      start = todayStr;
      end = todayStr;
    } else if (dateRangeMode === 'this_week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const startOfWeek = new Date(today.setDate(diff));
      start = startOfWeek.toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (dateRangeMode === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
    } else if (dateRangeMode === 'custom') {
      start = customStartDate;
      end = customEndDate;
    }

    return { start, end };
  }, [dateRangeMode, customStartDate, customEndDate]);

  // Compute all deduction events based on the rules
  const allDeductionEvents = useMemo(() => {
    const events: DeductionEvent[] = [];

    // 1. Direct HR transactions (خصم، جزاء)
    transactions.forEach(t => {
      if (t.type === 'خصم' || t.type === 'جزاء') {
        const emp = employees.find(e => e.id === t.employeeId);
        if (emp) {
          // Filter by date if applicable
          if (dateRangeMode !== 'all') {
            if (t.date < dates.start || t.date > dates.end) return;
          }
          events.push({
            id: t.id,
            employeeId: t.employeeId,
            employeeName: emp.name,
            department: emp.department || 'عام',
            date: t.date,
            type: t.type as 'خصم' | 'جزاء',
            amount: Number(t.amount) || 0,
            reason: t.description || (t.type === 'جزاء' ? 'جزاء إداري مباشر' : 'خصم مالي مباشر'),
            details: `مسجل عبر المالية - حركة رقم #${t.id.slice(0, 8)}`,
            referenceId: t.id
          });
        }
      }
    });

    // 2. Loan Recoveries (خصم سلف)
    transactions.forEach(t => {
      if (t.type === 'خصم سلف' || t.type === 'سلفة مستردة') {
        const emp = employees.find(e => e.id === t.employeeId);
        if (emp) {
          if (dateRangeMode !== 'all') {
            if (t.date < dates.start || t.date > dates.end) return;
          }
          events.push({
            id: t.id,
            employeeId: t.employeeId,
            employeeName: emp.name,
            department: emp.department || 'عام',
            date: t.date,
            type: 'خصم سلف',
            amount: Number(t.amount) || 0,
            reason: t.description || 'خصم مستحق أو قسط سلف مجدول',
            details: `سداد جزء من السلفة القائمة - حركة رقم #${t.id.slice(0, 8)}`,
            referenceId: t.id
          });
        }
      }
    });

    // 3. Attendance Late / Early departure deductions
    attendance.forEach(att => {
      if (dateRangeMode !== 'all') {
        if (att.date < dates.start || att.date > dates.end) return;
      }
      const emp = employees.find(e => e.id === att.employeeId);
      if (!emp) return;

      if (att.status === 'حضور' || att.status === 'تأخير') {
        if (att.checkIn && att.checkOut) {
          const [inH, inM] = att.checkIn.split(':').map(Number);
          const [outH, outM] = att.checkOut.split(':').map(Number);
          const checkInMins = inH * 60 + inM;
          const checkOutMins = outH * 60 + outM;

          const shiftStartStr = emp.shiftStart || '08:00';
          const shiftEndStr = emp.shiftEnd || '18:00';
          const [sH, sM] = shiftStartStr.split(':').map(Number);
          const [eH, eM] = shiftEndStr.split(':').map(Number);
          const officialStart = sH * 60 + sM;
          const officialEnd = eH * 60 + eM;
          const shiftDurationMins = officialEnd - officialStart;
          const gracePeriod = 15;

          let lateMins = 0;
          const deductLate = companyInfo?.deductLateArrival !== false && !att.isExcused;
          if (deductLate && checkInMins > officialStart + gracePeriod) {
            lateMins = checkInMins - officialStart;
          }
          const deductEarly = companyInfo?.deductEarlyDeparture !== false && !att.isExcused;
          const earlyMins = deductEarly ? Math.max(0, officialEnd - checkOutMins) : 0;

          if (lateMins > 0 || earlyMins > 0) {
            const duration = shiftDurationMins > 0 ? shiftDurationMins : 600;
            const rawDeduction = (lateMins + earlyMins) * (emp.dailyRate / duration);
            const deductionVal = Math.round(Math.min(emp.dailyRate, rawDeduction));
            if (deductionVal > 0) {
              events.push({
                id: `att-late-${att.id}`,
                employeeId: emp.id,
                employeeName: emp.name,
                department: emp.department || 'عام',
                date: att.date,
                type: 'تأخير وانصراف مبكر',
                amount: deductionVal,
                reason: `خصم تأخير زمن الحضور والانصراف`,
                details: `${lateMins > 0 ? `تأخير دقيقة ${lateMins} ` : ''}${earlyMins > 0 ? `وانصراف مبكر دقيقة ${earlyMins}` : ''} (يومية الموظف: ${emp.dailyRate} ج.م)`,
                referenceId: att.id
              });
            }
          }
        }
      } else if (att.status === 'غياب') {
        // Full day daily rate deduction / lost wage
        events.push({
          id: `att-abs-${att.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || 'عام',
          date: att.date,
          type: 'غياب',
          amount: emp.dailyRate,
          reason: `غياب غير مصرح به (فقدان أجر يومي كامل)`,
          details: `غياب مسجل في الحضور والانصراف - الفئة اليومية: ${emp.dailyRate} ج.م`,
          referenceId: att.id
        });
      }
    });

    // Sort by date descending
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [employees, attendance, transactions, dates, dateRangeMode]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return allDeductionEvents.filter(ev => {
      const matchesSearch = ev.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            ev.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'الكل' || ev.department === selectedDept;
      const matchesType = deductionType === 'الكل' || ev.type === deductionType;
      return matchesSearch && matchesDept && matchesType;
    });
  }, [allDeductionEvents, searchTerm, selectedDept, deductionType]);

  // Calculated KPI Stats
  const stats = useMemo(() => {
    let totalDeductions = 0;
    let totalPenalties = 0;
    let totalAttendanceDeductions = 0;
    let totalAbsencesDeductions = 0;
    let totalLoansDeductions = 0;
    const penalizedEmps = new Set<string>();

    filteredEvents.forEach(ev => {
      totalDeductions += ev.amount;
      penalizedEmps.add(ev.employeeId);

      if (ev.type === 'خصم') totalDeductions += 0; // already in total
      if (ev.type === 'جزاء') totalPenalties += ev.amount;
      if (ev.type === 'تأخير وانصراف مبكر') totalAttendanceDeductions += ev.amount;
      if (ev.type === 'غياب') totalAbsencesDeductions += ev.amount;
      if (ev.type === 'خصم سلف') totalLoansDeductions += ev.amount;
    });

    return {
      total: totalDeductions,
      penalties: totalPenalties,
      attendance: totalAttendanceDeductions,
      absences: totalAbsencesDeductions,
      loans: totalLoansDeductions,
      employeesCount: penalizedEmps.size
    };
  }, [filteredEvents]);

  // Recharts Chart Data: Categories Proportions
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {
      'جزاءات إدارية': 0,
      'خصومات مالية': 0,
      'تأخيرات إلكترونية': 0,
      'غياب وفقدان أيام': 0,
      'أقساط سلف مستردة': 0,
    };

    filteredEvents.forEach(ev => {
      if (ev.type === 'جزاء') map['جزاءات إدارية'] += ev.amount;
      if (ev.type === 'خصم') map['خصومات مالية'] += ev.amount;
      if (ev.type === 'تأخير وانصراف مبكر') map['تأخيرات إلكترونية'] += ev.amount;
      if (ev.type === 'غياب') map['غياب وفقدان أيام'] += ev.amount;
      if (ev.type === 'خصم سلف') map['أقساط سلف مستردة'] += ev.amount;
    });

    return Object.entries(map)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredEvents]);

  // Top 5 employees by deduction amount
  const topEmployeesChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEvents.forEach(ev => {
      map[ev.employeeName] = (map[ev.employeeName] || 0) + ev.amount;
    });

    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredEvents]);

  const COLORS = ['#ef4444', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6'];

  // Handle WhatsApp message template
  const sendWhatsAppNotification = (ev: DeductionEvent) => {
    const emp = employees.find(e => e.id === ev.employeeId);
    const phone = emp?.phone || '';
    
    const message = `السلام عليكم ورحمة الله وبركاته، السيد الموظف/ ${ev.employeeName}.
نود إحاطتكم علماً بأنه قد تم تسجيل قيد استقطاع مالي في حسابكم بالتفاصيل التالية:

📌 *نوع الاستقطاع:* ${ev.type}
💰 *المبلغ المستقطع:* ${ev.amount.toLocaleString()} ج.م
📅 *تاريخ المعاملة:* ${ev.date}
📝 *السبب بالتفصيل:* ${ev.reason}
🔍 *ملاحظات إضافية:* ${ev.details || 'لا يوجد'}

يرجى مراجعة إدارة الموارد البشرية والمالية في حال وجود أي استفسار. نسعد بجهودكم الدائمة معنا.
*${companyInfo?.name || 'مصنع النجار للأثاث'}*`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`, '_blank');
  };

  // Safe Print for receipt
  const printDeductionReceipt = (ev: DeductionEvent) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>إشعار استقطاع مالي تفصيلي</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 40px; color: #1e293b; background: #fff; }
            .header { text-align: center; border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .title { font-size: 16px; color: #64748b; font-weight: 600; margin-top: 5px; }
            .receipt-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #f8fafc; margin-bottom: 30px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px; }
            .label { font-weight: bold; color: #475569; }
            .value { font-weight: 800; color: #0f172a; }
            .amount-box { text-align: center; background: #fee2e2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: 900; color: #dc2626; }
            .amount-label { font-size: 14px; font-weight: bold; color: #991b1b; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; font-size: 12px; }
            .sig-col { width: 45%; }
            .line { height: 1px; background: #cbd5e1; width: 150px; margin: 30px auto 10px auto; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="company-name">${companyInfo?.name || 'مجموعة شركات النجار الفاخر للأثاث'}</h1>
            <div class="title">إشعار رسمي بخصم واستقطاع مالي تفصيلي</div>
          </div>
          
          <div class="receipt-box">
            <div class="row">
              <span class="label">اسم الموظف المستقطع منه:</span>
              <span class="value">${ev.employeeName}</span>
            </div>
            <div class="row">
              <span class="label">القسم والنشاط:</span>
              <span class="value">${ev.department}</span>
            </div>
            <div class="row">
              <span class="label">تاريخ حدوث المعاملة:</span>
              <span class="value">${ev.date}</span>
            </div>
            <div class="row">
              <span class="label">نوع وقيد الاستقطاع:</span>
              <span class="value">${ev.type}</span>
            </div>
            <div class="row">
              <span class="label">السبب الأساسي للخصم:</span>
              <span class="value">${ev.reason}</span>
            </div>
            <div class="row" style="border:none;">
              <span class="label">تفاصيل وتدقيقات إلكترونية:</span>
              <span class="value">${ev.details || 'سجل يدوي'}</span>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">إجمالي القيمة المستقطعة من الأجور</div>
            <div class="amount">${ev.amount.toLocaleString()} ج.م</div>
          </div>

          <p style="font-size: 11px; text-align: center; color: #94a3b8; margin-top: 40px;">
            تم إصدار هذا الإشعار تلقائياً من نظام تسوية الأجور والرواتب والحركات المالية للشركة.
          </p>

          <div class="signatures">
            <div class="sig-col">
              <p>توقيع الموظف المـقـر بالخصم</p>
              <div class="line"></div>
              <p>موافقة الموظف</p>
            </div>
            <div class="sig-col">
              <p>اعتماد مدير الإدارة المالية والـ HR</p>
              <div class="line"></div>
              <p>أختام وتوقيع المدير العام</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-fade-in text-right" dir="rtl">
      {/* Search and Filters Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-6 print:hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3">
              <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              منظومة تدقيق الاستقطاعات والجزاءات الاحترافية
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              التحقق بالاسم والتاريخ من أسباب ومبالغ الخصم والغياب وسداد السلف لكافة العاملين باحترافية كاملة
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'this_week', label: 'هذا الأسبوع' },
              { id: 'this_month', label: 'هذا الشهر' },
              { id: 'all', label: 'كل التواريخ' },
              { id: 'custom', label: 'فترة مخصصة' }
            ].map(preset => (
              <Button
                key={preset.id}
                onClick={() => setDateRangeMode(preset.id as any)}
                variant={dateRangeMode === preset.id ? 'default' : 'outline'}
                className={`h-10 px-4 rounded-xl font-bold text-xs transition-all ${
                  dateRangeMode === preset.id 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200' 
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Date pickers for custom period */}
        {dateRangeMode === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl border border-slate-150"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500">من تاريخ:</span>
              <Input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)} 
                className="w-40 h-10 text-right font-bold rounded-xl border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500">إلى تاريخ:</span>
              <Input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)} 
                className="w-40 h-10 text-right font-bold rounded-xl border-slate-200"
              />
            </div>
          </motion.div>
        )}

        {/* Real-time Search inputs and category selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3.5 top-3 text-slate-400" size={18} />
            <Input
              placeholder="ابحث باسم الموظف أو السبب..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pr-10 h-11 rounded-xl font-bold text-xs text-slate-800 border-slate-200 bg-white"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 font-bold text-xs text-slate-800 pr-3 pl-8 bg-white focus-visible:outline-none focus:ring-1 focus:ring-red-600"
            >
              <option disabled>اختر القسم</option>
              {departments.map(d => (
                <option key={d} value={d}>القسم: {d}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={deductionType}
              onChange={e => setDeductionType(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 font-bold text-xs text-slate-800 pr-3 pl-8 bg-white focus-visible:outline-none focus:ring-1 focus:ring-red-600"
            >
              <option value="الكل">كل أنواع الاستقطاعات</option>
              <option value="جزاء">جزاء إداري</option>
              <option value="خصم">خصم مالي</option>
              <option value="تأخير وانصراف مبكر">تأخير وانصراف مبكر</option>
              <option value="غياب">غيابات وامتناع</option>
              <option value="خصم سلف">أقساط سلف مستردة</option>
            </select>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('الكل');
                setDeductionType('الكل');
                setDateRangeMode('this_month');
              }}
              variant="ghost"
              className="h-11 px-4 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
            >
              <RefreshCw size={14} className="ml-2" />
              إعادة تهيئة التصفية
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">إجمالي الاستقطاعات الكلية</p>
            <p className="text-3xl font-black font-mono text-red-600">{stats.total.toLocaleString()} <span className="text-xs">ج.م</span></p>
            <p className="text-[10px] text-slate-400">للفترة والفلترة المحددة</p>
          </div>
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <TrendingDown size={28} />
          </div>
          <span className="absolute bottom-0 right-0 left-0 h-1 bg-red-500" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">الجزاءات والخصومات المباشرة</p>
            <p className="text-3xl font-black font-mono text-rose-600">{stats.penalties.toLocaleString()} <span className="text-xs">ج.م</span></p>
            <p className="text-[10px] text-slate-400">عقوبات إدارية مسجلة</p>
          </div>
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <span className="absolute bottom-0 right-0 left-0 h-1 bg-rose-500" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">خصومات الزمن (تأخير وغياب)</p>
            <p className="text-3xl font-black font-mono text-amber-600">{(stats.attendance + stats.absences).toLocaleString()} <span className="text-xs">ج.م</span></p>
            <p className="text-[10px] text-slate-400">تأخير: {stats.attendance.toLocaleString()} | غياب: {stats.absences.toLocaleString()}</p>
          </div>
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock size={28} />
          </div>
          <span className="absolute bottom-0 right-0 left-0 h-1 bg-amber-500" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">الموظفون المستقطع منهم</p>
            <p className="text-3xl font-black text-blue-900">{stats.employeesCount} <span className="text-sm font-bold text-slate-400">عمال</span></p>
            <p className="text-[10px] text-slate-400">بنسبة {employees.length > 0 ? Math.round((stats.employeesCount / employees.length) * 100) : 0}% من القوة العاملة</p>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center">
            <User size={28} />
          </div>
          <span className="absolute bottom-0 right-0 left-0 h-1 bg-blue-900" />
        </div>
      </div>

      {/* Analytics Charts & Reason Breakdown (Visual Audit) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Right side: Detailed Table log */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black text-lg text-slate-800">بيان تفصيلي بقرارات وحالات الاستقطاع المالي</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">تتبع دقيق وشامل للتاريخ، السبب، والمستند المرجعي للخصم</CardDescription>
              </div>
              <Badge variant="outline" className="font-black text-xs px-3 py-1.5 text-red-600 bg-red-50 border-red-100">
                {filteredEvents.length} سجل استقطاع
              </Badge>
            </CardHeader>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/20 hover:bg-transparent">
                    <TableHead className="font-black text-slate-800 text-right w-[180px]">الموظف</TableHead>
                    <TableHead className="font-black text-slate-800 text-right w-[110px]">تاريخ الحدث</TableHead>
                    <TableHead className="font-black text-slate-800 text-right w-[120px]">نوع الخصم</TableHead>
                    <TableHead className="font-black text-slate-800 text-right">السبب الحقيقي والتفاصيل</TableHead>
                    <TableHead className="font-black text-slate-800 text-left w-[120px]">المبلغ المستقطع</TableHead>
                    <TableHead className="font-black text-slate-800 text-center w-[120px] print:hidden">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((ev, idx) => (
                    <TableRow key={ev.id || idx} className="hover:bg-slate-50/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-600">
                            {ev.employeeName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-xs leading-tight">{ev.employeeName}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{ev.department}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-600">
                          <Calendar size={12} className="text-slate-400" />
                          {ev.date}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          className={`font-black text-[10px] rounded-lg border-none px-2 py-0.5 ${
                            ev.type === 'جزاء' ? 'bg-red-100 text-red-700' :
                            ev.type === 'خصم' ? 'bg-rose-100 text-rose-700' :
                            ev.type === 'تأخير وانصراف مبكر' ? 'bg-amber-100 text-amber-700' :
                            ev.type === 'غياب' ? 'bg-orange-100 text-orange-700' :
                            'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {ev.type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col max-w-[280px]">
                          <span className="font-bold text-xs text-slate-800 line-clamp-1" title={ev.reason}>
                            {ev.reason}
                          </span>
                          {ev.details && (
                            <span className="text-[10px] text-slate-400 mt-0.5 font-medium block truncate" title={ev.details}>
                              {ev.details}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-left">
                        <span className="font-black font-mono text-sm text-red-600">
                          -{ev.amount.toLocaleString()} ج.م
                        </span>
                      </TableCell>

                      <TableCell className="print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button 
                            onClick={() => printDeductionReceipt(ev)} 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="طباعة سند الخصم"
                          >
                            <Printer size={14} />
                          </Button>
                          <Button 
                            onClick={() => sendWhatsAppNotification(ev)} 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="إرسال إشعار للموظف عبر واتساب"
                          >
                            <MessageSquare size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredEvents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center gap-3 opacity-40">
                          <BarChart3 size={48} className="text-slate-300" />
                          <p className="font-black text-slate-800 text-lg">لم يتم العثور على أي استقطاعات مطابقة</p>
                          <p className="text-xs text-slate-400">تأكد من تعديل تواريخ البحث أو نوعية الخصومات المحددة</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Left side: Advanced charts break down */}
        <div className="lg:col-span-4 space-y-6">
          {/* Chart 1: Proportions by Type */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-5 border-b border-slate-100">
              <CardTitle className="font-black text-sm text-slate-800">توزيع الخصومات حسب بند الاستقطاع</CardTitle>
              <CardDescription className="text-[11px] text-slate-400">مقارنة بصرية لمعرفة أين تذهب المستقطعات وأيها الأكبر</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {categoryChartData.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} ج.م`, 'القيمة المستقطعة']}
                          contentStyle={{ direction: 'rtl', textAlign: 'right', fontSize: '11px', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend lists */}
                  <div className="space-y-2">
                    {categoryChartData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-md" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-800">{item.value.toLocaleString()} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-300 font-bold text-xs">
                  لا تتوفر بيانات كافية للرسم البياني
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Top Employees penalized */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-5 border-b border-slate-100">
              <CardTitle className="font-black text-sm text-slate-800">أعلى 5 موظفين استقطاعاً (بالقيمة)</CardTitle>
              <CardDescription className="text-[11px] text-slate-400">تحديد العمال الأكثر خصوماً للمراجعة الفنية والسلوكية</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {topEmployeesChartData.length > 0 ? (
                <div className="space-y-4">
                  {topEmployeesChartData.map((emp, index) => {
                    const percentage = Math.round((emp.amount / stats.total) * 100);
                    return (
                      <div key={emp.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                          <span>{emp.name}</span>
                          <span className="font-mono text-red-600">{emp.amount.toLocaleString()} ج.م ({percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full" 
                            style={{ width: `${Math.min(100, percentage || 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-300 font-bold text-xs">
                  لا توجد بيانات متاحة حالياً
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
