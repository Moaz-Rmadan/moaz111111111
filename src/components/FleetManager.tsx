import React, { useState, useMemo } from 'react';
import { 
  Truck, Fuel, Wrench, Settings, Plus, Search, Filter, 
  AlertTriangle, CheckCircle, Clock, Calendar, MapPin, User, 
  FileText, Activity, Droplets, CreditCard, Gauge, ShieldCheck, 
  History, Edit2, Trash2, Printer, Eye, X, ChevronRight, 
  RefreshCw, Download, AlertCircle, CheckCircle2, MoreHorizontal,
  TrendingUp, ExternalLink
} from 'lucide-react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Vehicle, VehicleExpense, Employee, Safe, Supplier } from '../types';
import { db } from '../firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, 
  increment, writeBatch 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { NumberDisplay } from '../lib/numberUtils';
import { cn } from '@/lib/utils';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface FleetManagerProps {
  vehicles?: Vehicle[];
  expenses?: VehicleExpense[];
  employees?: Employee[];
  safes?: Safe[];
  suppliers?: Supplier[];
}

// Default / Sample Fleet Vehicles when database is empty
const SAMPLE_VEHICLES: Vehicle[] = [
  {
    id: 'veh-01',
    plateNumber: 'ب ط ص 8124',
    brand: 'ايسوزو جامبو 7000',
    type: 'شاحنة نقل ثقيل',
    modelYear: 2023,
    driverId: 'emp-d1',
    driverName: 'أحمد مصطفى حسن',
    status: 'نشط',
    licenseExpiryDate: '2026-11-15',
    insuranceExpiryDate: '2026-12-01',
    inspectionExpiryDate: '2026-10-10',
    odometerReading: 124500,
    lastMaintenanceOdometer: 120000,
    maintenanceInterval: 5000,
    notes: 'مخصصة لشحن طلبيات المعارض الكبيرة وحمولات المصنع الرئيسي',
    createdAt: '2025-01-10'
  },
  {
    id: 'veh-02',
    plateNumber: 'ع ج د 3591',
    brand: 'شيفروليه الدينا D-Max',
    type: 'دينا نقل متوسط',
    modelYear: 2022,
    driverId: 'emp-d2',
    driverName: 'إبراهيم علي عبد الله',
    status: 'نشط',
    licenseExpiryDate: '2026-08-05',
    insuranceExpiryDate: '2026-09-20',
    inspectionExpiryDate: '2026-08-10',
    odometerReading: 89200,
    lastMaintenanceOdometer: 84000, // 5200 km -> Maintenance overdue!
    maintenanceInterval: 5000,
    notes: 'مخصصة لنقل الغرف الجاهزة والانتريهات للعملاء وتوصيل المبيعات',
    createdAt: '2025-02-15'
  },
  {
    id: 'veh-03',
    plateNumber: 'م ط ر 4210',
    brand: 'تويوتا هيلوكس',
    type: 'وانيت خدمة سريعة',
    modelYear: 2024,
    driverId: 'emp-d3',
    driverName: 'محمود كمال الشريف',
    status: 'في الصيانة',
    licenseExpiryDate: '2027-03-25',
    insuranceExpiryDate: '2027-04-10',
    inspectionExpiryDate: '2027-02-18',
    odometerReading: 34100,
    lastMaintenanceOdometer: 32000,
    maintenanceInterval: 5000,
    notes: 'تغيير مساعدين وفحمات بقسم الصيانة المركزية',
    createdAt: '2025-04-01'
  },
  {
    id: 'veh-04',
    plateNumber: 'س ن ق 9042',
    brand: 'نيسان صني',
    type: 'سيارة ملاكي إدارية',
    modelYear: 2023,
    driverId: 'emp-d4',
    driverName: 'خالد عبد الوهاب',
    status: 'نشط',
    licenseExpiryDate: '2026-08-12',
    insuranceExpiryDate: '2026-10-30',
    inspectionExpiryDate: '2026-08-01',
    odometerReading: 45600,
    lastMaintenanceOdometer: 43500,
    maintenanceInterval: 5000,
    notes: 'سيارة تحركات إدارة المبيعات ومشرفي المعارض',
    createdAt: '2025-03-20'
  }
];

// Default / Sample Fleet Expenses
const SAMPLE_EXPENSES: VehicleExpense[] = [
  {
    id: 'exp-01',
    vehicleId: 'veh-01',
    date: '2026-07-20',
    type: 'سولار',
    amount: 1850,
    fuelQuantity: 120,
    odometerReading: 124500,
    description: 'تفويل سولار قبل حمولة المعارض الكبيرة',
    createdBy: 'مدير الحركة'
  },
  {
    id: 'exp-02',
    vehicleId: 'veh-02',
    date: '2026-07-18',
    type: 'زيت',
    amount: 2400,
    fuelQuantity: undefined,
    odometerReading: 84000,
    description: 'تغيير زيت شل 10,000 كم + فلتر زيت وفلتر هواء',
    createdBy: 'مهندس الصيانة'
  },
  {
    id: 'exp-03',
    vehicleId: 'veh-03',
    date: '2026-07-15',
    type: 'صيانة',
    amount: 3800,
    fuelQuantity: undefined,
    odometerReading: 34100,
    description: 'تربيط عفشة وتغيير تيل فرامل أمامي وخلفي',
    createdBy: 'ورشة الصيانة'
  },
  {
    id: 'exp-04',
    vehicleId: 'veh-04',
    date: '2026-07-10',
    type: 'بنزين',
    amount: 950,
    fuelQuantity: 60,
    odometerReading: 45600,
    description: 'تفويل بنزين 92 لمشاوير الإدارة',
    createdBy: 'السائق'
  },
  {
    id: 'exp-05',
    vehicleId: 'veh-01',
    date: '2026-07-02',
    type: 'رخصة',
    amount: 4200,
    fuelQuantity: undefined,
    odometerReading: 122000,
    description: 'رسوم تجديد الرخصة والفحص الفني والتأمين الشامل',
    createdBy: 'الشؤون الإدارية'
  }
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export const FleetManager: React.FC<FleetManagerProps> = ({ 
  vehicles = [], 
  expenses = [], 
  employees = [],
  safes = [],
  suppliers = []
}) => {
  // Combine real database with sample fallbacks
  const effectiveVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return SAMPLE_VEHICLES;
    return vehicles;
  }, [vehicles]);

  const effectiveExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return SAMPLE_EXPENSES;
    return expenses;
  }, [expenses]);

  // States
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>('الكل');
  
  // Modals
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showOilResetModal, setShowOilResetModal] = useState(false);
  const [showVehicleDetailsModal, setShowVehicleDetailsModal] = useState(false);
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  // Editing & Selection State
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form State - Add/Edit Vehicle
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    plateNumber: '',
    type: 'شاحنة نقل',
    brand: '',
    modelYear: new Date().getFullYear(),
    driverId: '',
    driverName: '',
    status: 'نشط',
    licenseExpiryDate: new Date().toISOString().split('T')[0],
    insuranceExpiryDate: new Date().toISOString().split('T')[0],
    inspectionExpiryDate: new Date().toISOString().split('T')[0],
    odometerReading: 0,
    maintenanceInterval: 5000,
    lastMaintenanceOdometer: 0,
    notes: ''
  });

  // Form State - Add Expense
  const [expenseForm, setExpenseForm] = useState({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'سولار' as 'بنزين' | 'سولار' | 'زيت' | 'صيانة' | 'رخصة' | 'أخرى',
    amount: 0,
    fuelQuantity: 0,
    odometerReading: 0,
    description: '',
    safeId: safes[0]?.id || '',
    supplierId: ''
  });

  // Form State - Oil Change Reset
  const [oilResetForm, setOilResetForm] = useState({
    vehicleId: '',
    currentOdometer: 0,
    cost: 0,
    oilType: 'زيت 10,000 كم + فلاتر',
    safeId: safes[0]?.id || '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    return effectiveVehicles.filter(v => {
      const matchesSearch = 
        v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.driverName && v.driverName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'الكل' || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [effectiveVehicles, searchTerm, statusFilter]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return effectiveExpenses.filter(exp => {
      const v = effectiveVehicles.find(veh => veh.id === exp.vehicleId);
      const matchesVehicleSearch = !searchTerm || (v && (v.plateNumber.includes(searchTerm) || v.brand.includes(searchTerm)));
      const matchesType = expenseTypeFilter === 'الكل' || exp.type === expenseTypeFilter;
      return matchesVehicleSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [effectiveExpenses, effectiveVehicles, searchTerm, expenseTypeFilter]);

  // Dashboard Metrics & Calculations
  const stats = useMemo(() => {
    const totalVehicles = effectiveVehicles.length;
    const activeVehicles = effectiveVehicles.filter(v => v.status === 'نشط').length;
    const maintenanceVehicles = effectiveVehicles.filter(v => v.status === 'في الصيانة').length;
    const totalSpentMonth = effectiveExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Maintenance / Oil Change Urgent Alerts
    const oilChangeAlerts = effectiveVehicles.filter(v => {
      const kmSince = v.odometerReading - (v.lastMaintenanceOdometer || 0);
      return kmSince >= (v.maintenanceInterval || 5000);
    });

    // License & Insurance Alerts (Expiring within 30 days)
    const today = new Date();
    const licenseAlerts = effectiveVehicles.filter(v => {
      if (!v.licenseExpiryDate) return false;
      const diffDays = Math.ceil((new Date(v.licenseExpiryDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 30;
    });

    return {
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalSpentMonth,
      oilChangeAlerts,
      licenseAlerts
    };
  }, [effectiveVehicles, effectiveExpenses]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {
      'سولار/بنزين': 0,
      'صيانة': 0,
      'زيت': 0,
      'تراخيص': 0,
      'أخرى': 0
    };

    effectiveExpenses.forEach(exp => {
      if (exp.type === 'بنزين' || exp.type === 'سولار') {
        categoriesMap['سولار/بنزين'] += exp.amount;
      } else if (exp.type === 'صيانة') {
        categoriesMap['صيانة'] += exp.amount;
      } else if (exp.type === 'زيت') {
        categoriesMap['زيت'] += exp.amount;
      } else if (exp.type === 'رخصة') {
        categoriesMap['تراخيص'] += exp.amount;
      } else {
        categoriesMap['أخرى'] += exp.amount;
      }
    });

    const categoryPieData = Object.entries(categoriesMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    // Vehicle Expenses Breakdown Bar Chart
    const vehicleBarData = effectiveVehicles.map(v => {
      const totalCost = effectiveExpenses
        .filter(exp => exp.vehicleId === v.id)
        .reduce((sum, exp) => sum + exp.amount, 0);

      return {
        name: v.plateNumber,
        cost: totalCost
      };
    }).filter(v => v.cost > 0);

    return { categoryPieData, vehicleBarData };
  }, [effectiveExpenses, effectiveVehicles]);

  // HANDLERS & ACTIONS
  
  // 1. Save / Update Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.plateNumber || !vehicleForm.brand) {
      alert('يرجى كتابة رقم اللوحة وماركة السيارة على الأقل.');
      return;
    }

    try {
      const selectedDriver = employees.find(emp => emp.id === vehicleForm.driverId);
      const computedDriverName = vehicleForm.driverName || (selectedDriver ? selectedDriver.name : 'غير محدد');

      const vehiclePayload = {
        ...vehicleForm,
        driverId: vehicleForm.driverId || '',
        driverName: computedDriverName,
        modelYear: Number(vehicleForm.modelYear),
        odometerReading: Number(vehicleForm.odometerReading),
        lastMaintenanceOdometer: Number(vehicleForm.lastMaintenanceOdometer || vehicleForm.odometerReading),
        maintenanceInterval: Number(vehicleForm.maintenanceInterval || 5000),
        updatedAt: new Date().toISOString()
      };

      if (editingVehicle && !editingVehicle.id.startsWith('veh-')) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehiclePayload);
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...vehiclePayload,
          createdAt: new Date().toISOString()
        });
      }

      setShowAddVehicleModal(false);
      setEditingVehicle(null);
      resetVehicleForm();
      alert('✅ تم حفظ بيانات السيارة بنجاح.');
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('حدث خطأ أثناء حفظ بيانات السيارة.');
    }
  };

  // 2. Add Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.vehicleId || !expenseForm.amount || expenseForm.amount <= 0) {
      alert('يرجى تحديد السيارة وإدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    try {
      const vehicle = effectiveVehicles.find(v => v.id === expenseForm.vehicleId);
      const expenseDocData = {
        vehicleId: expenseForm.vehicleId,
        date: expenseForm.date,
        type: expenseForm.type,
        amount: Number(expenseForm.amount),
        fuelQuantity: expenseForm.fuelQuantity ? Number(expenseForm.fuelQuantity) : null,
        odometerReading: Number(expenseForm.odometerReading || vehicle?.odometerReading || 0),
        description: expenseForm.description || `مصروف ${expenseForm.type} لسيارة ${vehicle?.plateNumber}`,
        safeId: expenseForm.safeId || null,
        supplierId: expenseForm.supplierId || null,
        createdBy: 'مدير النظام',
        createdAt: serverTimestamp()
      };

      // 1. Add Vehicle Expense Record
      const expRef = await addDoc(collection(db, 'vehicleExpenses'), expenseDocData);

      // 2. Update Vehicle Odometer if input is higher
      if (vehicle && !vehicle.id.startsWith('veh-')) {
        const newOdometer = Math.max(vehicle.odometerReading, Number(expenseForm.odometerReading || 0));
        const updates: any = { odometerReading: newOdometer };

        if (expenseForm.type === 'زيت' || expenseForm.type === 'صيانة') {
          updates.lastMaintenanceOdometer = newOdometer;
        }

        await updateDoc(doc(db, 'vehicles', vehicle.id), updates);
      }

      // 3. Update Safe Balance & Safe Transaction if Safe is selected
      if (expenseForm.safeId && expenseForm.safeId !== 'none') {
        const safeObj = safes.find(s => s.id === expenseForm.safeId);
        await addDoc(collection(db, 'safeTransactions'), {
          safeId: expenseForm.safeId,
          type: 'مصروفات',
          amount: Number(expenseForm.amount),
          date: expenseForm.date,
          description: `مصروف سيارة (${vehicle?.plateNumber || ''}) - ${expenseForm.type}: ${expenseForm.description}`,
          category: 'مصاريف سيارات وأسطول',
          relatedId: expRef.id,
          createdBy: 'مدير الحركة'
        });

        if (safeObj && !safeObj.id.startsWith('safe-')) {
          await updateDoc(doc(db, 'safes', safeObj.id), {
            balance: increment(-Number(expenseForm.amount))
          });
        }
      }

      setShowAddExpenseModal(false);
      resetExpenseForm();
      alert(`✅ تم تسجيل مصروف بقيمة ${expenseForm.amount.toLocaleString('ar-EG')} ج.م بنجاح.`);
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('حدث خطأ أثناء تسجيل المصروف.');
    }
  };

  // 3. Quick Oil Change Reset Action
  const handleSaveOilReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oilResetForm.vehicleId || !oilResetForm.currentOdometer) {
      alert('يرجى اختيار السيارة وإدخال قراءة العداد الحالية.');
      return;
    }

    try {
      const vehicle = effectiveVehicles.find(v => v.id === oilResetForm.vehicleId);
      const odometer = Number(oilResetForm.currentOdometer);

      // 1. Record Oil Expense
      if (oilResetForm.cost > 0) {
        const expDoc = {
          vehicleId: oilResetForm.vehicleId,
          date: oilResetForm.date,
          type: 'زيت' as const,
          amount: Number(oilResetForm.cost),
          odometerReading: odometer,
          description: `تغيير زيت وصيانة دورية: ${oilResetForm.oilType}`,
          safeId: oilResetForm.safeId || null,
          createdBy: 'مهندس الصيانة',
          createdAt: serverTimestamp()
        };

        const expRef = await addDoc(collection(db, 'vehicleExpenses'), expDoc);

        if (oilResetForm.safeId && oilResetForm.safeId !== 'none') {
          await addDoc(collection(db, 'safeTransactions'), {
            safeId: oilResetForm.safeId,
            type: 'مصروفات',
            amount: Number(oilResetForm.cost),
            date: oilResetForm.date,
            description: `تغيير زيت لسيارة (${vehicle?.plateNumber || ''})`,
            category: 'صيانة سيارات',
            relatedId: expRef.id,
            createdBy: 'مهندس الصيانة'
          });
        }
      }

      // 2. Reset Vehicle Maintenance Odometer in Firestore
      if (vehicle && !vehicle.id.startsWith('veh-')) {
        await updateDoc(doc(db, 'vehicles', vehicle.id), {
          odometerReading: odometer,
          lastMaintenanceOdometer: odometer,
          status: 'نشط'
        });
      }

      setShowOilResetModal(false);
      alert(`✅ تم إعادة ضبط عداد تغيير الزيت والصيانة للسيارة (${vehicle?.plateNumber}) بنجاح.`);
    } catch (error) {
      console.error('Error resetting oil change:', error);
      alert('حدث خطأ أثناء تحديث بيانات الصيانة.');
    }
  };

  // 4. Change Status Quick Toggle
  const handleChangeVehicleStatus = async (vehicleId: string, newStatus: 'نشط' | 'في الصيانة' | 'خارج الخدمة') => {
    try {
      if (!vehicleId.startsWith('veh-')) {
        await updateDoc(doc(db, 'vehicles', vehicleId), {
          status: newStatus
        });
      }
      alert(`تم تغيير حالة السيارة إلى (${newStatus})`);
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  };

  // 5. Delete Vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه السيارة وسجلها نهائياً؟')) {
      try {
        if (!vehicleId.startsWith('veh-')) {
          await deleteDoc(doc(db, 'vehicles', vehicleId));
        }
        alert('تم حذف السيارة بنجاح.');
      } catch (error) {
        console.error('Error deleting vehicle:', error);
      }
    }
  };

  // 6. Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      try {
        if (!expenseId.startsWith('exp-')) {
          await deleteDoc(doc(db, 'vehicleExpenses', expenseId));
        }
        alert('تم حذف المصروف بنجاح.');
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  // Helper Reset Forms
  const resetVehicleForm = () => {
    setVehicleForm({
      plateNumber: '',
      type: 'شاحنة نقل',
      brand: '',
      modelYear: new Date().getFullYear(),
      driverId: '',
      driverName: '',
      status: 'نشط',
      licenseExpiryDate: new Date().toISOString().split('T')[0],
      insuranceExpiryDate: new Date().toISOString().split('T')[0],
      inspectionExpiryDate: new Date().toISOString().split('T')[0],
      odometerReading: 0,
      maintenanceInterval: 5000,
      lastMaintenanceOdometer: 0,
      notes: ''
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      vehicleId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'سولار',
      amount: 0,
      fuelQuantity: 0,
      odometerReading: 0,
      description: '',
      safeId: safes[0]?.id || '',
      supplierId: ''
    });
  };

  const openEditVehicleModal = (veh: Vehicle) => {
    setEditingVehicle(veh);
    setVehicleForm({
      plateNumber: veh.plateNumber,
      type: veh.type,
      brand: veh.brand,
      modelYear: veh.modelYear,
      driverId: veh.driverId || '',
      driverName: veh.driverName || '',
      status: veh.status,
      licenseExpiryDate: veh.licenseExpiryDate,
      insuranceExpiryDate: veh.insuranceExpiryDate,
      inspectionExpiryDate: veh.inspectionExpiryDate || '',
      odometerReading: veh.odometerReading,
      maintenanceInterval: veh.maintenanceInterval || 5000,
      lastMaintenanceOdometer: veh.lastMaintenanceOdometer || veh.odometerReading,
      notes: veh.notes || ''
    });
    setShowAddVehicleModal(true);
  };

  const openOilResetForVehicle = (veh: Vehicle) => {
    setOilResetForm({
      vehicleId: veh.id,
      currentOdometer: veh.odometerReading,
      cost: 2500,
      oilType: 'زيت 10,000 كم + فلتر زيت وفلتر هواء',
      safeId: safes[0]?.id || '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowOilResetModal(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[32px] text-white shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-xl">
              منظومة حركة وسيارات المصنع (Fleet & Logistics Management)
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black">إدارة الأسطول، صيانة السيارات، والوقود</h2>
          <p className="text-slate-300 text-xs sm:text-sm font-bold mt-1">
            متابعة استهلاك البنزين والسولار، تنبيهات تغيير الزيت، التراخيص، والسائقين مع ربط مباشر بالخزائن
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
          <Button 
            onClick={() => setShowOilResetModal(true)}
            className="font-black bg-rose-600 hover:bg-rose-700 text-white h-11 sm:h-12 px-4 sm:px-5 rounded-xl sm:rounded-2xl shadow-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
          >
            <Droplets size={18} className="ml-2" />
            تسجيل تغيير زيت وصيانة
          </Button>

          <Button 
            onClick={() => { resetExpenseForm(); setShowAddExpenseModal(true); }}
            className="font-black bg-amber-600 hover:bg-amber-700 text-white h-11 sm:h-12 px-4 sm:px-5 rounded-xl sm:rounded-2xl shadow-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
          >
            <Fuel size={18} className="ml-2" />
            تسجيل مصروف / وقود
          </Button>

          <Button 
            onClick={() => { resetVehicleForm(); setEditingVehicle(null); setShowAddVehicleModal(true); }}
            className="font-black bg-indigo-600 hover:bg-indigo-700 text-white h-11 sm:h-12 px-4 sm:px-5 rounded-xl sm:rounded-2xl shadow-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
          >
            <Plus size={18} className="ml-2" />
            إضافة سيارة جديدة
          </Button>
        </div>
      </div>

      {/* Quick Alert Banners if oil change or license expiry is due */}
      {(stats.oilChangeAlerts.length > 0 || stats.licenseAlerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {stats.oilChangeAlerts.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-rose-900">تنبيه عاجل: تغيير زيت مستحق!</h4>
                  <p className="text-[11px] font-bold text-rose-700 mt-0.5">
                    هناك ({stats.oilChangeAlerts.length}) سيارة تجاوزت المسافة المحددة لتغيير الزيت ({stats.oilChangeAlerts.map(v => v.plateNumber).join(', ')})
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => { setActiveTab('maintenance'); }}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl px-3 h-9 w-full sm:w-auto shrink-0 justify-center"
              >
                معالجة الصيانة
              </Button>
            </div>
          )}

          {stats.licenseAlerts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-amber-900">تنبيه التراخيص والتأمين</h4>
                  <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                    هناك ({stats.licenseAlerts.length}) سيارة تنتهي رخصتها أو تأمينها خلال أقل من 30 يوماً
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setActiveTab('licenses')}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl px-3 h-9 w-full sm:w-auto shrink-0 justify-center"
              >
                متابعة التراخيص
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4 Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { title: "إجمالي أسطول السيارات", value: stats.totalVehicles, icon: Truck, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", sub: `${stats.activeVehicles} سيارة نشطة بالخدمة` },
          { title: "سيارات قيد الصيانة", value: stats.maintenanceVehicles, icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", sub: "تخضع للخدمة بالورشة" },
          { title: "تنبيهات تغيير الزيت", value: stats.oilChangeAlerts.length, icon: Droplets, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", sub: "تجاوزت العداد المحدد" },
          { title: "مصاريف الأسطول الشهرية", value: `${stats.totalSpentMonth.toLocaleString()} ج.م`, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", sub: "وقود، زيت، وصيانات" }
        ].map((stat, i) => (
          <Card key={i} className={cn("border shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden bg-white p-4 sm:p-5", stat.border)}>
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className={cn("w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                <stat.icon size={24} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{stat.value}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[
            { id: 'overview', label: 'نظرة عامة والتحليلات', icon: Activity },
            { id: 'vehicles', label: 'قائمة أسطول السيارات', icon: Truck },
            { id: 'maintenance', label: 'متابعة وتغيير الزيت', icon: Droplets },
            { id: 'expenses', label: 'سجل المصروفات والوقود', icon: CreditCard },
            { id: 'licenses', label: 'السائقين والتراخيص', icon: ShieldCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap min-h-[42px] shrink-0",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <Button 
          variant="outline"
          onClick={() => setShowPrintReportModal(true)}
          className="font-black text-xs rounded-xl sm:rounded-2xl border-slate-200 text-slate-700 h-10 px-3.5 ml-2 shrink-0 hidden md:flex"
        >
          <Printer size={15} className="ml-1.5" />
          طباعة تقرير الحركة
        </Button>
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Expenses by Category */}
            <Card className="rounded-[32px] border-slate-100 shadow-sm bg-white p-6">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" />
                  توزيع المصروفات حسب النوع (وقود، صيانة، زيت، تراخيص)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 h-64">
                {chartData.categoryPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    لا توجد مصروفات مسجلة حالياً
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.categoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {chartData.categoryPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [`${val.toLocaleString()} ج.م`, 'المبلغ']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Expenses by Vehicle */}
            <Card className="rounded-[32px] border-slate-100 shadow-sm bg-white p-6">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600" />
                  تكاليف التشغيل حسب رقم لوحة السيارة
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 h-64">
                {chartData.vehicleBarData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    لا توجد بيانات متاحة
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.vehicleBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val: number) => [`${val.toLocaleString()} ج.م`, 'التكلفة']} />
                      <Bar dataKey="cost" fill="#4f46e5" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Fleet Vehicle Cards Summary */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Truck size={18} className="text-indigo-600" />
                ملخص أسطول السيارات السريع
              </h3>
              <Button 
                onClick={() => setActiveTab('vehicles')} 
                variant="ghost" 
                className="text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl"
              >
                عرض كل السيارات ({effectiveVehicles.length}) <ChevronRight size={16} />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {effectiveVehicles.map(veh => {
                const kmSinceLast = veh.odometerReading - (veh.lastMaintenanceOdometer || 0);
                const needsOil = kmSinceLast >= (veh.maintenanceInterval || 5000);

                return (
                  <div key={veh.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-sm bg-white px-2.5 py-1 rounded-xl shadow-xs border border-slate-200">
                        {veh.plateNumber}
                      </span>
                      <Badge className={cn("font-bold text-[10px]", veh.status === 'نشط' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                        {veh.status}
                      </Badge>
                    </div>

                    <div>
                      <p className="font-black text-xs text-slate-800">{veh.brand}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{veh.type} • {veh.driverName || 'بدون سائق'}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">العداد:</span>
                      <span className="font-black text-indigo-700 dir-ltr">{veh.odometerReading.toLocaleString()} كم</span>
                    </div>

                    {needsOil && (
                      <div className="bg-rose-100 text-rose-900 text-[10px] font-black p-1.5 rounded-xl text-center">
                        ⚠️ صيانة وتغيير زيت مستحق
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLES LIST & MANAGEMENT */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          {/* Search & Status Filter Controls */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search size={18} className="absolute right-4 top-3.5 text-slate-400" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم اللوحة، الماركة، أو اسم السائق..."
                className="pr-11 h-11 bg-slate-50 border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-black text-slate-500 ml-1 shrink-0">حالة السيارة:</span>
              {['الكل', 'نشط', 'في الصيانة', 'خارج الخدمة'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 min-h-[38px]",
                    statusFilter === st ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicles Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredVehicles.map(veh => {
              const kmSinceLast = veh.odometerReading - (veh.lastMaintenanceOdometer || 0);
              const maintenancePct = Math.min(100, (kmSinceLast / (veh.maintenanceInterval || 5000)) * 100);
              const needsMaintenance = kmSinceLast >= (veh.maintenanceInterval || 5000);

              return (
                <Card key={veh.id} className="rounded-2xl sm:rounded-[28px] border-slate-100 shadow-xs hover:shadow-md transition-all overflow-hidden bg-white p-4 sm:p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                        <Truck size={22} className="sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm sm:text-base">{veh.brand}</h3>
                        <Badge variant="outline" className="font-black text-[10px] sm:text-[11px] bg-slate-50 text-slate-800 border-slate-200 dir-ltr mt-0.5">
                          {veh.plateNumber}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <select 
                        value={veh.status} 
                        onChange={(e) => handleChangeVehicleStatus(veh.id, e.target.value as any)}
                        className="h-8 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 px-2 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="نشط">نشط ✓</option>
                        <option value="في الصيانة">في الصيانة ⚙️</option>
                        <option value="خارج الخدمة">خارج الخدمة 🛑</option>
                      </select>
                    </div>
                  </div>

                  {/* Driver & Type Specs */}
                  <div className="bg-slate-50 p-3 rounded-xl sm:rounded-2xl space-y-2 text-xs font-bold text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><User size={14} className="text-indigo-600" /> السائق:</span>
                      <span className="font-black text-slate-900 truncate max-w-[130px] sm:max-w-[150px] text-left">{veh.driverName || 'غير محدد'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Gauge size={14} className="text-indigo-600" /> عداد KM:</span>
                      <span className="font-black text-indigo-700 dir-ltr">{veh.odometerReading.toLocaleString()} كم</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1"><Calendar size={14} className="text-indigo-600" /> انتهاء الرخصة:</span>
                      <span className="font-black text-slate-800 dir-ltr">{veh.licenseExpiryDate}</span>
                    </div>
                  </div>

                  {/* Oil Change Status Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-slate-600 flex items-center gap-1"><Droplets size={13} className="text-amber-500" /> استهلاك الزيت والصيانة</span>
                      <span className={needsMaintenance ? "text-rose-600" : "text-emerald-600"}>
                        {kmSinceLast.toLocaleString()} / {(veh.maintenanceInterval || 5000).toLocaleString()} كم
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", needsMaintenance ? "bg-rose-500" : "bg-emerald-500")}
                        style={{ width: `${maintenancePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => { setSelectedVehicle(veh); setShowVehicleDetailsModal(true); }}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs h-9 rounded-xl min-w-[110px]"
                    >
                      <Eye size={14} className="ml-1" />
                      التفاصيل والملف
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => openOilResetForVehicle(veh)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-black text-xs h-9 px-3 rounded-xl border border-rose-200"
                    >
                      <Droplets size={14} className="ml-1" />
                      تغيير زيت
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditVehicleModal(veh)}
                      className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500"
                    >
                      <Edit2 size={14} />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteVehicle(veh.id)}
                      className="h-9 w-9 rounded-xl hover:bg-rose-50 text-rose-500"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: OIL CHANGE & MAINTENANCE TRACKER */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Droplets size={22} className="text-amber-500 shrink-0" />
                  شاشة متابعة وتغيير الزيت والصيانة الدورية للسيارات
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">تحديث عدادات الكيلومترات وتحديد موعد تغيير الزيت القادم بدقة</p>
              </div>

              <Button 
                onClick={() => setShowOilResetModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow-xs w-full sm:w-auto shrink-0 justify-center"
              >
                <Plus size={15} className="ml-1.5" />
                تسجيل صيانة جديدة وتغيير زيت
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {effectiveVehicles.map(veh => {
                const kmSinceLast = veh.odometerReading - (veh.lastMaintenanceOdometer || 0);
                const interval = veh.maintenanceInterval || 5000;
                const pct = Math.min(100, (kmSinceLast / interval) * 100);
                const isOverdue = kmSinceLast >= interval;

                return (
                  <div key={veh.id} className={cn(
                    "p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all space-y-3 bg-white",
                    isOverdue ? "border-rose-300 bg-rose-50/20 shadow-xs" : "border-slate-200"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-11 sm:w-12 h-11 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-white shadow-xs shrink-0", isOverdue ? "bg-rose-600" : "bg-amber-500")}>
                          <Droplets size={22} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">{veh.brand} ({veh.plateNumber})</h4>
                          <p className="text-xs font-bold text-slate-500">السائق: {veh.driverName || 'غير محدد'}</p>
                        </div>
                      </div>

                      <Badge className={cn("font-black text-xs px-2.5 py-1 rounded-xl shrink-0", isOverdue ? "bg-rose-600 text-white" : "bg-emerald-100 text-emerald-800")}>
                        {isOverdue ? '⚠️ مستحق الآن' : 'سارية ✓'}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl sm:rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">قراءة العداد الحالية:</span>
                        <span className="font-black text-slate-900 dir-ltr">{veh.odometerReading.toLocaleString()} كم</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">عداد آخر تغيير زيت:</span>
                        <span className="font-black text-slate-900 dir-ltr">{(veh.lastMaintenanceOdometer || 0).toLocaleString()} كم</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">المقطوع منذ آخر صيانة:</span>
                        <span className={cn("font-black dir-ltr", isOverdue ? "text-rose-600" : "text-emerald-600")}>
                          {kmSinceLast.toLocaleString()} كم
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", isOverdue ? "bg-rose-600" : "bg-amber-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 text-left">
                        دورة الصيانة المحددة: كل {interval.toLocaleString()} كم
                      </p>
                    </div>

                    <Button 
                      onClick={() => openOilResetForVehicle(veh)}
                      className="w-full font-black text-xs bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-xl sm:rounded-2xl shadow-xs"
                    >
                      <RefreshCw size={14} className="ml-2" />
                      إعادة ضبط عداد تغيير الزيت للسيارة
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES & FUEL LOG */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search size={18} className="absolute right-4 top-3.5 text-slate-400" />
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم لوحة السيارة..."
                className="pr-11 h-11 bg-slate-50 border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-black text-slate-500 ml-1 shrink-0">نوع المصروف:</span>
              {['الكل', 'سولار', 'بنزين', 'زيت', 'صيانة', 'رخصة', 'أخرى'].map(tp => (
                <button
                  key={tp}
                  onClick={() => setExpenseTypeFilter(tp)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 min-h-[38px]",
                    expenseTypeFilter === tp ? "bg-amber-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {tp}
                </button>
              ))}
            </div>
          </div>

          <Card className="rounded-2xl sm:rounded-[32px] border-slate-100 shadow-xs overflow-hidden bg-white">
            <div className="overflow-x-auto w-full">
              <Table className="text-right min-w-[700px]">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-black text-slate-700 text-xs">التاريخ</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs">السيارة</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs">نوع المصروف</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">الكمية (لتر)</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">العداد عند الصرف</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs">المبلغ (ج.م)</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs">الوصف / البيان</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-bold text-slate-800">
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400 font-bold">
                        لا توجد مصاريف مسجلة مطابقة للبحث
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map(exp => {
                      const veh = effectiveVehicles.find(v => v.id === exp.vehicleId);
                      return (
                        <TableRow key={exp.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-slate-600">{exp.date}</TableCell>
                          <TableCell className="font-black text-slate-900">
                            {veh ? `${veh.brand} (${veh.plateNumber})` : 'سيارة مسجلة'}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "font-black text-[11px]",
                              exp.type === 'سولار' || exp.type === 'بنزين' ? "bg-amber-100 text-amber-900" :
                              exp.type === 'زيت' ? "bg-rose-100 text-rose-900" :
                              exp.type === 'صيانة' ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-800"
                            )}>
                              {exp.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">{exp.fuelQuantity ? `${exp.fuelQuantity} لتر` : '-'}</TableCell>
                          <TableCell className="text-center font-mono">{exp.odometerReading ? `${exp.odometerReading.toLocaleString()} كم` : '-'}</TableCell>
                          <TableCell className="font-black text-emerald-700 text-sm dir-ltr">
                            {exp.amount.toLocaleString()} ج.م
                          </TableCell>
                          <TableCell className="text-slate-600 max-w-[200px] truncate">{exp.description}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: DRIVERS & LICENSES TRACKER */}
      {activeTab === 'licenses' && (
        <div className="space-y-4">
          <Card className="rounded-2xl sm:rounded-[32px] border-slate-100 shadow-xs bg-white p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-indigo-600 shrink-0" />
              جدول المتابعة الدورية لرخص السيارات والتأمين والفحص الفني
            </h3>

            <div className="overflow-x-auto w-full">
              <Table className="text-right min-w-[650px]">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="font-black text-slate-700 text-xs">السيارة</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs">السائق المسؤول</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">انتهاء الرخصة</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">انتهاء التأمين</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">حالة التجديد</TableHead>
                    <TableHead className="font-black text-slate-700 text-xs text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-bold text-slate-800">
                  {effectiveVehicles.map(veh => {
                    const today = new Date();
                    const licDate = new Date(veh.licenseExpiryDate);
                    const diffDays = Math.ceil((licDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    const isExpired = diffDays <= 0;
                    const isClose = diffDays > 0 && diffDays <= 30;

                    return (
                      <TableRow key={veh.id} className="hover:bg-slate-50">
                        <TableCell className="font-black text-slate-900">
                          {veh.brand} ({veh.plateNumber})
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">{veh.driverName || 'غير محدد'}</TableCell>
                        <TableCell className="text-center font-mono">{veh.licenseExpiryDate}</TableCell>
                        <TableCell className="text-center font-mono">{veh.insuranceExpiryDate || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "font-black text-[11px]",
                            isExpired ? "bg-rose-600 text-white" :
                            isClose ? "bg-amber-500 text-white" : "bg-emerald-100 text-emerald-800"
                          )}>
                            {isExpired ? 'منتهية! 🚨' : isClose ? `متبقي ${diffDays} يوم ⚠️` : 'سارية ✓'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditVehicleModal(veh)}
                            className="h-8 font-black text-[11px] rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            تحديث التواريخ
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT VEHICLE */}
      <Dialog open={showAddVehicleModal} onOpenChange={setShowAddVehicleModal}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[32px] p-0 border-none shadow-2xl bg-white">
          <form onSubmit={handleSaveVehicle}>
            <DialogHeader className="p-4 sm:p-6 bg-slate-900 text-white text-right">
              <DialogTitle className="text-lg sm:text-xl font-black">
                {editingVehicle ? 'تعديل بيانات السيارة' : 'إضافة سيارة جديدة لأسطول المصنع'}
              </DialogTitle>
              <DialogDescription className="text-slate-300 font-bold text-xs mt-1">
                أدخل بيانات السيارة واللوحة والسائق والتواريخ الرسمية
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">رقم اللوحة</label>
                  <Input 
                    value={vehicleForm.plateNumber} 
                    onChange={e => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                    placeholder="مثال: ب ط ص 8124" 
                    required 
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">الماركة والموديل</label>
                  <Input 
                    value={vehicleForm.brand} 
                    onChange={e => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    placeholder="مثال: ايسوزو جامبو 7000" 
                    required 
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">نوع السيارة</label>
                  <select 
                    value={vehicleForm.type || 'شاحنة نقل'} 
                    onChange={e => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="شاحنة نقل">شاحنة نقل ثقيل</option>
                    <option value="دينا">دينا نقل متوسط</option>
                    <option value="وانيت">وانيت / ربع نقل</option>
                    <option value="ملاكي">ملاكي إداري</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">سنة الصنع</label>
                  <Input 
                    type="number"
                    value={vehicleForm.modelYear} 
                    onChange={e => setVehicleForm({ ...vehicleForm, modelYear: Number(e.target.value) })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">اختيار السائق من قائمة الموظفين</label>
                  <select 
                    value={vehicleForm.driverId || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'custom_name' || !val) {
                        setVehicleForm(prev => ({
                          ...prev,
                          driverId: '',
                          driverName: prev.driverName || ''
                        }));
                      } else {
                        const emp = employees.find(item => item.id === val);
                        setVehicleForm(prev => ({
                          ...prev,
                          driverId: val,
                          driverName: emp ? emp.name : (prev.driverName || '')
                        }));
                      }
                    }}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="">-- اختر السائق من قائمة الموظفين --</option>
                    <option value="custom_name">✏️ سائق خارجي / كتابة اسم مخصص</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.position ? `(${emp.position})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">اسم السائق (تأكيد / كتابة يدوياً)</label>
                  <Input 
                    value={vehicleForm.driverName || ''} 
                    onChange={e => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                    placeholder="مثال: أحمد مصطفى حسن" 
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">عداد الكيلومتر الحالي (KM)</label>
                  <Input 
                    type="number"
                    value={vehicleForm.odometerReading} 
                    onChange={e => setVehicleForm({ ...vehicleForm, odometerReading: Number(e.target.value) })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">دورة تغيير الزيت (كل كم)</label>
                  <Input 
                    type="number"
                    value={vehicleForm.maintenanceInterval} 
                    onChange={e => setVehicleForm({ ...vehicleForm, maintenanceInterval: Number(e.target.value) })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">انتهاء الرخصة</label>
                  <Input 
                    type="date"
                    value={vehicleForm.licenseExpiryDate} 
                    onChange={e => setVehicleForm({ ...vehicleForm, licenseExpiryDate: e.target.value })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">تاريخ الفحص الفني</label>
                  <Input 
                    type="date"
                    value={vehicleForm.inspectionExpiryDate} 
                    onChange={e => setVehicleForm({ ...vehicleForm, inspectionExpiryDate: e.target.value })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">ملاحظات إضافية</label>
                <Input 
                  value={vehicleForm.notes} 
                  onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                  placeholder="ملاحظات الحركة..." 
                  className="h-11 rounded-xl bg-slate-50 font-bold"
                />
              </div>
            </div>

            <DialogFooter className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex-col-reverse sm:flex-row-reverse gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddVehicleModal(false)} className="w-full sm:w-auto rounded-xl font-black text-xs h-10">إلغاء</Button>
              <Button type="submit" className="w-full sm:w-auto rounded-xl font-black text-xs bg-slate-900 text-white hover:bg-slate-800 h-10">حفظ السيارة</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD EXPENSE / FUEL */}
      <Dialog open={showAddExpenseModal} onOpenChange={setShowAddExpenseModal}>
        <DialogContent className="w-[95vw] sm:w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[32px] p-0 border-none shadow-2xl bg-white">
          <form onSubmit={handleSaveExpense}>
            <DialogHeader className="p-4 sm:p-6 bg-amber-600 text-white text-right">
              <DialogTitle className="text-lg sm:text-xl font-black">تسجيل مصروف / استهلاك وقود لسيارة</DialogTitle>
              <DialogDescription className="text-amber-100 font-bold text-xs mt-1">
                تسجيل السولار، البنزين، الزيوت والصيانات مع ربطه بالخزنة مباشرة
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">السيارة</label>
                  <select 
                    value={expenseForm.vehicleId || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      const veh = effectiveVehicles.find(v => v.id === val);
                      setExpenseForm({ 
                        ...expenseForm, 
                        vehicleId: val,
                        odometerReading: veh ? veh.odometerReading : 0
                      });
                    }}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
                  >
                    <option value="">-- اختر السيارة --</option>
                    {effectiveVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.brand} ({v.plateNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">التاريخ</label>
                  <Input 
                    type="date"
                    value={expenseForm.date} 
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">نوع المصروف</label>
                  <select 
                    value={expenseForm.type || 'سولار'} 
                    onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value as any })}
                    className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
                  >
                    <option value="سولار">سولار</option>
                    <option value="بنزين">بنزين</option>
                    <option value="زيت">تغيير زيت</option>
                    <option value="صيانة">صيانة وقطع غيار</option>
                    <option value="رخصة">تجديد رخصة وتأمين</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">المبلغ الإجمالي (ج.م)</label>
                  <Input 
                    type="number"
                    value={expenseForm.amount} 
                    onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    placeholder="0"
                    required
                    className="h-11 rounded-xl bg-slate-50 font-bold text-emerald-700 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">كمية الوقود (باللتر - إن وجد)</label>
                  <Input 
                    type="number"
                    value={expenseForm.fuelQuantity} 
                    onChange={e => setExpenseForm({ ...expenseForm, fuelQuantity: Number(e.target.value) })}
                    placeholder="مثال: 80"
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">قراءة العداد عند الصرف (KM)</label>
                  <Input 
                    type="number"
                    value={expenseForm.odometerReading} 
                    onChange={e => setExpenseForm({ ...expenseForm, odometerReading: Number(e.target.value) })}
                    className="h-11 rounded-xl bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">خصم من خزنة</label>
                <select 
                  value={expenseForm.safeId || ''} 
                  onChange={e => setExpenseForm({ ...expenseForm, safeId: e.target.value })}
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500/20 outline-none"
                >
                  <option value="">-- اختر الخزنة --</option>
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (الرصيد: {s.balance.toLocaleString()} ج)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">البيان / تفاصيل المصروف</label>
                <Input 
                  value={expenseForm.description} 
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="مثال: تفويل سولار لرحلة شحن المعارض..." 
                  className="h-11 rounded-xl bg-slate-50 font-bold"
                />
              </div>
            </div>

            <DialogFooter className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex-col-reverse sm:flex-row-reverse gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddExpenseModal(false)} className="w-full sm:w-auto rounded-xl font-black text-xs h-10">إلغاء</Button>
              <Button type="submit" className="w-full sm:w-auto rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-700 text-white h-10">تسجيل المصروف</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: OIL CHANGE RESET */}
      <Dialog open={showOilResetModal} onOpenChange={setShowOilResetModal}>
        <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[32px] p-0 border-none shadow-2xl bg-white">
          <form onSubmit={handleSaveOilReset}>
            <DialogHeader className="p-4 sm:p-6 bg-rose-600 text-white text-right">
              <DialogTitle className="text-lg sm:text-xl font-black">تسجيل تغيير زيت وإعادة ضبط العداد</DialogTitle>
              <DialogDescription className="text-rose-100 font-bold text-xs mt-1">
                تصفير عداد الصيانة وتسجيل التكلفة المالية للزيت
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">السيارة</label>
                <select 
                  value={oilResetForm.vehicleId || ''} 
                  onChange={e => {
                    const val = e.target.value;
                    const veh = effectiveVehicles.find(v => v.id === val);
                    setOilResetForm({ ...oilResetForm, vehicleId: val, currentOdometer: veh ? veh.odometerReading : 0 });
                  }}
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-rose-500/20 outline-none"
                >
                  <option value="">-- اختر السيارة --</option>
                  {effectiveVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.brand} ({v.plateNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">عداد الكيلومتر الحالي (KM)</label>
                  <Input 
                    type="number"
                    value={oilResetForm.currentOdometer} 
                    onChange={e => setOilResetForm({ ...oilResetForm, currentOdometer: Number(e.target.value) })}
                    required
                    className="h-11 rounded-xl bg-slate-50 font-bold text-indigo-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">تكلفة تغيير الزيت (ج.م)</label>
                  <Input 
                    type="number"
                    value={oilResetForm.cost} 
                    onChange={e => setOilResetForm({ ...oilResetForm, cost: Number(e.target.value) })}
                    className="h-11 rounded-xl bg-slate-50 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">نوع الزيت والفلاتر</label>
                <Input 
                  value={oilResetForm.oilType} 
                  onChange={e => setOilResetForm({ ...oilResetForm, oilType: e.target.value })}
                  placeholder="مثال: زيت شل 10,000 كم + فلتر زيت وفلتر هواء" 
                  className="h-11 rounded-xl bg-slate-50 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">خصم التكلفة من خزنة</label>
                <select 
                  value={oilResetForm.safeId || ''} 
                  onChange={e => setOilResetForm({ ...oilResetForm, safeId: e.target.value })}
                  className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-rose-500/20 outline-none"
                >
                  <option value="">-- اختر الخزنة --</option>
                  {safes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (الرصيد: {s.balance.toLocaleString()} ج)</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex-col-reverse sm:flex-row-reverse gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowOilResetModal(false)} className="w-full sm:w-auto rounded-xl font-black text-xs h-10">إلغاء</Button>
              <Button type="submit" className="w-full sm:w-auto rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white h-10">تأكيد وتصفير العداد</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: VEHICLE DETAILS & HISTORY */}
      {showVehicleDetailsModal && selectedVehicle && (
        <Dialog open={showVehicleDetailsModal} onOpenChange={setShowVehicleDetailsModal}>
          <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[36px] p-0 border-none shadow-2xl bg-white">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0">
                  <Truck size={22} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-black">{selectedVehicle.brand} ({selectedVehicle.plateNumber})</h3>
                  <p className="text-xs text-slate-300 font-bold">{selectedVehicle.type} • موديل {selectedVehicle.modelYear}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowVehicleDetailsModal(false)} className="text-white hover:bg-white/20 rounded-full">
                <X size={20} />
              </Button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400">السائق الحالي</p>
                  <p className="font-black text-slate-900 text-xs sm:text-sm mt-1">{selectedVehicle.driverName || 'غير محدد'}</p>
                </div>
                <div className="p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400">عداد الكيلومترات</p>
                  <p className="font-black text-indigo-700 text-xs sm:text-sm mt-1 dir-ltr">{selectedVehicle.odometerReading.toLocaleString()} كم</p>
                </div>
                <div className="p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400">تاريخ الرخصة</p>
                  <p className="font-black text-slate-900 text-xs sm:text-sm mt-1 dir-ltr">{selectedVehicle.licenseExpiryDate}</p>
                </div>
              </div>

              {/* History of Expenses */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <History size={16} className="text-indigo-600" />
                  سجل مصاريف وصيانة السيارة
                </h4>

                <div className="overflow-x-auto w-full">
                  <Table className="text-right min-w-[500px]">
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-xs font-black text-slate-700">التاريخ</TableHead>
                        <TableHead className="text-xs font-black text-slate-700">النوع</TableHead>
                        <TableHead className="text-xs font-black text-slate-700">المبلغ</TableHead>
                        <TableHead className="text-xs font-black text-slate-700">البيان</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs font-bold text-slate-800">
                      {effectiveExpenses.filter(e => e.vehicleId === selectedVehicle.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-slate-400">لا توجد مصاريف مسجلة لهذه السيارة</TableCell>
                        </TableRow>
                      ) : (
                        effectiveExpenses.filter(e => e.vehicleId === selectedVehicle.id).map(exp => (
                          <TableRow key={exp.id}>
                            <TableCell className="font-mono">{exp.date}</TableCell>
                            <TableCell><Badge className="font-black text-[10px] bg-slate-100 text-slate-800">{exp.type}</Badge></TableCell>
                            <TableCell className="font-black text-emerald-700">{exp.amount.toLocaleString()} ج.م</TableCell>
                            <TableCell>{exp.description}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 5: PRINTABLE FLEET REPORT */}
      {showPrintReportModal && (
        <Dialog open={showPrintReportModal} onOpenChange={setShowPrintReportModal}>
          <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[32px] p-0 border-none shadow-2xl bg-white">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base sm:text-xl font-black">كشف كفاءة وحركة أسطول سيارات المصنع المعتمد</h3>
              <div className="flex items-center gap-2">
                <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl h-9 px-3">
                  <Printer size={15} className="ml-1" /> طباعة
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowPrintReportModal(false)} className="text-white hover:bg-white/20 rounded-full h-8 w-8">
                  <X size={18} />
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[80vh] overflow-y-auto bg-white text-slate-900" id="printable-fleet-report">
              <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg sm:text-2xl font-black">تقرير حركة الأسطول والصيانة</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">تاريخ التقرير: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-black text-indigo-700">مصنع النجار للأثاث الراقي</p>
                  <p className="text-[10px] font-bold text-slate-400">إدارة الحركة واللوجستيات</p>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <Table className="text-right border border-slate-200 min-w-[600px]">
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-black text-slate-800">السيارة واللوحة</TableHead>
                      <TableHead className="font-black text-slate-800">السائق</TableHead>
                      <TableHead className="font-black text-slate-800 text-center">العداد الحالي</TableHead>
                      <TableHead className="font-black text-slate-800 text-center">حالة الزيت والصيانة</TableHead>
                      <TableHead className="font-black text-slate-800 text-center">انتهاء الرخصة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-bold text-slate-800">
                    {effectiveVehicles.map(v => {
                      const kmSince = v.odometerReading - (v.lastMaintenanceOdometer || 0);
                      const isOverdue = kmSince >= (v.maintenanceInterval || 5000);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-black">{v.brand} ({v.plateNumber})</TableCell>
                          <TableCell>{v.driverName || 'غير محدد'}</TableCell>
                          <TableCell className="text-center font-mono">{v.odometerReading.toLocaleString()} كم</TableCell>
                          <TableCell className="text-center">
                            {isOverdue ? '⚠️ صيانة وزيت مستحق' : 'جيدة ✓'}
                          </TableCell>
                          <TableCell className="text-center font-mono">{v.licenseExpiryDate}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
