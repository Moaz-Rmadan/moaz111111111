import React, { useState, useMemo } from 'react';
import { 
  Car, Fuel, Wrench, Droplets, Calendar, TrendingUp, Plus, Search, 
  Trash2, Edit2, Download, AlertTriangle, CheckCircle2, MoreHorizontal,
  ChevronLeft, Gauge, FileText, Settings, ArrowUpRight, ArrowDownRight,
  Filter, History, Truck, PieChart as PieChartIcon, Activity, BarChart3,
  Clock, ShieldCheck
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, 
  increment, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { format, differenceInDays, isAfter, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Vehicle, VehicleExpense, Employee, Safe, Supplier } from '../types';
import { NumberDisplay, forceEnglishDigits } from '../lib/numberUtils';
import * as XLSX from 'xlsx';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  expenses: VehicleExpense[];
  employees: Employee[];
  safes: Safe[];
  suppliers: Supplier[];
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export const VehiclesView: React.FC<VehiclesViewProps> = ({ 
  vehicles, 
  expenses, 
  employees,
  safes,
  suppliers
}) => {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const drivers = useMemo(() => employees.filter(e => 
    e.position.includes('سائق') || e.department === 'الحركة' || e.department === 'النقل'
  ), [employees]);

  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    plateNumber: '',
    type: 'شاحنة',
    brand: '',
    modelYear: new Date().getFullYear(),
    driverId: '',
    status: 'نشط',
    licenseExpiryDate: format(new Date(), 'yyyy-MM-dd'),
    insuranceExpiryDate: format(new Date(), 'yyyy-MM-dd'),
    inspectionExpiryDate: format(new Date(), 'yyyy-MM-dd'),
    odometerReading: 0,
    maintenanceInterval: 5000,
    lastMaintenanceOdometer: 0,
    notes: ''
  });

  const [expenseForm, setExpenseForm] = useState<Partial<VehicleExpense>>({
    vehicleId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'بنزين',
    amount: 0,
    fuelQuantity: 0,
    odometerReading: 0,
    description: '',
    safeId: safes[0]?.id || '',
    supplierId: ''
  });

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    if (selectedVehicleId) {
      filtered = filtered.filter(e => e.vehicleId === selectedVehicleId);
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedVehicleId]);

  // Dashboard Calculations
  const dashboardData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), i);
      return {
        month: forceEnglishDigits(format(d, 'MMM yyyy', { locale: ar })),
        fuel: 0,
        maintenance: 0,
        other: 0,
        timestamp: d
      };
    }).reverse();

    expenses.forEach(e => {
      const expenseDate = new Date(e.date);
      const monthIdx = last6Months.findIndex(m => 
        expenseDate.getMonth() === m.timestamp.getMonth() && 
        expenseDate.getFullYear() === m.timestamp.getFullYear()
      );
      if (monthIdx !== -1) {
        if (e.type === 'بنزين' || e.type === 'سولار') last6Months[monthIdx].fuel += e.amount;
        else if (e.type === 'صيانة' || e.type === 'زيت') last6Months[monthIdx].maintenance += e.amount;
        else last6Months[monthIdx].other += e.amount;
      }
    });

    const categoryData = [
      { name: 'وقود', value: expenses.filter(e => e.type === 'بنزين' || e.type === 'سولار').reduce((sum, e) => sum + e.amount, 0) },
      { name: 'صيانة', value: expenses.filter(e => e.type === 'صيانة').reduce((sum, e) => sum + e.amount, 0) },
      { name: 'زيوت', value: expenses.filter(e => e.type === 'زيت').reduce((sum, e) => sum + e.amount, 0) },
      { name: 'تراخيص', value: expenses.filter(e => e.type === 'رخصة').reduce((sum, e) => sum + e.amount, 0) },
      { name: 'أخرى', value: expenses.filter(e => e.type === 'أخرى').reduce((sum, e) => sum + e.amount, 0) },
    ].filter(c => c.value > 0);

    return { last6Months, categoryData };
  }, [expenses]);

  const stats = useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const activeCount = vehicles.filter(v => v.status === 'نشط').length;
    const maintenanceAlerts = vehicles.filter(v => {
      if (!v.maintenanceInterval || !v.lastMaintenanceOdometer) return false;
      const kmSinceMaintenance = v.odometerReading - v.lastMaintenanceOdometer;
      return kmSinceMaintenance >= v.maintenanceInterval - 500; // Alert 500km before
    }).length;

    const documentAlerts = vehicles.filter(v => {
      const now = new Date();
      return (
        differenceInDays(new Date(v.licenseExpiryDate), now) < 15 ||
        (v.inspectionExpiryDate && differenceInDays(new Date(v.inspectionExpiryDate), now) < 15)
      );
    }).length;
    
    return { totalSpent, activeCount, maintenanceAlerts, documentAlerts };
  }, [expenses, vehicles]);

  // Fuel Efficiency Calculation
  const getEfficiency = (vehicleId: string) => {
    const vExpenses = expenses
      .filter(e => e.vehicleId === vehicleId && (e.type === 'بنزين' || e.type === 'سولار') && e.fuelQuantity && e.fuelQuantity > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (vExpenses.length < 2) return null;

    const first = vExpenses[0];
    const last = vExpenses[vExpenses.length - 1];
    
    if (!first.odometerReading || !last.odometerReading) return null;

    const totalDistance = last.odometerReading - first.odometerReading;
    const totalFuel = vExpenses.slice(1).reduce((sum, e) => sum + (e.fuelQuantity || 0), 0);

    if (totalDistance <= 0 || totalFuel <= 0) return null;

    return (totalDistance / totalFuel).toFixed(2); // KM per Litre
  };

  const handleAddVehicle = async () => {
    try {
      const driver = drivers.find(d => d.id === vehicleForm.driverId);
      const data = {
        ...vehicleForm,
        driverName: driver?.name || '',
        updatedAt: serverTimestamp(),
        createdAt: editingVehicle ? vehicleForm.createdAt : format(new Date(), 'yyyy-MM-dd HH:mm')
      };
      
      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), data);
      } else {
        await addDoc(collection(db, 'vehicles'), data);
      }
      
      setShowAddVehicle(false);
      setEditingVehicle(null);
      setVehicleForm({
        plateNumber: '',
        type: 'شاحنة',
        brand: '',
        modelYear: new Date().getFullYear(),
        driverId: '',
        status: 'نشط',
        licenseExpiryDate: format(new Date(), 'yyyy-MM-dd'),
        insuranceExpiryDate: format(new Date(), 'yyyy-MM-dd'),
        inspectionExpiryDate: format(new Date(), 'yyyy-MM-dd'),
        odometerReading: 0,
        maintenanceInterval: 5000,
        lastMaintenanceOdometer: 0,
        notes: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.vehicleId || !expenseForm.amount || expenseForm.amount <= 0) {
      alert('يرجى اختيار السيارة وإدخال مبلغ صحيح');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      const vehicle = vehicles.find(v => v.id === expenseForm.vehicleId);
      const supplier = suppliers.find(s => s.id === expenseForm.supplierId);
      
      // 1. Add expense record
      const expenseRef = doc(collection(db, 'vehicleExpenses'));
      const expenseData = {
        ...expenseForm,
        createdBy: 'system',
        createdAt: serverTimestamp()
      };
      batch.set(expenseRef, expenseData);
      
      // 2. Financial Logic
      const description = `مصروف سيارة (${vehicle?.plateNumber})${supplier ? ` - مورد: ${supplier.name}` : ''} - ${expenseForm.type}: ${expenseForm.description}`;

      // A. If paid from safe
      if (expenseForm.safeId && expenseForm.safeId !== 'none') {
        const txRef = doc(collection(db, 'safeTransactions'));
        batch.set(txRef, {
          safeId: expenseForm.safeId,
          type: 'مصروفات',
          amount: expenseForm.amount,
          date: expenseForm.date,
          description: description,
          category: 'مصاريف سيارات',
          relatedId: expenseRef.id,
          createdBy: 'system'
        });
        
        batch.update(doc(db, 'safes', expenseForm.safeId), {
          balance: increment(-expenseForm.amount)
        });

        // If also linked to supplier, we record it as a purchase and immediate payment
        if (expenseForm.supplierId && expenseForm.supplierId !== 'none') {
          const supInvRef = doc(collection(db, 'supplierTransactions'));
          batch.set(supInvRef, {
            supplierId: expenseForm.supplierId,
            type: 'فاتورة',
            amount: expenseForm.amount,
            date: expenseForm.date,
            description: `فاتورة خدمة سيارة (${vehicle?.plateNumber}) - مسددة نقداً`,
            relatedId: expenseRef.id,
            createdBy: 'system',
            createdAt: serverTimestamp()
          });

          const supPayRef = doc(collection(db, 'supplierTransactions'));
          batch.set(supPayRef, {
            supplierId: expenseForm.supplierId,
            type: 'دفع',
            amount: expenseForm.amount,
            date: expenseForm.date,
            description: `سداد فاتورة خدمة سيارة (${vehicle?.plateNumber})`,
            relatedId: expenseRef.id,
            createdBy: 'system',
            createdAt: serverTimestamp()
          });
          // Balance doesn't change because it's paid immediately
        }
      } 
      // B. If On Account (Supplier Only)
      else if (expenseForm.supplierId && expenseForm.supplierId !== 'none') {
        const supTxRef = doc(collection(db, 'supplierTransactions'));
        batch.set(supTxRef, {
          supplierId: expenseForm.supplierId,
          type: 'فاتورة',
          amount: expenseForm.amount,
          date: expenseForm.date,
          description: description,
          relatedId: expenseRef.id,
          createdBy: 'system',
          createdAt: serverTimestamp()
        });
        
        batch.update(doc(db, 'suppliers', expenseForm.supplierId), {
          balance: increment(expenseForm.amount)
        });
      }
      
      // 3. Vehicle Updates
      if (expenseForm.odometerReading && expenseForm.odometerReading > 0) {
        const vehicleUpdates: any = { odometerReading: expenseForm.odometerReading };
        // Update last maintenance if type is Maintenance or Oil
        if (expenseForm.type === 'صيانة' || expenseForm.type === 'زيت') {
           vehicleUpdates.lastMaintenanceOdometer = expenseForm.odometerReading;
        }
        batch.update(doc(db, 'vehicles', expenseForm.vehicleId), vehicleUpdates);
      }
      
      await batch.commit();
      setShowAddExpense(false);
      setExpenseForm({
        vehicleId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'بنزين',
        amount: 0,
        fuelQuantity: 0,
        odometerReading: 0,
        description: '',
        safeId: safes[0]?.id || '',
        supplierId: ''
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleExportExpenses = () => {
    const data = filteredExpenses.map(e => {
      const vehicle = vehicles.find(v => v.id === e.vehicleId);
      return {
        'التاريخ': e.date,
        'السيارة': vehicle?.plateNumber || '',
        'النوع': e.type,
        'المبلغ': e.amount,
        'الكمية (لتر)': e.fuelQuantity || '',
        'قراءة العداد': e.odometerReading || '',
        'البيان': e.description
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "Fleet_Expenditure_Report.xlsx");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-primary/10 rounded-[14px] flex items-center justify-center text-primary">
             <Truck size={32} strokeWidth={2.5} />
           </div>
           <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">إدارة أسطول النقل</h2>
            <p className="text-slate-500 font-bold mt-1">الرقابة المتكاملة على المركبات، الوقود، والصيانات الدورية</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button onClick={() => setShowAddVehicle(true)} className="btn-primary flex-1 md:flex-none rounded-[14px] h-12 px-6 shadow-lg shadow-primary/20">
            <Plus size={18} className="ml-2" />
            إضافة مركبة
          </Button>
          <Button onClick={() => setShowAddExpense(true)} variant="outline" className="flex-1 md:flex-none h-12 px-6 rounded-[14px] border-slate-200 font-bold bg-white hover:bg-slate-50">
            <Fuel size={18} className="ml-2 text-primary" />
            تسجيل مصروف
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-[14px] flex items-center justify-center transition-colors">
                <Truck className="text-blue-600" size={24} />
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-none font-bold">الأسطول</Badge>
            </div>
            <div className="mt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي المركبات</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-slate-900">{vehicles.length}</p>
                <span className="text-sm font-bold text-slate-500">منها {stats.activeCount} نشط</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-red-50 group-hover:bg-red-100 rounded-[14px] flex items-center justify-center transition-colors">
                <Wrench className="text-red-600" size={24} />
              </div>
              <Badge className="bg-red-50 text-red-700 border-none font-bold">تنبيهات الصيانة</Badge>
            </div>
            <div className="mt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">صيانات مستحقة</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-slate-900">{stats.maintenanceAlerts}</p>
                <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                   سيارات تحتاج صيانة فورية
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-amber-50 group-hover:bg-amber-100 rounded-[14px] flex items-center justify-center transition-colors">
                <ShieldCheck className="text-amber-600" size={24} />
              </div>
              <Badge className="bg-amber-50 text-amber-700 border-none font-bold">أوراق ثبوتية</Badge>
            </div>
            <div className="mt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تراخيص توشك على الانتهاء</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-slate-900">{stats.documentAlerts}</p>
                <span className="text-xs font-bold text-amber-600 italic">خلال 15 يوماً</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-emerald-50 group-hover:bg-emerald-100 rounded-[14px] flex items-center justify-center transition-colors">
                <Activity className="text-emerald-600" size={24} />
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold">تحليل التكاليف</Badge>
            </div>
            <div className="mt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي المصاريف</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-black text-slate-900"><NumberDisplay value={stats.totalSpent} /></p>
                <span className="text-xs font-bold text-slate-500">ج.م</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start gap-2 bg-transparent p-0 mb-6 border-b border-slate-200 h-auto">
          <TabsTrigger value="dashboard" className="px-6 py-3 font-black text-sm data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
            <BarChart3 size={16} className="ml-2" />
            لوحة المعلومات
          </TabsTrigger>
          <TabsTrigger value="fleet" className="px-6 py-3 font-black text-sm data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
            <Truck size={16} className="ml-2" />
            قائمة المركبات
          </TabsTrigger>
          <TabsTrigger value="expenses" className="px-6 py-3 font-black text-sm data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none">
            <History size={16} className="ml-2" />
            سجل المصاريف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Activity size={20} className="text-primary" />
                  تحليل المصاريف الشهرية (آخر 6 أشهر)
                </CardTitle>
                <CardDescription className="font-bold">مقارنة بين الوقود والصيانة والمصاريف الأخرى</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.last6Months}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                      itemStyle={{ fontWeight: 800 }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="fuel" name="وقود" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="maintenance" name="صيانة" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="other" name="أخرى" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <PieChartIcon size={20} className="text-primary" />
                  توزيع بنود الصرف
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px] flex flex-col items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dashboardData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                       itemStyle={{ fontWeight: 800 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-xs font-black text-slate-400 uppercase">الإجمالي</p>
                  <p className="text-xl font-black text-slate-900">{stats.totalSpent.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-500">ج.م</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 w-full px-4">
                  {dashboardData.categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-bold text-slate-600">{c.name}</span>
                      <span className="text-xs font-black text-slate-900 mr-auto">{((c.value / stats.totalSpent) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {vehicles.filter(v => {
                const kmSince = v.odometerReading - (v.lastMaintenanceOdometer || 0);
                return v.maintenanceInterval && kmSince >= v.maintenanceInterval - 500;
             }).map(v => (
               <Card key={v.id} className="border-none shadow-sm bg-red-50/50 border border-red-100 overflow-hidden animate-pulse">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-red-600">صيانة عاجلة</p>
                      <p className="text-sm font-black text-slate-900">{v.plateNumber}</p>
                      <p className="text-[10px] font-bold text-slate-500">تجاوزت المسافة المقررة</p>
                    </div>
                  </CardContent>
               </Card>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="mt-0 space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="بحث برقم اللوحة، الماركة، أو اسم السائق..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-12 h-12 rounded-[14px] border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" className="h-12 w-12 p-0 rounded-[14px] border-slate-100">
                 <Filter size={18} />
               </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map(vehicle => {
              const now = new Date();
              const licenseDays = differenceInDays(new Date(vehicle.licenseExpiryDate), now);
              const inspectionDays = vehicle.inspectionExpiryDate ? differenceInDays(new Date(vehicle.inspectionExpiryDate), now) : null;
              
              const kmSinceMaintenance = vehicle.odometerReading - (vehicle.lastMaintenanceOdometer || 0);
              const maintenanceProgress = vehicle.maintenanceInterval ? Math.min((kmSinceMaintenance / vehicle.maintenanceInterval) * 100, 100) : 0;
              
              const efficiency = getEfficiency(vehicle.id);

              return (
                <Card key={vehicle.id} className="border-none shadow-md hover:shadow-xl transition-all group overflow-hidden bg-white flex flex-col h-full">
                  <div className={`h-1.5 w-full ${
                    vehicle.status === 'نشط' ? 'bg-emerald-500' : 
                    vehicle.status === 'في الصيانة' ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 group-hover:bg-primary/5 rounded-[14px] flex items-center justify-center text-slate-600 group-hover:text-primary transition-colors">
                          <Car size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-black text-slate-900 font-mono">
                            {forceEnglishDigits(vehicle.plateNumber)}
                          </CardTitle>
                          <CardDescription className="font-bold flex items-center gap-1">
                            {vehicle.brand} <span className="text-slate-300">|</span> {vehicle.type}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        vehicle.status === 'نشط' ? 'bg-emerald-50 text-emerald-700 border-none font-bold' : 
                        vehicle.status === 'في الصيانة' ? 'bg-amber-50 text-amber-700 border-none font-bold' : 
                        'bg-slate-100 text-slate-600 border-none font-bold'
                      }>
                        {vehicle.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-[14px] border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">السائق المسؤول</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5 truncate">{vehicle.driverName || 'غير محدد'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-[14px] border border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">قراءة العداد</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Gauge size={12} className="text-primary" />
                          <p className="text-sm font-black text-slate-900 font-mono tracking-tight">{vehicle.odometerReading.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-slate-400">كم</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-1">
                       <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase">
                            <span>دورة الصيانة (الزيت)</span>
                            <span className={`font-mono ${maintenanceProgress > 90 ? 'text-red-600' : 'text-slate-900'}`}>
                              {kmSinceMaintenance.toLocaleString()} / {vehicle.maintenanceInterval?.toLocaleString()} كم
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-200 ${
                                maintenanceProgress > 90 ? 'bg-red-500' : 
                                maintenanceProgress > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${maintenanceProgress}%` }}
                            />
                          </div>
                       </div>

                       <div className="flex flex-wrap gap-2 pt-2">
                          <div className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black flex items-center gap-1.5 ${
                            licenseDays < 15 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'
                          }`}>
                            <ShieldCheck size={12} />
                            رخصة: {licenseDays} يوم
                          </div>
                          {inspectionDays !== null && (
                            <div className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black flex items-center gap-1.5 ${
                              inspectionDays < 15 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600'
                            }`}>
                              <Wrench size={12} />
                              فحص: {inspectionDays} يوم
                            </div>
                          )}
                          {efficiency && (
                            <div className="px-2.5 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 text-[10px] font-black flex items-center gap-1.5">
                              <Fuel size={12} />
                              كفاءة: {efficiency} كم/لتر
                            </div>
                          )}
                       </div>
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0 mt-auto border-t border-slate-50 flex items-center gap-2 bg-slate-50/30">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 rounded-xl h-10 font-bold hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id);
                        setActiveSubTab('expenses');
                      }}
                    >
                      <History size={16} />
                      التفاصيل
                    </Button>
                    <div className="h-6 w-[1px] bg-slate-200" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-blue-50 text-blue-600"
                      onClick={() => {
                        setEditingVehicle(vehicle);
                        setVehicleForm(vehicle);
                        setShowAddVehicle(true);
                      }}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-600"
                      onClick={async () => {
                        if (window.confirm('هل أنت متأكد من حذف هذه المركبة وكل بياناتها؟')) {
                          await deleteDoc(doc(db, 'vehicles', vehicle.id));
                        }
                      }}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select value={selectedVehicleId || 'all'} onValueChange={v => setSelectedVehicleId(v === 'all' ? null : v)}>
                <SelectTrigger className="w-full md:w-[280px] h-12 rounded-[14px] border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="تصفية حسب المركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل أسطول النقل</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plateNumber} - {v.brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVehicleId && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedVehicleId(null)} className="h-12 rounded-[14px] text-red-500 font-black">إلغاء</Button>
              )}
            </div>
            <div className="flex items-center gap-3">
               <Button onClick={handleExportExpenses} variant="outline" className="h-12 px-6 rounded-[14px] border-slate-200 font-bold bg-white">
                <Download size={18} className="ml-2" />
                تصدير إكسيل
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden bg-white rounded-3xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="h-16 border-none">
                    <TableHead className="text-right font-black text-slate-900 px-8">التاريخ</TableHead>
                    <TableHead className="text-right font-black text-slate-900">المركبة</TableHead>
                    <TableHead className="text-right font-black text-slate-900">نوع المصروف</TableHead>
                    <TableHead className="text-right font-black text-slate-900">المورد</TableHead>
                    <TableHead className="text-right font-black text-slate-900">المبلغ</TableHead>
                    <TableHead className="text-right font-black text-slate-900">الكمية</TableHead>
                    <TableHead className="text-right font-black text-slate-900">العداد</TableHead>
                    <TableHead className="text-right font-black text-slate-900">البيان / التفاصيل</TableHead>
                    <TableHead className="text-left font-black text-slate-900 px-8">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map(expense => {
                    const vehicle = vehicles.find(v => v.id === expense.vehicleId);
                    return (
                      <TableRow key={expense.id} className="h-20 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                        <TableCell className="px-8 font-bold text-slate-600">{expense.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                              <Truck size={14} />
                            </div>
                            <span className="font-black text-slate-900">{vehicle?.plateNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {expense.type === 'بنزين' || expense.type === 'سولار' ? <Fuel size={14} className="text-emerald-500" /> :
                             expense.type === 'صيانة' ? <Wrench size={14} className="text-orange-500" /> :
                             expense.type === 'زيت' ? <Droplets size={14} className="text-blue-500" /> :
                             <Settings size={14} className="text-slate-400" />}
                            <span className="font-black text-slate-900">{expense.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-600">
                            {suppliers.find(s => s.id === expense.supplierId)?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="font-black text-primary">
                          <NumberDisplay value={expense.amount} /> <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                        </TableCell>
                        <TableCell className="font-bold text-slate-600">
                          {expense.fuelQuantity ? `${expense.fuelQuantity} لتر` : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {expense.odometerReading ? `${expense.odometerReading.toLocaleString()} كم` : '-'}
                        </TableCell>
                        <TableCell className="text-slate-500 font-bold max-w-[250px] truncate">{expense.description}</TableCell>
                        <TableCell className="px-8">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-red-600 hover:bg-red-50 rounded-xl"
                            onClick={async () => {
                              if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم حذف الحركة المالية المرتبطة أيضاً.')) {
                                const batch = writeBatch(db);
                                batch.delete(doc(db, 'vehicleExpenses', expense.id));
                                if (expense.safeTransactionId) {
                                  batch.delete(doc(db, 'safeTransactions', expense.safeTransactionId));
                                }
                                // Refund safe balance logic should go here if needed
                                await batch.commit();
                              }
                            }}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 text-slate-300">
                           <History size={48} />
                           <p className="font-black text-xl">لا توجد مصاريف مسجلة لهذه الفئة</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms stay similar but enhanced */}
      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent className="sm:max-w-[700px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-[14px] flex items-center justify-center">
                <Car size={24} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">{editingVehicle ? 'تعديل بيانات المركبة' : 'إضافة مركبة جديدة للأسطول'}</DialogTitle>
                <p className="text-slate-400 font-bold text-sm mt-1">أدخل البيانات الأساسية ومواعيد التراخيص</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">رقم اللوحة</label>
              <Input 
                value={vehicleForm.plateNumber}
                onChange={e => setVehicleForm({...vehicleForm, plateNumber: e.target.value})}
                placeholder="أ ب ج 123"
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">نوع المركبة</label>
              <Select value={vehicleForm.type} onValueChange={v => setVehicleForm({...vehicleForm, type: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="شاحنة جامبو">شاحنة جامبو</SelectItem>
                  <SelectItem value="ربع نقل">ربع نقل</SelectItem>
                  <SelectItem value="ملاكي">ملاكي</SelectItem>
                  <SelectItem value="موتوسيكل">موتوسيكل</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الماركة / الموديل</label>
              <Input 
                value={vehicleForm.brand}
                onChange={e => setVehicleForm({...vehicleForm, brand: e.target.value})}
                placeholder="مثال: شيفروليه دبابة 2022"
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">السائق المسؤول</label>
              <Select 
                value={vehicleForm.driverId || ''} 
                onValueChange={v => {
                  const drv = employees.find(e => e.id === v);
                  setVehicleForm({
                    ...vehicleForm, 
                    driverId: v,
                    driverName: drv ? drv.name : (vehicleForm.driverName || '')
                  });
                }}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue>
                    {vehicleForm.driverName || (employees.find(e => e.id === vehicleForm.driverId)?.name) || 'اختر السائق'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} {d.position ? `(${d.position})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-[1px] bg-slate-100 col-span-2 my-2" />
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">انتهاء الرخصة</label>
              <Input 
                type="date"
                value={vehicleForm.licenseExpiryDate}
                onChange={e => setVehicleForm({...vehicleForm, licenseExpiryDate: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">انتهاء الفحص الفني</label>
              <Input 
                type="date"
                value={vehicleForm.inspectionExpiryDate}
                onChange={e => setVehicleForm({...vehicleForm, inspectionExpiryDate: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="h-[1px] bg-slate-100 col-span-2 my-2" />
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">عداد الكيلومتر الحالي</label>
              <Input 
                type="number"
                value={vehicleForm.odometerReading}
                onChange={e => setVehicleForm({...vehicleForm, odometerReading: Number(e.target.value)})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">دورة الصيانة (كل كم كم؟)</label>
              <Input 
                type="number"
                value={vehicleForm.maintenanceInterval}
                onChange={e => setVehicleForm({...vehicleForm, maintenanceInterval: Number(e.target.value)})}
                placeholder="مثال: 5000"
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowAddVehicle(false)} className="font-bold text-slate-500 hover:text-slate-900">إلغاء</Button>
            <Button onClick={handleAddVehicle} className="btn-primary rounded-[14px] h-12 px-10 shadow-lg shadow-primary/20">حفظ البيانات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="sm:max-w-[700px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-emerald-600 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-[14px] flex items-center justify-center backdrop-blur-md">
                <Fuel size={32} strokeWidth={2.5} />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">تسجيل مصروف / وقود / صيانة</DialogTitle>
                <p className="text-emerald-100 font-bold text-sm mt-1">إدارة التكاليف التشغيلية للمركبة وربطها بالخزن والموردين</p>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-y-auto max-h-[70vh]">
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">المركبة المستهدفة</label>
              <Select value={expenseForm.vehicleId} onValueChange={v => setExpenseForm({...expenseForm, vehicleId: v})}>
                <SelectTrigger className="h-14 rounded-[14px] bg-slate-50 border-slate-100 focus:bg-white font-black text-slate-900">
                  <SelectValue placeholder="اختر السيارة من الأسطول" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id} className="font-bold">{v.plateNumber} ({v.brand})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">نوع المصروف</label>
              <Select value={expenseForm.type} onValueChange={v => setExpenseForm({...expenseForm, type: v as any})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="بنزين">وقود (بنزين/سولار)</SelectItem>
                  <SelectItem value="زيت">تغيير زيت</SelectItem>
                  <SelectItem value="صيانة">صيانة وإصلاح</SelectItem>
                  <SelectItem value="رخصة">تراخيص ورسوم</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">تاريخ العملية</label>
              <Input 
                type="date"
                value={expenseForm.date}
                onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold text-right"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">المورد / الجهة (اختياري)</label>
              <Select value={expenseForm.supplierId || 'none'} onValueChange={v => setExpenseForm({...expenseForm, supplierId: v === 'none' ? '' : v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مورد (شراء مباشر)</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">طريقة السداد</label>
              <Select value={expenseForm.safeId || 'none'} onValueChange={v => setExpenseForm({...expenseForm, safeId: v === 'none' ? '' : v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                  <SelectValue placeholder="اختر طريقة السداد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">آجل (على حساب المورد)</SelectItem>
                  {safes.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.balance.toLocaleString()} ج.م)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(expenseForm.type === 'بنزين' || expenseForm.type === 'سولار') && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الكمية (باللتر)</label>
                <Input 
                  type="number"
                  value={expenseForm.fuelQuantity}
                  onChange={e => setExpenseForm({...expenseForm, fuelQuantity: Number(e.target.value)})}
                  placeholder="عدد اللترات"
                  className="h-12 rounded-xl bg-emerald-50/50 border-emerald-100 focus:bg-white font-black text-emerald-700"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">إجمالي المبلغ</label>
              <Input 
                type="number"
                value={expenseForm.amount}
                onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-black text-primary text-lg"
              />
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">قراءة العداد (كم)</label>
              <Input 
                type="number"
                value={expenseForm.odometerReading}
                onChange={e => setExpenseForm({...expenseForm, odometerReading: Number(e.target.value)})}
                placeholder="قراءة العداد الحالية"
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">البيان / تفاصيل العملية</label>
              <Input 
                value={expenseForm.description}
                onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="مثال: غيار زيت كاسترول 5000 كم + فلتر هواء"
                className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowAddExpense(false)} className="font-black text-slate-500 hover:text-slate-900">إلغاء</Button>
            <Button onClick={handleAddExpense} className="btn-primary bg-emerald-600 hover:bg-emerald-700 rounded-[14px] h-14 px-12 text-lg font-black shadow-lg shadow-emerald-200">
              تأكيد وتسجيل المصروف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
