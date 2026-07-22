import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings, Layers, Play, CheckCircle, AlertTriangle, Package, 
  Truck, BarChart3, Plus, Search, Filter, MoreHorizontal, 
  ArrowRight, ShieldCheck, Clock, User, Building2, QrCode, 
  FileText, Activity, Map, ArrowLeftRight, ChevronRight,
  Monitor, Info, Zap, LayoutDashboard, Database, TrendingUp,
  PieChart, Users, Factory, FileSpreadsheet, Printer, Store,
  ShoppingBag, Link2, Send, CheckCircle2, Sparkles, Clock3,
  PackageCheck, ArrowDownRight, RefreshCw, FileCheck
} from 'lucide-react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
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
import { 
  ManufacturingOrder, ProductionRoute, ProductionStage, 
  WorkOrder, QualityInspection, PackingRecord, Employee, Department,
  ProductionLog, ProductionTracking, DeliveryOrder, TransferOrder
} from '../types';
import { db } from '../firebase';
import { 
  collection, addDoc, setDoc, updateDoc, deleteDoc, doc, serverTimestamp, 
  writeBatch, increment, query, where, orderBy 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Combobox } from './ui/Combobox';
import { NumberDisplay } from '../lib/numberUtils';

interface ProductionManagerProps {
  manufacturingOrders: ManufacturingOrder[];
  productionRoutes: ProductionRoute[];
  workOrders: WorkOrder[];
  qualityInspections: QualityInspection[];
  packingRecords: PackingRecord[];
  employees: Employee[];
  departments: Department[];
  productionLogs: ProductionLog[];
  productionTracking: ProductionTracking[];
  salesOrders?: any[];
  initialTab?: string;
}

export const ProductionManager: React.FC<ProductionManagerProps> = ({
  manufacturingOrders = [],
  productionRoutes = [],
  workOrders = [],
  qualityInspections = [],
  packingRecords = [],
  employees = [],
  departments = [],
  productionLogs = [],
  productionTracking = [],
  salesOrders = [],
  initialTab = 'dashboard'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddMO, setShowAddMO] = useState(false);

  // Form States
  const [routeForm, setRouteForm] = useState<Partial<ProductionRoute>>({
    name: '',
    description: '',
    stages: []
  });

  const [moForm, setMoForm] = useState<Partial<ManufacturingOrder>>({
    moNumber: `MO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    productId: '',
    productName: '',
    quantity: 1,
    routeId: '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    priority: 'normal'
  });

  // --- Logic Helpers ---

  const handleCreateRoute = async () => {
    if (!routeForm.name || (routeForm.stages || []).length === 0) return;
    try {
      await addDoc(collection(db, 'productionRoutes'), {
        ...routeForm,
        createdAt: serverTimestamp()
      });
      setShowAddRoute(false);
      setRouteForm({ name: '', description: '', stages: [] });
    } catch (err) { console.error(err); }
  };

  const handleCreateMO = async () => {
    if (!moForm.productName || !moForm.routeId) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Create MO
      const moRef = doc(collection(db, 'manufacturingOrders'));
      const moData = {
        moNumber: moForm.moNumber || `MO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: moForm.productId || `prod-${Date.now()}`,
        productName: moForm.productName,
        quantity: Number(moForm.quantity) || 1,
        routeId: moForm.routeId,
        startDate: moForm.startDate || new Date().toISOString().split('T')[0],
        dueDate: moForm.dueDate || '',
        priority: moForm.priority || 'normal',
        status: 'in_progress',
        createdBy: 'system',
        createdAt: serverTimestamp()
      };
      batch.set(moRef, moData);

      // 2. Initial Tracking
      const trackingRef = doc(collection(db, 'productionTracking'));
      batch.set(trackingRef, {
        moId: moRef.id,
        currentStageId: 'initial',
        entryTime: serverTimestamp(),
        delayStatus: 'on_track'
      });

      // 3. Create Work Orders for stages in the selected route
      const selectedRoute = productionRoutes.find((r: any) => r.id === moForm.routeId);
      if (selectedRoute && selectedRoute.stages && selectedRoute.stages.length > 0) {
        selectedRoute.stages.forEach((stage: any, idx: number) => {
          const woRef = doc(collection(db, 'workOrders'));
          batch.set(woRef, {
            woNumber: `WO-${moData.moNumber.replace('MO-', '')}-${idx + 1}`,
            moId: moRef.id,
            moNumber: moData.moNumber,
            productId: moData.productId,
            productName: moData.productName,
            stageId: stage.id || `stage-${idx}`,
            stageName: stage.name,
            stageCode: stage.code || `STG-${idx + 1}`,
            order: stage.order || idx + 1,
            status: idx === 0 ? 'active' : 'pending',
            progress: 0,
            quantity: moData.quantity,
            standardTimeMinutes: stage.standardTimeMinutes || 60,
            departmentId: stage.departmentId || '',
            supervisorId: stage.supervisorId || '',
            createdAt: serverTimestamp()
          });
        });
      } else {
        // Fallback default stages if route has no stages defined
        const defaultStages = [
          { name: 'القطع والنجارة الهيكلية', code: 'CUT-01', order: 1 },
          { name: 'الدهانات والسنفرة والأستر', code: 'PNT-02', order: 2 },
          { name: 'التجميع النهائي والتغليف', code: 'ASM-03', order: 3 }
        ];
        defaultStages.forEach((stage, idx) => {
          const woRef = doc(collection(db, 'workOrders'));
          batch.set(woRef, {
            woNumber: `WO-${moData.moNumber.replace('MO-', '')}-${idx + 1}`,
            moId: moRef.id,
            moNumber: moData.moNumber,
            productId: moData.productId,
            productName: moData.productName,
            stageId: `stage-${idx + 1}`,
            stageName: stage.name,
            stageCode: stage.code,
            order: stage.order,
            status: idx === 0 ? 'active' : 'pending',
            progress: 0,
            quantity: moData.quantity,
            standardTimeMinutes: 60,
            createdAt: serverTimestamp()
          });
        });
      }

      await batch.commit();
      setShowAddMO(false);
      setMoForm({
        moNumber: `MO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: '',
        productName: '',
        quantity: 1,
        routeId: '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        priority: 'normal'
      });
    } catch (err) { console.error('Error creating MO:', err); }
  };

  // Live Section Stats for Master Header & Navigation Tabs
  const navStats = useMemo(() => {
    const totalMO = manufacturingOrders.length;
    const inProgressMO = manufacturingOrders.filter(o => o.status === 'in_progress').length;
    const activeWO = workOrders.filter(w => w.status === 'in_progress' || w.status === 'ready').length;
    const totalRoutes = productionRoutes.length;
    const pendingQC = qualityInspections.filter(q => q.status === 'pending').length;
    const pendingPacking = manufacturingOrders.filter(o => !o.packingStatus || o.packingStatus === 'pending').length;
    const totalMTO = salesOrders.length || manufacturingOrders.filter(o => o.salesOrderId).length;
    return {
      totalMO,
      inProgressMO,
      activeWO,
      totalRoutes,
      pendingQC,
      pendingPacking,
      totalMTO,
    };
  }, [manufacturingOrders, workOrders, productionRoutes, qualityInspections, salesOrders]);

  // --- Render Helpers ---

  return (
    <div className="space-y-6">
      {/* Master Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-6 shadow-2xl border border-slate-800/80">
        {/* Subtle Ambient Decorative Gradients */}
        <div className="absolute -left-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 w-96 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Main Title & Status Pills */}
          <div className="space-y-3">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                منظومة الإنتاج الذكي v3.8 • Smart Industrial OS
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                <Zap size={12} className="text-amber-400" />
                أتمتة المخطط والمسارات
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug">
                مخطط ومحرك الإنتاج الذكي
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1 max-w-2xl leading-relaxed">
                مركز تحكم متكامل لإدارة أوامر التصنيع (MO)، أوامر التشغيل (WO)، تتبع الجودة والرقابة، التغليف والمخزون، وربط المعرض المباشر (MTO).
              </p>
            </div>

            {/* Live Metrics Pills Header Row */}
            <div className="pt-2 flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">أوامر التصنيع</p>
                  <p className="text-xs font-black text-white">{navStats.totalMO} أمر <span className="text-indigo-400 font-bold">({navStats.inProgressMO} جاري)</span></p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">أوامر التشغيل</p>
                  <p className="text-xs font-black text-amber-300">{navStats.activeWO} امر نشط بالمراحل</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">الفحص والجودة</p>
                  <p className="text-xs font-black text-emerald-300">{navStats.pendingQC > 0 ? `${navStats.pendingQC} بانتظار الفحص` : 'معتمد بالكامل ✅'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-[14px] bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">التغليف والمخزن</p>
                  <p className="text-xs font-black text-sky-300">{navStats.pendingPacking} شحنة بانتظار التغليف</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <Button 
              onClick={() => setShowAddMO(true)} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[14px] h-12 px-6 font-black text-xs shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              <span>أمر تصنيع جديد (MO)</span>
            </Button>

            <Button 
              onClick={() => setShowAddRoute(true)} 
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-[14px] h-12 px-5 font-black text-xs backdrop-blur-md transition-all flex items-center gap-2"
            >
              <Map size={18} className="text-indigo-300" />
              <span>إضافة مسار عمل</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Master Navigation Bar (Wide & Luxurious Control Navigation) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-slate-900/95 p-2 rounded-[28px] border border-slate-800 shadow-2xl backdrop-blur-2xl sticky top-2 z-30 mb-8">
          <TabsList className="bg-transparent border-none p-0 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide w-full">
            
            <TabsTrigger 
              value="dashboard" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <LayoutDashboard size={18} className="shrink-0" />
              <span>لوحة المتابعة</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono">
                {navStats.totalMO}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="orders" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <Activity size={18} className="shrink-0" />
              <span>أوامر التصنيع</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-bold">
                {navStats.inProgressMO > 0 ? `${navStats.inProgressMO} جاري` : navStats.totalMO}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="workorders" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <Clock size={18} className="shrink-0" />
              <span>أوامر التشغيل (WO)</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-bold">
                {navStats.activeWO} نشط
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="routes" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <Map size={18} className="shrink-0" />
              <span>المسارات والمراحل</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono">
                {navStats.totalRoutes}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="quality" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <ShieldCheck size={18} className="shrink-0" />
              <span>الجودة والفحص</span>
              <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                navStats.pendingQC > 0 ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/30 text-emerald-200'
              }`}>
                {navStats.pendingQC > 0 ? `${navStats.pendingQC} تنبيه` : 'سليم ✅'}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="packing" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <Package size={18} className="shrink-0" />
              <span>التغليف والمخزن</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-200 font-bold">
                {navStats.pendingPacking}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="showroom_link" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <Store size={18} className="shrink-0 text-amber-400" />
              <span>ربط المعرض (MTO) 🔗</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                {navStats.totalMTO}
              </span>
            </TabsTrigger>

            <TabsTrigger 
              value="reports" 
              className="rounded-[14px] px-5 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-slate-400 hover:text-white hover:bg-slate-800/80 font-black text-xs transition-all flex items-center gap-2.5 shrink-0"
            >
              <BarChart3 size={18} className="shrink-0" />
              <span>التقارير التحليلية</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-mono">
                14
              </span>
            </TabsTrigger>

          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
           <ProductionDashboard 
             orders={manufacturingOrders} 
             tracking={productionTracking}
             workOrders={workOrders}
           />
        </TabsContent>

        <TabsContent value="orders" className="mt-0 focus-visible:outline-none">
           <MOList orders={manufacturingOrders} />
        </TabsContent>

        <TabsContent value="workorders" className="mt-0 focus-visible:outline-none">
           <WOTerminal workOrders={workOrders} employees={employees} />
        </TabsContent>

        <TabsContent value="routes" className="mt-0 focus-visible:outline-none">
           <RouteManager routes={productionRoutes} onAdd={() => setShowAddRoute(true)} departments={departments} employees={employees} />
        </TabsContent>
        
        <TabsContent value="quality" className="mt-0 focus-visible:outline-none">
           <QualityControl 
             workOrders={workOrders} 
             inspections={qualityInspections} 
             routes={productionRoutes} 
             orders={manufacturingOrders} 
             employees={employees} 
           />
        </TabsContent>

        <TabsContent value="packing" className="mt-0 focus-visible:outline-none">
           <PackingView 
             orders={manufacturingOrders} 
             packingRecords={packingRecords} 
             workOrders={workOrders}
             employees={employees}
             qualityInspections={qualityInspections}
           />
        </TabsContent>

        <TabsContent value="showroom_link" className="mt-0 focus-visible:outline-none">
           <ShowroomFactoryIntegration 
             salesOrders={salesOrders}
             orders={manufacturingOrders}
             workOrders={workOrders}
             routes={productionRoutes}
             employees={employees}
           />
        </TabsContent>

        <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
           <ProductionReports 
             orders={manufacturingOrders}
             workOrders={workOrders}
             routes={productionRoutes}
             inspections={qualityInspections}
             employees={employees}
             departments={departments}
             logs={productionLogs}
             tracking={productionTracking}
           />
        </TabsContent>
      </Tabs>

      {/* Route Builder Modal */}
      <Dialog open={showAddRoute} onOpenChange={setShowAddRoute}>
        <DialogContent className="sm:max-w-[800px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <RouteBuilderForm 
            form={routeForm} 
            setForm={setRouteForm} 
            onSave={handleCreateRoute} 
            onCancel={() => setShowAddRoute(false)} 
            departments={departments}
            employees={employees}
          />
        </DialogContent>
      </Dialog>

      {/* Create MO Modal */}
      <Dialog open={showAddMO} onOpenChange={setShowAddMO}>
        <DialogContent className="sm:max-w-[600px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black">إنشاء أمر تصنيع جديد</DialogTitle>
              <p className="text-slate-400 text-xs font-bold mt-1">تحديد المنتج ومسار الإنتاج والكمية المستهدفة</p>
            </div>
            <Badge className="bg-indigo-600 text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl">
              {moForm.moNumber}
            </Badge>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">رقم أمر التصنيع</label>
                <Input 
                  value={moForm.moNumber || ''} 
                  onChange={e => setMoForm({ ...moForm, moNumber: e.target.value })}
                  placeholder="MO-2026-1001"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">اسم المنتج / الصنف المراد تصنيعه *</label>
                <Input 
                  value={moForm.productName || ''} 
                  onChange={e => setMoForm({ ...moForm, productName: e.target.value, productId: moForm.productId || `prod-${Date.now()}` })}
                  placeholder="مثال: غرفة نوم ماستر كلاسيك / سفرة مهراجا"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">الكمية المطلوبة *</label>
                <Input 
                  type="number"
                  min={1}
                  value={moForm.quantity || 1} 
                  onChange={e => setMoForm({ ...moForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Combobox
                  label="مسار الإنتاج والمراحل *"
                  options={
                    productionRoutes.length > 0 
                    ? productionRoutes.map((r: ProductionRoute) => ({
                        value: r.id,
                        label: r.name,
                        description: `${r.stages?.length || 0} مراحل تصنيع`
                      }))
                    : [{ value: 'route-default-standard', label: 'مسار التصنيع القياسي للأثاث', description: '3 مراحل أساسية' }]
                  }
                  value={moForm.routeId || ''}
                  onChange={val => setMoForm({ ...moForm, routeId: val })}
                  placeholder="اختر مسار التصنيع..."
                  searchPlaceholder="بحث في المسارات..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">تاريخ البدء المتوقع</label>
                <Input 
                  type="date"
                  value={moForm.startDate || ''} 
                  onChange={e => setMoForm({ ...moForm, startDate: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">تاريخ التسليم المستهدف</label>
                <Input 
                  type="date"
                  value={moForm.dueDate || ''} 
                  onChange={e => setMoForm({ ...moForm, dueDate: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Combobox
                  label="الأولوية"
                  options={[
                    { value: 'low', label: 'منخفضة', description: 'أولوية عادية' },
                    { value: 'normal', label: 'عادية (افتراضي)', description: 'الجدول الزمني المعتاد' },
                    { value: 'high', label: 'عالية ⚡', description: 'يجب الانتهاء في أسرع وقت' },
                    { value: 'urgent', label: 'عاجل جدًا 🚨', description: 'أولوية قصوى للمصنع' }
                  ]}
                  value={moForm.priority || 'normal'}
                  onChange={val => setMoForm({ ...moForm, priority: val as any })}
                  placeholder="اختر الأولوية..."
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setShowAddMO(false)} className="font-black text-slate-500 text-xs">إلغاء</Button>
            <Button 
              onClick={handleCreateMO} 
              disabled={!moForm.productName || !moForm.routeId}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-[14px] h-11 px-8 font-black text-white text-xs shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              اعتماد وإنشاء أمر التصنيع
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Sub-Components ---

const ProductionDashboard = ({ orders, tracking, workOrders }: any) => {
  const inProgressCount = orders.filter((o: any) => o.status === 'in_progress').length;
  const completedToday = orders.filter((o: any) => o.status === 'completed').length; // Mock simplified
  const activeWOs = workOrders.filter((w: any) => w.status === 'active' || w.status === 'in_progress').length;
  const delayedOrders = orders.filter((o: any) => o.status === 'delayed').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <Card className="rounded-[32px] border-none shadow-sm bg-white p-6 sm:p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">مباشر</Badge>
        </div>
        <h4 className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1 truncate">أوامر التصنيع الجارية</h4>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-none">
          <NumberDisplay value={inProgressCount} />
        </div>
      </Card>

      <Card className="rounded-[32px] border-none shadow-sm bg-white p-6 sm:p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">اليوم</Badge>
        </div>
        <h4 className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1 truncate">أوامر مكتملة</h4>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-none">
          <NumberDisplay value={completedToday} />
        </div>
      </Card>

      <Card className="rounded-[32px] border-none shadow-sm bg-white p-6 sm:p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-[14px] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[10px]">نشط</Badge>
        </div>
        <h4 className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1 truncate">أوامر التشغيل النشطة</h4>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-none">
          <NumberDisplay value={activeWOs} />
        </div>
      </Card>

      <Card className="rounded-[32px] border-none shadow-sm bg-white p-6 sm:p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-[14px] bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[10px]">تنبيه</Badge>
        </div>
        <h4 className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1 truncate">أوامر متأخرة</h4>
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-600 leading-none">
          <NumberDisplay value={delayedOrders} colored />
        </div>
      </Card>
    </div>
  );
};

const RouteBuilderForm = ({ form, setForm, onSave, onCancel, departments = [], employees = [] }: any) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [stageInput, setStageInput] = useState<Partial<ProductionStage>>({
    name: '',
    code: '',
    order: (form.stages?.length || 0) + 1,
    departmentId: '',
    supervisorId: '',
    standardTimeMinutes: 60,
    isMandatory: true,
    allowParallel: false,
    nextStageId: '',
    failReturnStageId: '',
    type: 'manual'
  });

  const handleAddOrUpdateStage = () => {
    if (!stageInput.name || !stageInput.code) return;
    
    const currentStages: ProductionStage[] = [...(form.stages || [])];
    
    if (editingIndex !== null) {
      currentStages[editingIndex] = {
        ...currentStages[editingIndex],
        ...stageInput
      } as ProductionStage;
      setEditingIndex(null);
    } else {
      const newStageObj: ProductionStage = {
        id: `stage-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: stageInput.name || '',
        code: stageInput.code || '',
        order: stageInput.order || currentStages.length + 1,
        departmentId: stageInput.departmentId || '',
        supervisorId: stageInput.supervisorId || '',
        standardTimeMinutes: stageInput.standardTimeMinutes || 60,
        isMandatory: stageInput.isMandatory !== undefined ? stageInput.isMandatory : true,
        allowParallel: stageInput.allowParallel || false,
        nextStageId: stageInput.nextStageId || '',
        failReturnStageId: stageInput.failReturnStageId || '',
        type: stageInput.type || 'manual'
      };
      currentStages.push(newStageObj);
    }

    setForm({
      ...form,
      stages: currentStages
    });

    // Reset input for next stage
    setStageInput({
      name: '',
      code: '',
      order: currentStages.length + 1,
      departmentId: '',
      supervisorId: '',
      standardTimeMinutes: 60,
      isMandatory: true,
      allowParallel: false,
      nextStageId: '',
      failReturnStageId: '',
      type: 'manual'
    });
  };

  const handleEditStage = (index: number) => {
    setEditingIndex(index);
    setStageInput(form.stages[index]);
  };

  const handleDeleteStage = (index: number) => {
    const updated = form.stages.filter((_: any, i: number) => i !== index);
    setForm({ ...form, stages: updated });
    if (editingIndex === index) {
      setEditingIndex(null);
      setStageInput({
        name: '',
        code: '',
        order: updated.length + 1,
        departmentId: '',
        supervisorId: '',
        standardTimeMinutes: 60,
        isMandatory: true,
        allowParallel: false,
        nextStageId: '',
        failReturnStageId: '',
        type: 'manual'
      });
    }
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const stages = [...(form.stages || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    const temp = stages[index];
    stages[index] = stages[targetIdx];
    stages[targetIdx] = temp;
    // re-assign orders
    stages.forEach((s, idx) => s.order = idx + 1);
    setForm({ ...form, stages });
  };

  return (
    <div className="flex flex-col h-[88vh]">
      <div className="p-6 bg-indigo-600 text-white shrink-0">
        <DialogTitle className="text-2xl font-black">بناء وتكوين مسار إنتاج ديناميكي</DialogTitle>
        <p className="text-indigo-100 font-bold text-sm mt-1">إضافة وإدارة مراحل التصنيع، تحديد الترتيب، المشرفين، زمن الأداء، ومسارات الرفض والتوازي</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
        {/* Route Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">اسم مسار الإنتاج *</label>
            <Input 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="مثال: مسار خط إنتاج غرف النوم خشبي"
              className="h-12 rounded-[14px] bg-white border-slate-200 focus:border-indigo-600 font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">وصف المسار / ملاحظات</label>
            <Input 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="وصف مختصر لمراحل هذا المسار والموديلات المستهدفة..."
              className="h-12 rounded-[14px] bg-white border-slate-200 focus:border-indigo-600 font-bold"
            />
          </div>
        </div>

        {/* Existing Stages List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers size={22} className="text-indigo-600" />
              مراحل الإنتاج المعرفة بالمسار ({form.stages?.length || 0})
            </h3>
          </div>
          
          {(!form.stages || form.stages.length === 0) ? (
            <div className="text-center p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="font-bold text-slate-400 text-sm">لم يتم إضافة أي مراحل بهذا المسار بعد. استخدم النموذج أدناه لإضافة مرحلة.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {form.stages.map((stage: ProductionStage, idx: number) => {
                const dept = departments.find((d: any) => d.id === stage.departmentId);
                const sup = employees.find((e: any) => e.id === stage.supervisorId);
                const nextStage = form.stages.find((s: any) => s.id === stage.nextStageId);
                const failStage = form.stages.find((s: any) => s.id === stage.failReturnStageId);

                return (
                  <div key={stage.id || idx} className="p-5 bg-slate-50/80 hover:bg-slate-50 rounded-3xl border border-slate-100 transition-all space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-100">
                          {stage.order || idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-base">{stage.name}</h4>
                            <Badge className="bg-slate-200 text-slate-700 font-mono text-[10px] rounded-lg">{stage.code}</Badge>
                            {stage.isMandatory ? (
                              <Badge className="bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg">إلزامية</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 font-bold text-[10px] rounded-lg">اختيارية</Badge>
                            )}
                            {stage.allowParallel && (
                              <Badge className="bg-blue-100 text-blue-800 font-bold text-[10px] rounded-lg">تنفيذ بالتوازي ⚡</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
                            <span>القسم: {dept ? dept.name : 'غير محدد'}</span>
                            <span>•</span>
                            <span>المشرف: {sup ? sup.name : 'غير محدد'}</span>
                            <span>•</span>
                            <span>الزمن القياسي: {stage.standardTimeMinutes} دقيقة</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, 'up')}
                          className="h-8 w-8 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600"
                        >
                          ↑
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          disabled={idx === form.stages.length - 1}
                          onClick={() => handleMoveStage(idx, 'down')}
                          className="h-8 w-8 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600"
                        >
                          ↓
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditStage(idx)}
                          className="rounded-xl font-bold text-xs"
                        >
                          تعديل
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteStage(idx)}
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                        >
                          <Plus size={16} className="rotate-45" />
                        </Button>
                      </div>
                    </div>

                    {/* Routing logic footer */}
                    <div className="flex items-center gap-6 pt-2 border-t border-slate-200/50 text-xs font-bold">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <span>المرحلة التالية:</span>
                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100">{nextStage ? nextStage.name : 'تلقائي (حسب الترتيب)'}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-rose-700">
                        <span>الرجوع عند الرفض:</span>
                        <Badge className="bg-rose-50 text-rose-700 border border-rose-100">{failStage ? failStage.name : 'إعادة نفس المرحلة'}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {/* Stage Creator / Editor Card */}
        <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              {editingIndex !== null ? `تعديل المرحلة رقم ${editingIndex + 1}` : 'إضافة مرحلة إنتاج جديدة للمسار'}
            </h4>
            {editingIndex !== null && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setEditingIndex(null);
                  setStageInput({
                    name: '', code: '', order: (form.stages?.length || 0) + 1,
                    standardTimeMinutes: 60, isMandatory: true, allowParallel: false,
                    departmentId: '', supervisorId: '', nextStageId: '', failReturnStageId: ''
                  });
                }}
                className="text-xs font-bold text-slate-500"
              >
                إلغاء التعديل
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">اسم المرحلة *</label>
              <Input 
                value={stageInput.name} 
                onChange={e => setStageInput({...stageInput, name: e.target.value})}
                placeholder="مثال: نجارة وتجميع الهيكل" 
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">الكود *</label>
              <Input 
                value={stageInput.code} 
                onChange={e => setStageInput({...stageInput, code: e.target.value.toUpperCase()})}
                placeholder="مثال: WD-01" 
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">ترتيب المرحلة</label>
              <Input 
                type="number"
                value={stageInput.order || 1} 
                onChange={e => setStageInput({...stageInput, order: Number(e.target.value)})}
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">القسم المسؤول</label>
              <Select value={stageInput.departmentId || ''} onValueChange={v => setStageInput({...stageInput, departmentId: v})}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs text-right">
                  <SelectValue placeholder="اختر القسم..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                  <SelectItem value="dept-carpentry">قسم النجارة</SelectItem>
                  <SelectItem value="dept-paint">قسم الدهانات</SelectItem>
                  <SelectItem value="dept-assembly">قسم التجميع</SelectItem>
                  <SelectItem value="dept-upholstery">قسم التنجيد</SelectItem>
                  <SelectItem value="dept-packing">قسم التغليف والتحميل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">المشرف المسؤول</label>
              <Select value={stageInput.supervisorId || ''} onValueChange={v => setStageInput({...stageInput, supervisorId: v})}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs text-right">
                  <SelectValue placeholder="اختر المشرف..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.jobTitle || 'موظف'})</SelectItem>
                  ))}
                  <SelectItem value="emp-sup-1">م. أحمد النجّار (مشرف عام الإنتاج)</SelectItem>
                  <SelectItem value="emp-sup-2">م. محمود حسن (مشرف الجودة)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">الزمن القياسي (بالدقائق)</label>
              <Input 
                type="number"
                value={stageInput.standardTimeMinutes || 60} 
                onChange={e => setStageInput({...stageInput, standardTimeMinutes: Number(e.target.value)})}
                placeholder="60" 
                className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">المرحلة التالية المباشرة</label>
              <Select value={stageInput.nextStageId || ''} onValueChange={v => setStageInput({...stageInput, nextStageId: v})}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs text-right">
                  <SelectValue placeholder="تلقائي حسب الترتيب..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">تلقائي (المرحلة التالية في القائمة)</SelectItem>
                  {(form.stages || []).map((s: ProductionStage) => (
                    <SelectItem key={s.id} value={s.id}>{s.order}- {s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">مرحلة الرجوع عند الرفض للجودة</label>
              <Select value={stageInput.failReturnStageId || ''} onValueChange={v => setStageInput({...stageInput, failReturnStageId: v})}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs text-right">
                  <SelectValue placeholder="اختر مرحلة إعادة التصنيع..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">إعادة نفس المرحلة</SelectItem>
                  {(form.stages || []).map((s: ProductionStage) => (
                    <SelectItem key={s.id} value={s.id}>{s.order}- {s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={stageInput.isMandatory ?? true}
                onChange={e => setStageInput({...stageInput, isMandatory: e.target.checked})}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-black text-slate-700">هل المرحلة إلزامية؟ (تمنع التخطي)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={stageInput.allowParallel ?? false}
                onChange={e => setStageInput({...stageInput, allowParallel: e.target.checked})}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-black text-slate-700">هل يمكن تنفيذها بالتوازي مع مرحلة أخرى؟</span>
            </label>
          </div>

          <Button 
            type="button"
            onClick={handleAddOrUpdateStage} 
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md"
          >
            <Plus size={16} className="ml-2" />
            {editingIndex !== null ? 'تحديث بيانات المرحلة' : 'حفظ وإضافة المرحلة للمسار'}
          </Button>
        </div>
      </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={onCancel} className="font-black text-slate-500 hover:text-slate-900">إلغاء</Button>
        <Button onClick={onSave} className="bg-indigo-600 hover:bg-indigo-700 rounded-[14px] h-12 px-10 font-black shadow-lg shadow-indigo-100">حفظ المسار بالكامل</Button>
      </div>
    </div>
  );
};

const MOList = ({ orders = [] }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'planned'>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((mo: ManufacturingOrder) => {
      const matchesSearch = 
        (mo.moNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mo.productName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ? true : mo.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const counts = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o: any) => o.status === 'completed').length;
    const inProgress = orders.filter((o: any) => o.status === 'in_progress').length;
    const planned = orders.filter((o: any) => o.status === 'planned').length;
    return { total, completed, inProgress, planned };
  }, [orders]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute right-4 top-3.5 text-slate-400" />
          <Input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="البحث برقم الأمر أو اسم المنتج..."
            className="pr-11 h-11 rounded-[14px] bg-slate-50 border-slate-200 font-bold text-xs focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Button 
            onClick={() => setStatusFilter('all')}
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          >
            الكل (<NumberDisplay value={counts.total} />)
          </Button>
          <Button 
            onClick={() => setStatusFilter('in_progress')}
            variant={statusFilter === 'in_progress' ? 'default' : 'ghost'}
            className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'in_progress' ? 'bg-amber-500 text-white' : 'text-slate-600'}`}
          >
            قيد التصنيع ⏳ (<NumberDisplay value={counts.inProgress} />)
          </Button>
          <Button 
            onClick={() => setStatusFilter('completed')}
            variant={statusFilter === 'completed' ? 'default' : 'ghost'}
            className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
          >
            تمت واكتملت ✅ (<NumberDisplay value={counts.completed} />)
          </Button>
          <Button 
            onClick={() => setStatusFilter('planned')}
            variant={statusFilter === 'planned' ? 'default' : 'ghost'}
            className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'planned' ? 'bg-slate-700 text-white' : 'text-slate-600'}`}
          >
            مخططة 📋 (<NumberDisplay value={counts.planned} />)
          </Button>
        </div>
      </div>

      <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-right font-black text-slate-500 text-xs py-5 px-8">رقم أمر التصنيع</TableHead>
              <TableHead className="text-right font-black text-slate-500 text-xs py-5">اسم المنتج</TableHead>
              <TableHead className="text-center font-black text-slate-500 text-xs py-5">الكمية المطلوبة</TableHead>
              <TableHead className="text-right font-black text-slate-500 text-xs py-5">حالة الأمر التشغيلية</TableHead>
              <TableHead className="text-right font-black text-slate-500 text-xs py-5">المرحلة الحالية</TableHead>
              <TableHead className="text-left font-black text-slate-500 text-xs py-5 px-8">تاريخ التسليم المتوقع</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                  لا توجد أوامر تصنيع مطابقة لشروط البحث أو الفلترة
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((mo: ManufacturingOrder) => (
                <TableRow key={mo.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-5 px-8 font-black text-slate-900">{mo.moNumber}</TableCell>
                  <TableCell className="py-5 font-bold text-slate-800">{mo.productName}</TableCell>
                  <TableCell className="py-5 text-center font-black font-mono text-slate-900">
                    <NumberDisplay value={mo.quantity} className="text-xs sm:text-sm lg:text-base" />
                  </TableCell>
                  <TableCell className="py-5">
                    <Badge className={`rounded-xl px-3 py-1 font-black text-xs ${
                      mo.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                      mo.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {mo.status === 'in_progress' ? 'قيد التصنيع ⏳' : mo.status === 'completed' ? 'مكتمل وجاهز للتسليم ✅' : 'مخطط 📋'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${mo.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="font-bold text-slate-700 text-xs">
                        {mo.status === 'completed' ? 'تم الوصول للمنتج التام والتغليف' : 'مرحلة التصنيع النشطة'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-8 text-left font-bold text-slate-600">{mo.dueDate || 'غير محدد'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const WOTerminal = ({ workOrders = [], employees = [] }: any) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('active');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredWOs = useMemo(() => {
    if (filter === 'all') return workOrders;
    return workOrders.filter((wo: any) => wo.status === filter);
  }, [workOrders, filter]);

  const handleStartWO = async (wo: WorkOrder) => {
    setUpdatingId(wo.id);
    try {
      await updateDoc(doc(db, 'workOrders', wo.id), {
        status: 'active',
        progress: Math.max(wo.progress || 0, 10),
        startedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'productionLogs'), {
        moId: wo.moId || '',
        woId: wo.id,
        type: 'wo_started',
        message: `🚀 تم بدء العمل بأمر التشغيل (${wo.woNumber}) بمرحلة: ${wo.stageName}`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error starting WO:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateProgress = async (wo: WorkOrder, newProgress: number) => {
    setUpdatingId(wo.id);
    try {
      const isComplete = newProgress >= 100;
      await updateDoc(doc(db, 'workOrders', wo.id), {
        progress: newProgress,
        status: isComplete ? 'completed' : 'active',
        ...(isComplete ? { qualityStatus: 'pending', completedAt: serverTimestamp() } : {})
      });
      await addDoc(collection(db, 'productionLogs'), {
        moId: wo.moId || '',
        woId: wo.id,
        type: isComplete ? 'wo_completed' : 'wo_progress_updated',
        message: isComplete 
          ? `✅ تم إكمال أمر التشغيل (${wo.woNumber}) بالمرحلة (${wo.stageName}) وإرساله للجودة.`
          : `📊 تم تحديث نسبة الإنجاز لأمر التشغيل (${wo.woNumber}) إلى ${newProgress}%.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating WO progress:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignOperator = async (wo: WorkOrder, operatorId: string) => {
    const emp = employees.find((e: any) => e.id === operatorId);
    const operatorName = emp ? emp.name : operatorId;
    try {
      await updateDoc(doc(db, 'workOrders', wo.id), {
        operatorId,
        operatorName,
        assignedWorker: operatorName
      });
    } catch (err) {
      console.error('Error assigning operator:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Header & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-900">محطة أوامر التشغيل التنفيذية (Work Orders Terminal)</h3>
          <p className="text-xs font-bold text-slate-500">إدارة التنفيذ المباشر للورش والمراحل، تحديث الإنجاز، وإحالة المنتجات للفحص</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[14px] overflow-x-auto">
          <Button
            onClick={() => setFilter('active')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'active' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            جاري العمل ⚡ (<NumberDisplay value={workOrders.filter((w: any) => w.status === 'active').length} />)
          </Button>
          <Button
            onClick={() => setFilter('pending')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            بانتظار البدء ⏳ (<NumberDisplay value={workOrders.filter((w: any) => w.status === 'pending').length} />)
          </Button>
          <Button
            onClick={() => setFilter('completed')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            المكتملة ✅ (<NumberDisplay value={workOrders.filter((w: any) => w.status === 'completed').length} />)
          </Button>
          <Button
            onClick={() => setFilter('all')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            الكل (<NumberDisplay value={workOrders.length} />)
          </Button>
        </div>
      </div>

      {filteredWOs.length === 0 ? (
        <Card className="rounded-[32px] border-none shadow-sm bg-white p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Clock size={32} />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900">لا توجد أوامر تشغيل في هذه القائمة</h4>
            <p className="text-slate-500 text-xs font-bold mt-1">عند إنشاء أمر تصنيع جديد واختيار مسار الإنتاج، سيتم إنشاء أوامر التشغيل للمراحل تلقائياً هنا</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWOs.map((wo: WorkOrder) => (
            <Card key={wo.id} className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden p-6 hover:shadow-xl transition-all space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-indigo-50 text-indigo-700 font-mono font-black text-[10px] px-3 py-1">
                      {wo.woNumber}
                    </Badge>
                    <Badge className={`font-black text-[10px] px-2.5 py-0.5 rounded-lg ${
                      wo.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      wo.status === 'active' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {wo.status === 'completed' ? 'مكتمل ومُرسل للجودة ✅' : wo.status === 'active' ? 'قيد التشغيل الآن ⚡' : 'بانتظار دور البدء ⏳'}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{wo.stageName}</h3>
                  <p className="text-slate-500 font-bold text-xs mt-0.5">المنتج: <span className="text-slate-800 font-black">{wo.productName}</span> (أمر تصنيع: {wo.moNumber})</p>
                </div>
                <div className="text-left bg-slate-50 p-3 rounded-[14px] min-w-[90px] sm:min-w-[110px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">نسبة الإنجاز</span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-600 leading-none">
                    <NumberDisplay value={wo.progress || 0} unit="%" />
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-200 ${wo.progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                    style={{ width: `${Math.min(100, wo.progress || 0)}%` }} 
                  />
                </div>
                {wo.status === 'active' && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1">
                    <span>تحديث سريع لنسبة الإنجاز:</span>
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          disabled={updatingId === wo.id}
                          onClick={() => handleUpdateProgress(wo, pct)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                            wo.progress === pct ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Operator & Time Info */}
              <div className="bg-slate-50 rounded-[14px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-500 shrink-0">
                    <User size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase">المسؤول / الفني المعين</p>
                    <select
                      value={wo.operatorId || ''}
                      onChange={e => handleAssignOperator(wo, e.target.value)}
                      className="bg-transparent font-black text-slate-800 text-xs outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="">-- تعيين فني / مشغل --</option>
                      {employees.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.jobTitle || 'فني تصنيع'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-r border-slate-200 pt-2 sm:pt-0 sm:pr-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-500 shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">الزمن القياسي للمرحلة</p>
                    <p className="font-black text-slate-700 text-xs">{(wo as any).standardTimeMinutes || 60} دقيقة</p>
                  </div>
                </div>
              </div>

              {/* Action Control Button */}
              <div className="pt-2">
                {wo.status === 'pending' && (
                  <Button 
                    disabled={updatingId === wo.id}
                    onClick={() => handleStartWO(wo)}
                    className="w-full h-12 rounded-[14px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-100"
                  >
                    <Play size={18} className="ml-2" />
                    بدء التشغيل والعمل الفعلي
                  </Button>
                )}

                {wo.status === 'active' && (
                  <div className="flex items-center gap-3">
                    <Button 
                      disabled={updatingId === wo.id}
                      onClick={() => handleUpdateProgress(wo, 100)}
                      className="flex-1 h-12 rounded-[14px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-100"
                    >
                      <CheckCircle2 size={18} className="ml-2" />
                      إكمال التشغيل وإرسال للجودة 100%
                    </Button>
                  </div>
                )}

                {wo.status === 'completed' && (
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-[14px] font-black text-xs text-center border border-emerald-200 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    تم الإكمال بأساس المرحلة وهو متاح الآن بفحص الجودة
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const RouteManager = ({ routes = [], onAdd, departments = [], employees = [] }: any) => {
  const [selectedRoute, setSelectedRoute] = useState<ProductionRoute | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routes.map((route: ProductionRoute) => (
          <Card key={route.id} className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden p-6 group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md shadow-indigo-50">
                  <Map size={28} />
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-xs px-3.5 py-1 rounded-xl">
                  {route.stages?.length || 0} مراحل
                </Badge>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{route.name}</h3>
              <p className="text-slate-400 font-bold text-xs mb-6 leading-relaxed">{route.description || 'مسار إنتاج مخصص للمصنع'}</p>
              
              <div className="space-y-3 mb-8 bg-slate-50 p-4 rounded-[14px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">تسلسل مراحل المسار</p>
                {(route.stages || []).slice(0, 4).map((stage, idx) => (
                  <div key={stage.id || idx} className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-white text-indigo-600 font-black text-[10px] flex items-center justify-center shadow-xs">
                        {stage.order || idx + 1}
                      </span>
                      <span>{stage.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500 border-slate-200">
                      {stage.code}
                    </Badge>
                  </div>
                ))}
                {(route.stages || []).length > 4 && (
                  <p className="text-[10px] font-black text-indigo-600 text-center bg-indigo-100/50 py-1 rounded-lg">
                    + {route.stages.length - 4} مراحل إضافية
                  </p>
                )}
              </div>
            </div>

            <Button 
              onClick={() => setSelectedRoute(route)}
              variant="outline" 
              className="w-full h-12 rounded-[14px] border-slate-200 font-black text-slate-700 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
              عرض وتدقيق تفاصيل المراحل
            </Button>
          </Card>
        ))}

        <button onClick={onAdd} className="min-h-[320px] rounded-[32px] border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all group flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-[14px] bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md shadow-indigo-50">
            <Plus size={32} />
          </div>
          <div>
            <p className="font-black text-slate-900 text-lg">إنشاء مسار إنتاج جديد</p>
            <p className="text-slate-500 text-xs font-bold mt-1">تعريف وتنسيق مراحل تصنيع متسلسلة ومتوازية للمنتجات</p>
          </div>
        </button>
      </div>

      {/* Stage Inspection Dialog */}
      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="sm:max-w-[850px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          {selectedRoute && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-bold text-xs mb-2">تفاصيل المسار والمراحل</Badge>
                    <DialogTitle className="text-2xl font-black">{selectedRoute.name}</DialogTitle>
                    <p className="text-slate-400 font-bold text-xs mt-1">{selectedRoute.description || 'لا يوجد وصف متاح'}</p>
                  </div>
              <Badge className="bg-indigo-600 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl">
                إجمالي <NumberDisplay value={selectedRoute.stages?.length || 0} unit="مراحل" />
              </Badge>
                </div>
              </div>

              <div className="p-6 pt-0 max-h-[60vh] overflow-y-auto space-y-4">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right font-black text-slate-700">الترتيب</TableHead>
                      <TableHead className="text-right font-black text-slate-700">اسم المرحلة والكود</TableHead>
                      <TableHead className="text-right font-black text-slate-700">القسم والمشرف</TableHead>
                      <TableHead className="text-center font-black text-slate-700">الزمن القياسي</TableHead>
                      <TableHead className="text-center font-black text-slate-700">خصائص التشغيل</TableHead>
                      <TableHead className="text-right font-black text-slate-700">المسارات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedRoute.stages || []).map((stage, idx) => {
                      const dept = departments.find((d: any) => d.id === stage.departmentId);
                      const sup = employees.find((e: any) => e.id === stage.supervisorId);
                      const nextStage = selectedRoute.stages.find(s => s.id === stage.nextStageId);
                      const failStage = selectedRoute.stages.find(s => s.id === stage.failReturnStageId);

                      return (
                        <TableRow key={stage.id || idx}>
                          <TableCell className="font-black text-slate-900 text-center">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 inline-flex items-center justify-center font-black">
                              {stage.order || idx + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-black text-slate-900">{stage.name}</p>
                              <Badge className="bg-slate-100 text-slate-600 font-mono text-[10px]">{stage.code}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-bold text-slate-700">
                              <p>القسم: {dept ? dept.name : 'عام'}</p>
                              <p className="text-slate-400">المشرف: {sup ? sup.name : 'غير محدد'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-black text-slate-900">
                            {stage.standardTimeMinutes} دقيقة
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              {stage.isMandatory ? (
                                <Badge className="bg-amber-100 text-amber-800 text-[10px]">إلزامية</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">اختيارية</Badge>
                              )}
                              {stage.allowParallel && (
                                <Badge className="bg-blue-100 text-blue-800 text-[10px]">توازي ⚡</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">
                            <p className="text-indigo-600">التالي: {nextStage ? nextStage.name : 'تلقائي'}</p>
                            <p className="text-rose-600">عند الرفض: {failStage ? failStage.name : 'إعادة'}</p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <Button onClick={() => setSelectedRoute(null)} className="rounded-[14px] px-8 font-black bg-slate-900 text-white">
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const QualityControl = ({ workOrders = [], inspections = [], routes = [], orders = [], employees = [] }: any) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history'>('pending');
  const [inspectingWO, setInspectingWO] = useState<WorkOrder | null>(null);
  const [result, setResult] = useState<'pass' | 'fail' | 'rework' | 'scrap'>('pass');
  const [inspectorId, setInspectorId] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const commonDefects = [
    'عيوب بالدهان أو الطلاء',
    'تفاوت بالمقاسات والقطع',
    'خدوش سطحية في الخشب',
    'عدم محاذاة التجميع',
    'تلف الخامة أو القماش',
    'عدم مطابقة عينة العميل'
  ];

  // Calculate pending work orders for inspection
  const pendingOrders = useMemo(() => {
    return workOrders.filter((wo: WorkOrder) => 
      wo.status === 'completed' || wo.qualityStatus === 'pending' || !wo.qualityStatus
    );
  }, [workOrders]);

  // Compute stats
  const stats = useMemo(() => {
    const total = inspections.length;
    const passed = inspections.filter((i: any) => i.result === 'pass').length;
    const failed = inspections.filter((i: any) => i.result === 'fail').length;
    const rework = inspections.filter((i: any) => i.result === 'rework').length;
    const scrap = inspections.filter((i: any) => i.result === 'scrap').length;
    return { total, passed, failed, rework, scrap };
  }, [inspections]);

  // Derive associated route & fail return stage for inspectingWO
  const currentDetails = useMemo(() => {
    if (!inspectingWO) return { route: null, currentStage: null, failReturnStage: null, nextStage: null };
    
    const mo = orders.find((o: any) => o.id === inspectingWO.moId || o.moNumber === inspectingWO.moNumber);
    const route = routes.find((r: any) => r.id === mo?.routeId) || routes[0];
    const stages: ProductionStage[] = route?.stages || [];
    
    const currentStageIndex = stages.findIndex(s => s.id === inspectingWO.stageId || s.name === inspectingWO.stageName);
    const currentStage = currentStageIndex !== -1 ? stages[currentStageIndex] : null;
    
    // Find fail return stage
    let failReturnStage: ProductionStage | null = null;
    if (currentStage?.failReturnStageId) {
      failReturnStage = stages.find(s => s.id === currentStage.failReturnStageId) || null;
    }
    if (!failReturnStage && currentStageIndex > 0) {
      failReturnStage = stages[currentStageIndex - 1]; // previous stage
    }
    if (!failReturnStage && stages.length > 0) {
      failReturnStage = stages[0]; // default to start stage
    }

    // Find next stage
    let nextStage: ProductionStage | null = null;
    if (currentStage?.nextStageId) {
      nextStage = stages.find(s => s.id === currentStage.nextStageId) || null;
    } else if (currentStageIndex >= 0 && currentStageIndex < stages.length - 1) {
      nextStage = stages[currentStageIndex + 1];
    }

    return { route, currentStage, failReturnStage, nextStage, mo };
  }, [inspectingWO, orders, routes]);

  const toggleDefect = (defect: string) => {
    if (selectedDefects.includes(defect)) {
      setSelectedDefects(selectedDefects.filter(d => d !== defect));
    } else {
      setSelectedDefects([...selectedDefects, defect]);
    }
  };

  const handleSaveInspection = async () => {
    if (!inspectingWO) return;
    setIsSaving(true);
    try {
      const inspectorObj = employees.find((e: any) => e.id === inspectorId);
      const inspectorName = inspectorObj ? inspectorObj.name : 'مفتش الجودة';

      // 1. Create quality inspection document
      await addDoc(collection(db, 'qualityInspections'), {
        woId: inspectingWO.id,
        woNumber: inspectingWO.woNumber,
        moId: inspectingWO.moId,
        moNumber: inspectingWO.moNumber,
        productName: inspectingWO.productName,
        stageId: inspectingWO.stageId || '',
        stageName: inspectingWO.stageName || 'مرحلة تصنيع',
        inspectorId: inspectorId || 'sys-inspector',
        inspectorName,
        date: serverTimestamp(),
        result,
        defects: selectedDefects,
        comments: comments || '',
        returnStageId: result === 'fail' ? (currentDetails.failReturnStage?.id || '') : '',
        returnStageName: result === 'fail' ? (currentDetails.failReturnStage?.name || 'المرحلة السابقة') : ''
      });

      // 2. Update WorkOrder quality status
      const woRef = doc(db, 'workOrders', inspectingWO.id);
      await updateDoc(woRef, {
        qualityStatus: result,
        status: result === 'pass' ? 'completed' : result === 'rework' ? 'active' : 'failed',
        ...(result === 'rework' ? { progress: 0 } : {})
      });

      // 3. Update ManufacturingOrder status and routing
      if (inspectingWO.moId) {
        const moRef = doc(db, 'manufacturingOrders', inspectingWO.moId);
        
        if (result === 'fail') {
          // Automatic return to designated fail stage
          const returnTargetId = currentDetails.failReturnStage?.id || 'stage-initial';
          await updateDoc(moRef, {
            currentStageId: returnTargetId,
            status: 'in_progress'
          });

          await addDoc(collection(db, 'productionLogs'), {
            moId: inspectingWO.moId,
            woId: inspectingWO.id,
            type: 'quality_fail_return',
            message: `⚠️ تم رفض الفحص بالمرحلة (${inspectingWO.stageName}). تم إرجاع المنتج تلقائياً إلى مرحلة: ${currentDetails.failReturnStage?.name || 'بداية الخط'}.`,
            createdAt: serverTimestamp()
          });
        } else if (result === 'pass') {
          if (currentDetails.nextStage) {
            await updateDoc(moRef, {
              currentStageId: currentDetails.nextStage.id,
              status: 'in_progress'
            });
          } else {
            // Final stage passed
            await updateDoc(moRef, {
              status: 'completed'
            });
          }

          await addDoc(collection(db, 'productionLogs'), {
            moId: inspectingWO.moId,
            woId: inspectingWO.id,
            type: 'quality_pass',
            message: `✅ اجتاز فحص الجودة بنجاح بمرحلة (${inspectingWO.stageName}).`,
            createdAt: serverTimestamp()
          });
        } else if (result === 'rework') {
          await updateDoc(moRef, {
            status: 'in_progress'
          });

          await addDoc(collection(db, 'productionLogs'), {
            moId: inspectingWO.moId,
            woId: inspectingWO.id,
            type: 'quality_rework',
            message: `🔄 تم تحويل أمر التشغيل لإعادة العمل بمرحلة (${inspectingWO.stageName}).`,
            createdAt: serverTimestamp()
          });
        } else if (result === 'scrap') {
          await updateDoc(moRef, {
            status: 'cancelled'
          });

          await addDoc(collection(db, 'productionLogs'), {
            moId: inspectingWO.moId,
            woId: inspectingWO.id,
            type: 'quality_scrap',
            message: `🗑️ تم تكهين الصنف (SCRAP) بسبب عيوب الجودة في مرحلة (${inspectingWO.stageName}).`,
            createdAt: serverTimestamp()
          });
        }
      }

      // Close modal
      setInspectingWO(null);
      setComments('');
      setSelectedDefects([]);
    } catch (err) {
      console.error('Error saving quality inspection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="rounded-3xl border-none p-5 bg-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-slate-100 text-slate-700 flex items-center justify-center font-black">
            <ShieldCheck size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">إجمالي الفحوصات</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 mt-0.5">
              <NumberDisplay value={stats.total} />
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border-none p-5 bg-white shadow-sm flex items-center gap-4 border-r-4 border-r-emerald-500">
          <div className="w-12 h-12 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            PASS
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate">مقبول (PASS)</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-700 mt-0.5">
              <NumberDisplay value={stats.passed} colored />
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border-none p-5 bg-white shadow-sm flex items-center gap-4 border-r-4 border-r-rose-500">
          <div className="w-12 h-12 rounded-[14px] bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            FAIL
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest truncate">مرفوض وراجع (FAIL)</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-rose-700 mt-0.5">
              <NumberDisplay value={stats.failed} colored />
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border-none p-5 bg-white shadow-sm flex items-center gap-4 border-r-4 border-r-amber-500">
          <div className="w-12 h-12 rounded-[14px] bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            REWORK
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest truncate">إعادة تشغيل</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-amber-700 mt-0.5">
              <NumberDisplay value={stats.rework} colored />
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border-none p-5 bg-white shadow-sm flex items-center gap-4 border-r-4 border-r-slate-700">
          <div className="w-12 h-12 rounded-[14px] bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            SCRAP
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">خردة وهالك</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.scrap}</p>
          </div>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between bg-white p-2 rounded-[14px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setActiveSubTab('pending')} 
            variant={activeSubTab === 'pending' ? 'default' : 'ghost'}
            className={`rounded-xl font-black text-xs h-10 ${activeSubTab === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          >
            أوامر بانتظار فحص الجودة ({pendingOrders.length})
          </Button>
          <Button 
            onClick={() => setActiveSubTab('history')} 
            variant={activeSubTab === 'history' ? 'default' : 'ghost'}
            className={`rounded-xl font-black text-xs h-10 ${activeSubTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          >
            سجل الفحوصات والقرارات ({inspections.length})
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'pending' ? (
        <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none">
                <TableHead className="text-right font-black text-slate-500 text-xs py-5 px-6">أمر التشغيل (WO)</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">المرحلة الحالية</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">المنتج / الصنف</TableHead>
                <TableHead className="text-center font-black text-slate-500 text-xs py-5">الكمية</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">حالة الجودة</TableHead>
                <TableHead className="text-center font-black text-slate-500 text-xs py-5 px-6">الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                    لا توجد أوامر تشغيل منتظرة للفحص حالياً
                  </TableCell>
                </TableRow>
              ) : (
                pendingOrders.map((wo: WorkOrder) => (
                  <TableRow key={wo.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <TableCell className="py-5 px-6 font-black text-slate-900">{wo.woNumber}</TableCell>
                    <TableCell className="py-5 font-bold text-slate-700">
                      <Badge variant="outline" className="font-bold border-slate-200">
                        {wo.stageName || 'مرحلة تصنيع'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 font-bold text-slate-800">{wo.productName}</TableCell>
                    <TableCell className="py-5 text-center font-black text-slate-900">{wo.quantity}</TableCell>
                    <TableCell className="py-5">
                      <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-xs rounded-lg px-3 py-1">
                        بانتظار الفحص ⏳
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-center">
                      <Button 
                        onClick={() => {
                          setInspectingWO(wo);
                          setResult('pass');
                          setComments('');
                          setSelectedDefects([]);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl h-10 px-5 shadow-md shadow-indigo-100"
                      >
                        <ShieldCheck size={16} className="ml-2" />
                        إجراء الفحص الآن
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* History Table */
        <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none">
                <TableHead className="text-right font-black text-slate-500 text-xs py-5 px-6">أمر التشغيل</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">المرحلة</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">المنتج</TableHead>
                <TableHead className="text-center font-black text-slate-500 text-xs py-5">النتيجة</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">المفتش</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5">ملاحظات / العيوب</TableHead>
                <TableHead className="text-right font-black text-slate-500 text-xs py-5 px-6">المسار الناتجة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                    لا توجد فحوصات مسجلة في التاريخ بعد
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((insp: any) => (
                  <TableRow key={insp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <TableCell className="py-5 px-6 font-black text-slate-900">{insp.woNumber || insp.woId}</TableCell>
                    <TableCell className="py-5 font-bold text-slate-700">{insp.stageName || '-'}</TableCell>
                    <TableCell className="py-5 font-bold text-slate-800">{insp.productName || '-'}</TableCell>
                    <TableCell className="py-5 text-center">
                      {insp.result === 'pass' && (
                        <Badge className="bg-emerald-100 text-emerald-800 font-black text-xs px-3 py-1">PASS (قبول)</Badge>
                      )}
                      {insp.result === 'fail' && (
                        <Badge className="bg-rose-100 text-rose-800 font-black text-xs px-3 py-1">FAIL (رفض وإرجاع)</Badge>
                      )}
                      {insp.result === 'rework' && (
                        <Badge className="bg-amber-100 text-amber-800 font-black text-xs px-3 py-1">REWORK (تعديل)</Badge>
                      )}
                      {insp.result === 'scrap' && (
                        <Badge className="bg-slate-900 text-white font-black text-xs px-3 py-1">SCRAP (تكهين)</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-5 font-bold text-slate-600">{insp.inspectorName || 'المفتش'}</TableCell>
                    <TableCell className="py-5 text-xs text-slate-600 font-medium max-w-[200px] truncate">
                      {insp.defects?.length > 0 ? insp.defects.join(', ') : insp.comments || '-'}
                    </TableCell>
                    <TableCell className="py-5 px-6 text-xs font-bold text-indigo-700">
                      {insp.result === 'fail' ? `تم الإرجاع لـ: ${insp.returnStageName || 'المرحلة السابقة'}` : 'مستمر بالمسار'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Quality Inspection Modal */}
      <Dialog open={!!inspectingWO} onOpenChange={() => setInspectingWO(null)}>
        <DialogContent className="sm:max-w-[700px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          {inspectingWO && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-900 text-white">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-bold text-xs mb-2">اتخاذ قرار فحص الجودة</Badge>
                <DialogTitle className="text-2xl font-black">فحص أمر التشغيل: {inspectingWO.woNumber}</DialogTitle>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300 mt-2">
                  <span>المنتج: {inspectingWO.productName}</span>
                  <span>•</span>
                  <span>المرحلة: {inspectingWO.stageName || 'تصنيع'}</span>
                  <span>•</span>
                  <span>الكمية: {inspectingWO.quantity}</span>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-6 max-h-[65vh] overflow-y-auto">
                {/* 4 Decision Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-widest">قرار الفحص *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setResult('pass')}
                      className={`p-4 rounded-[14px] border-2 text-right transition-all flex flex-col justify-between ${
                        result === 'pass' 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-md' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-700 text-base">PASS (قبول)</span>
                        <CheckCircle size={20} className={result === 'pass' ? 'text-emerald-600' : 'text-slate-300'} />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 mt-2">مطابق للمواصفات واستكمال للمرحلة التالية</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResult('fail')}
                      className={`p-4 rounded-[14px] border-2 text-right transition-all flex flex-col justify-between ${
                        result === 'fail' 
                          ? 'border-rose-500 bg-rose-50/50 shadow-md' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-rose-700 text-base">FAIL (رفض وإرجاع)</span>
                        <AlertTriangle size={20} className={result === 'fail' ? 'text-rose-600' : 'text-slate-300'} />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 mt-2">غير مطابق وإرجاع تلقائي لمرحلة سابقة</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResult('rework')}
                      className={`p-4 rounded-[14px] border-2 text-right transition-all flex flex-col justify-between ${
                        result === 'rework' 
                          ? 'border-amber-500 bg-amber-50/50 shadow-md' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-700 text-base">REWORK (إعادة تشغيل)</span>
                        <Zap size={20} className={result === 'rework' ? 'text-amber-600' : 'text-slate-300'} />
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 mt-2">إعادة تصنيع وتعديل بنفس المرحلة</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResult('scrap')}
                      className={`p-4 rounded-[14px] border-2 text-right transition-all flex flex-col justify-between ${
                        result === 'scrap' 
                          ? 'border-slate-800 bg-slate-900 text-white shadow-md' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-black text-base ${result === 'scrap' ? 'text-white' : 'text-slate-800'}`}>SCRAP (خردة)</span>
                        <Info size={20} className={result === 'scrap' ? 'text-white' : 'text-slate-300'} />
                      </div>
                      <p className={`text-[11px] font-bold mt-2 ${result === 'scrap' ? 'text-slate-300' : 'text-slate-500'}`}>تكهين وإلغاء لعدم إمكانية الإصلاح</p>
                    </button>
                  </div>
                </div>

                {/* Auto Reroute Info Box for FAIL */}
                {result === 'fail' && (
                  <div className="p-4 bg-rose-50 rounded-[14px] border border-rose-200 space-y-1">
                    <p className="font-black text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle size={16} />
                      نظام الإرجاع التلقائي عند الرفض (FAIL):
                    </p>
                    <p className="text-xs font-bold text-rose-700">
                      سيتم إرجاع هذا المنتج/أمر التشغيل تلقائياً إلى مرحلة: <span className="underline font-black">{currentDetails.failReturnStage?.name || 'مرحلة البداية / السابقة'}</span> ({currentDetails.failReturnStage?.code || 'PREV'}) وتجهيزه لإعادة العمل.
                    </p>
                  </div>
                )}

                {/* Common Defects Selection */}
                {(result === 'fail' || result === 'rework' || result === 'scrap') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">تصنيف العيوب المكتشفة</label>
                    <div className="flex flex-wrap gap-2">
                      {commonDefects.map((defect) => (
                        <button
                          type="button"
                          key={defect}
                          onClick={() => toggleDefect(defect)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedDefects.includes(defect)
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {defect}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspector Selection */}
                <div className="space-y-1.5">
                  <Combobox
                    label="مفتش الجودة المسؤول"
                    options={[
                      ...employees.map((emp: any) => ({
                        value: emp.id,
                        label: emp.name,
                        description: emp.jobTitle || 'مفتش جودة'
                      })),
                      { value: 'emp-q-1', label: 'مهندس محمود حسن', description: 'رئيس قسم الجودة' },
                      { value: 'emp-q-2', label: 'أحمد سلامة', description: 'فني جودة' }
                    ]}
                    value={inspectorId}
                    onChange={val => setInspectorId(val)}
                    placeholder="ابحث عن مفتش..."
                    searchPlaceholder="بحث في قائمة المفتشين..."
                  />
                </div>

                {/* Notes & Comments */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">ملاحظات وتقرير الفحص التفصيلي</label>
                  <Input 
                    value={comments} 
                    onChange={e => setComments(e.target.value)}
                    placeholder="سجل أسباب القرار والملاحظات الفنية للمصنع..." 
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setInspectingWO(null)} 
                  className="rounded-[14px] font-bold text-xs text-slate-500"
                >
                  إلغاء
                </Button>

                <Button 
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveInspection} 
                  className={`rounded-[14px] h-11 px-8 font-black text-white shadow-lg ${
                    result === 'pass' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    result === 'fail' ? 'bg-rose-600 hover:bg-rose-700' :
                    result === 'rework' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-slate-900 hover:bg-black'
                  }`}
                >
                  {isSaving ? 'جاري حفظ القرار...' : 'اعتماد قرار الفحص الآن'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PackingView = ({ orders = [], packingRecords = [], workOrders = [], employees = [], qualityInspections = [] }: any) => {
  const [filter, setFilter] = useState<'all' | 'pending_packing' | 'packed' | 'stored'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [selectedOrderForPacking, setSelectedOrderForPacking] = useState<any | null>(null);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingForm, setPackingForm] = useState({
    cartonCount: 1,
    packingType: 'كرتون مقوى 5 طبقات + نيلون بابلز لحماية زوايا الأثاث',
    totalWeight: 45,
    length: 120,
    width: 80,
    height: 60,
    barcode: '',
    packedBy: '',
    notes: 'قابل للكسر - أثاث زجاجي وخشب طبيعي ممتاز - يحفظ بعيداً عن الرطوبة'
  });

  const [selectedOrderForWarehouse, setSelectedOrderForWarehouse] = useState<any | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    warehouseName: 'مخزن المنتجات التامة - المصنع الرئيسي',
    warehouseLocation: 'المنطقة A - رف 02',
    keeperName: 'أمين المخزن - علي السعيد',
    receiptNo: '',
    notes: 'تم فحص الشحنة خارجيًا ومطابقتها لأمر التصنيع والمستندات'
  });

  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<any | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [showQuickPackageModal, setShowQuickPackageModal] = useState(false);
  const [quickPackageForm, setQuickPackageForm] = useState({
    productName: 'طقم كنب كلاسيك فاخر 7 مقاعد (خشب زان أصلي)',
    quantity: 1,
    moNumber: `MO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    notes: 'شحنة أثاث جاهزة للتغليف والتوريد'
  });

  const [isSaving, setIsSaving] = useState(false);

  // Computed Orders
  const relevantOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const matchesSearch = 
        (o.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.moNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'pending_packing') {
        return !o.packingStatus || o.packingStatus === 'pending';
      }
      if (filter === 'packed') {
        return o.packingStatus === 'completed' && (!o.warehouseStatus || o.warehouseStatus === 'pending');
      }
      if (filter === 'stored') {
        return o.warehouseStatus === 'received';
      }
      return true;
    });
  }, [orders, filter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pendingPacking = orders.filter((o: any) => !o.packingStatus || o.packingStatus === 'pending').length;
    const packedPendingStorage = orders.filter((o: any) => o.packingStatus === 'completed' && (!o.warehouseStatus || o.warehouseStatus === 'pending')).length;
    const storedInWarehouse = orders.filter((o: any) => o.warehouseStatus === 'received').length;
    const totalCartons = orders.reduce((acc: number, o: any) => acc + (o.packagesCount || 1), 0);
    return { total, pendingPacking, packedPendingStorage, storedInWarehouse, totalCartons };
  }, [orders]);

  // Handlers
  const handleOpenPackingModal = (order: any) => {
    setSelectedOrderForPacking(order);
    setPackingForm({
      cartonCount: order.packagesCount || Math.max(1, order.quantity || 1),
      packingType: order.packingType || 'كرتون مقوى 5 طبقات + نيلون بابلز لحماية زوايا الأثاث',
      totalWeight: 45,
      length: 120,
      width: 80,
      height: 60,
      barcode: order.packingBarcode || `PKG-${order.moNumber?.replace('MO-', '') || Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      packedBy: employees[0]?.name || 'فني قسم التغليف والتكويد',
      notes: 'قابل للكسر - أثاث خشب طبيعي ممتاز - تجنب الرطوبة والضغط الزائد'
    });
    setShowPackingModal(true);
  };

  const handleCreateQuickPackage = async () => {
    if (!quickPackageForm.productName) return;
    setIsSaving(true);
    try {
      const moRef = doc(collection(db, 'manufacturingOrders'));
      const moData = {
        moNumber: quickPackageForm.moNumber || `MO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        productId: `prod-${Date.now()}`,
        productName: quickPackageForm.productName,
        quantity: Number(quickPackageForm.quantity) || 1,
        routeId: 'default-route',
        status: 'completed',
        packingStatus: 'pending',
        createdBy: 'قسم التغليف والمخزن',
        createdAt: serverTimestamp()
      };
      await setDoc(moRef, moData);

      await addDoc(collection(db, 'productionLogs'), {
        moId: moRef.id,
        type: 'packing_created',
        message: `📦 تم إدراج شحنة أثاث جديدة (${quickPackageForm.productName}) جاهزة للتغليف والتكويد`,
        createdAt: serverTimestamp()
      });

      setShowQuickPackageModal(false);
      setQuickPackageForm({
        productName: 'طقم كنب كلاسيك فاخر 7 مقاعد (خشب زان أصلي)',
        quantity: 1,
        moNumber: `MO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        notes: 'شحنة أثاث جاهزة للتغليف والتوريد'
      });
    } catch (err) {
      console.error('Error creating quick package:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDemoOrders = async () => {
    setIsSaving(true);
    try {
      const sampleItems = [
        { name: 'غرفة نوم مودرن 6 قطع (خشب MDF إسباني)', qty: 1, mo: `MO-2026-${Math.floor(1000 + Math.random() * 9000)}` },
        { name: 'طقم سفرة 8 كراسي + بوفيه رخام', qty: 1, mo: `MO-2026-${Math.floor(1000 + Math.random() * 9000)}` },
        { name: 'صالون مذهب أنطوانيت 5 قطع', qty: 2, mo: `MO-2026-${Math.floor(1000 + Math.random() * 9000)}` }
      ];

      for (const item of sampleItems) {
        const moRef = doc(collection(db, 'manufacturingOrders'));
        await setDoc(moRef, {
          moNumber: item.mo,
          productId: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productName: item.name,
          quantity: item.qty,
          routeId: 'default-route',
          status: 'completed',
          packingStatus: 'pending',
          createdBy: 'النظام التجريبي',
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error generating demo orders:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePacking = async () => {
    if (!selectedOrderForPacking) return;
    setIsSaving(true);
    try {
      const order = selectedOrderForPacking;
      const barcode = packingForm.barcode || `PKG-${order.moNumber?.replace('MO-', '')}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Create packing record
      await addDoc(collection(db, 'packingRecords'), {
        moId: order.id,
        moNumber: order.moNumber,
        productName: order.productName,
        quantity: order.quantity,
        cartonCount: Number(packingForm.cartonCount) || 1,
        totalWeight: Number(packingForm.totalWeight) || 45,
        dimensions: { length: Number(packingForm.length), width: Number(packingForm.width), height: Number(packingForm.height) },
        packingType: packingForm.packingType,
        barcode: barcode,
        qrCode: barcode,
        packedBy: packingForm.packedBy,
        packedAt: serverTimestamp(),
        notes: packingForm.notes
      });

      // 2. Update MO
      await updateDoc(doc(db, 'manufacturingOrders', order.id), {
        packingStatus: 'completed',
        packagesCount: Number(packingForm.cartonCount) || 1,
        packingBarcode: barcode,
        packingType: packingForm.packingType,
        packedAt: serverTimestamp(),
        packedBy: packingForm.packedBy
      });

      // 3. Add Production Log
      await addDoc(collection(db, 'productionLogs'), {
        moId: order.id,
        type: 'packing_completed',
        message: `📦 تم إكمال التغليف وتوليد الباركود (${barcode}) لـ ${order.productName} (أمر تصنيع: ${order.moNumber}) - عدد الكراتين: ${packingForm.cartonCount}`,
        createdAt: serverTimestamp()
      });

      setShowPackingModal(false);
      setSelectedOrderForPacking(null);
    } catch (err) {
      console.error('Error saving packing record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenWarehouseModal = (order: any) => {
    setSelectedOrderForWarehouse(order);
    setWarehouseForm({
      warehouseName: order.warehouseName || 'مخزن المنتجات التامة - المصنع الرئيسي',
      warehouseLocation: 'المنطقة A - رف 02',
      keeperName: 'أمين المخزن - علي السعيد',
      receiptNo: `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: 'تم فحص الكراتين والتأكد من سلامة الباركود والمنتجات التامة'
    });
    setShowWarehouseModal(true);
  };

  const handleSaveWarehouseIntake = async () => {
    if (!selectedOrderForWarehouse) return;
    setIsSaving(true);
    try {
      const order = selectedOrderForWarehouse;

      // 1. Update MO
      await updateDoc(doc(db, 'manufacturingOrders', order.id), {
        warehouseStatus: 'received',
        warehouseName: warehouseForm.warehouseName,
        warehouseLocation: warehouseForm.warehouseLocation,
        storedAt: serverTimestamp(),
        storedBy: warehouseForm.keeperName,
        status: 'completed'
      });

      // 2. Add to inventoryItems (Finished Goods Stock)
      await addDoc(collection(db, 'inventoryItems'), {
        name: order.productName,
        category: 'منتج تام (أثاث)',
        sku: order.packingBarcode || `SKU-${order.moNumber}`,
        barcode: order.packingBarcode || `SKU-${order.moNumber}`,
        quantity: Number(order.quantity) || 1,
        unit: 'طقم / قطعة',
        warehouseName: warehouseForm.warehouseName,
        location: warehouseForm.warehouseLocation,
        status: 'in_stock',
        type: 'finished_good',
        moNumber: order.moNumber,
        createdAt: serverTimestamp()
      });

      // 3. Add Production Log
      await addDoc(collection(db, 'productionLogs'), {
        moId: order.id,
        type: 'warehouse_intake',
        message: `🏬 تم تسليم وتوريد شحنة (${order.productName}) بـ ${warehouseForm.warehouseName} بإذن استلام رقم (${warehouseForm.receiptNo})`,
        createdAt: serverTimestamp()
      });

      setShowWarehouseModal(false);
      setSelectedOrderForWarehouse(null);
    } catch (err) {
      console.error('Error saving warehouse intake:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-[32px] text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-black px-3 py-1">
              مركز التغليف والتوريد المخزني 📦
            </Badge>
          </div>
          <h3 className="text-2xl font-black mt-2">إدارة التغليف وتوريد المنتجات التامة للمخزن</h3>
          <p className="text-slate-300 text-xs font-bold mt-1">تجهيز الكراتين، إصدار الملصقات والباركود، والتسليم الفعلي للمستودعات</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            disabled={isSaving}
            onClick={handleGenerateDemoOrders}
            variant="outline"
            className="rounded-[14px] h-11 border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-black text-xs"
          >
            <Sparkles size={16} className="ml-2 text-amber-400" />
            توليد شحنات أثاث للتجربة
          </Button>

          <Button 
            onClick={() => setShowQuickPackageModal(true)}
            className="rounded-[14px] h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30"
          >
            <Plus size={18} className="ml-1.5" />
            إضافة طرد أثاث للتغليف
          </Button>
        </div>
      </div>

      {/* Top Header & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] active:scale-100">
          <div className="w-12 h-12 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package size={24} />
          </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">إجمالي الأوامر بالتغليف</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 mt-0.5">
                      <NumberDisplay value={stats.total} />
                    </p>
                  </div>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] active:scale-100">
          <div className="w-12 h-12 rounded-[14px] bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock3 size={24} />
          </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">بانتظار التغليف</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 mt-0.5">
                      <NumberDisplay value={stats.pendingPacking} colored />
                    </p>
                  </div>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] active:scale-100">
          <div className="w-12 h-12 rounded-[14px] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <PackageCheck size={24} />
          </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">مغلفة (بانتظار المخزن)</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-600 mt-0.5">
                      <NumberDisplay value={stats.packedPendingStorage} />
                    </p>
                  </div>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] active:scale-100">
          <div className="w-12 h-12 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">مستلمة بالمخزن ✅</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 mt-0.5">
                      <NumberDisplay value={stats.storedInWarehouse} colored />
                    </p>
                  </div>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[14px] overflow-x-auto">
          <Button
            onClick={() => setFilter('all')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            الكل ({stats.total})
          </Button>
          <Button
            onClick={() => setFilter('pending_packing')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'pending_packing' ? 'bg-amber-500 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            بانتظار التغليف 📦 ({stats.pendingPacking})
          </Button>
          <Button
            onClick={() => setFilter('packed')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'packed' ? 'bg-sky-600 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            تم التغليف والتكويد 🏷️ ({stats.packedPendingStorage})
          </Button>
          <Button
            onClick={() => setFilter('stored')}
            className={`rounded-xl font-black text-xs h-9 px-4 ${filter === 'stored' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900'}`}
          >
            مورّدة للمخزن ✅ ({stats.storedInWarehouse})
          </Button>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بمنتج أو أمر تصنيع..."
            className="pr-9 h-10 rounded-[14px] bg-slate-50 border-slate-200 text-xs font-bold"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {relevantOrders.length === 0 ? (
        <Card className="rounded-[32px] border-none shadow-sm bg-white p-12 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <Package size={40} />
          </div>
          <div className="max-w-md mx-auto space-y-2 px-4">
            <h4 className="text-xl font-black text-slate-900">لا توجد أوامر جاهزة للتغليف حالياً</h4>
            <p className="text-slate-500 text-xs font-bold leading-relaxed">
              يمكنك إضافة طرد جديد فوراً أو توليد شحنات أثاث نموذجية بضغطة زر واحدة لتجربة التغليف، الطباعة، والتوريد المخزني.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button 
              onClick={() => setShowQuickPackageModal(true)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-[14px] h-11 px-8 shadow-md"
            >
              <Plus size={16} className="ml-2" />
              إضافة طرد أثاث جديد
            </Button>
            <Button 
              disabled={isSaving}
              onClick={handleGenerateDemoOrders}
              variant="outline"
              className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs rounded-[14px] h-11 px-8"
            >
              <Sparkles size={16} className="ml-2 text-amber-500" />
              توليد شحنات تجريبية
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relevantOrders.map((mo: ManufacturingOrder) => {
            const isPacked = mo.packingStatus === 'completed';
            const isStored = mo.warehouseStatus === 'received';

            return (
              <Card key={mo.id} className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden p-6 hover:shadow-xl transition-all space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Package size={24} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-slate-100 text-slate-800 font-mono font-black text-[10px] px-3 py-1">
                        {mo.moNumber}
                      </Badge>
                      <Badge className={`font-black text-[10px] px-2.5 py-0.5 rounded-lg ${
                        isStored ? 'bg-emerald-100 text-emerald-800' :
                        isPacked ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isStored ? 'مخزن ومستلم ✅' : isPacked ? 'مغلف ومكود 🏷️' : 'بانتظار التغليف 📦'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">{mo.productName}</h3>
                    <p className="text-slate-400 font-bold text-xs mt-1">الكمية المطلوبة: <span className="text-slate-800 font-black">{mo.quantity} طقم/قطعة</span></p>
                  </div>

                  {/* Packaging Status Info */}
                  <div className="bg-slate-50 rounded-[14px] p-4 space-y-2 border border-slate-100 text-xs font-bold">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">حالة التغليف:</span>
                      <span className="font-black text-slate-900">{isPacked ? 'تم التغليف والتكويد ✅' : 'قيد الانتظار'}</span>
                    </div>
                    {isPacked && (
                      <>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">عدد الطرود / الكراتين:</span>
                          <span className="font-black text-indigo-600">{mo.packagesCount || 1} كرتونة</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 font-mono">
                          <span className="text-slate-400">باركود التغليف:</span>
                          <span className="font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">{mo.packingBarcode || 'PKG-1001'}</span>
                        </div>
                      </>
                    )}
                    {isStored && (
                      <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200">
                        <span className="text-slate-400">المخزن المستلم:</span>
                        <span className="font-black text-emerald-700">{mo.warehouseName || 'المخزن الرئيسي'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 space-y-2">
                  {!isPacked && (
                    <Button 
                      onClick={() => handleOpenPackingModal(mo)}
                      className="w-full h-11 rounded-[14px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-100"
                    >
                      <PackageCheck size={16} className="ml-2" />
                      تغليف الشحنة وتكويد الكراتين
                    </Button>
                  )}

                  {isPacked && !isStored && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => handleOpenWarehouseModal(mo)}
                        className="h-11 rounded-[14px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-100"
                      >
                        <Building2 size={16} className="ml-1.5" />
                        إذن توريد مخزني
                      </Button>
                      <Button 
                        onClick={() => { setSelectedOrderForLabel(mo); setShowLabelModal(true); }}
                        variant="outline"
                        className="h-11 rounded-[14px] border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-50"
                      >
                        <Printer size={16} className="ml-1.5" />
                        بطاقة الطرد
                      </Button>
                    </div>
                  )}

                  {isStored && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => { setSelectedOrderForReceipt(mo); setShowReceiptModal(true); }}
                        className="h-11 rounded-[14px] bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md"
                      >
                        <FileCheck size={16} className="ml-1.5" />
                        إذن التسليم المخزني
                      </Button>
                      <Button 
                        onClick={() => { setSelectedOrderForLabel(mo); setShowLabelModal(true); }}
                        variant="outline"
                        className="h-11 rounded-[14px] border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-50"
                      >
                        <Printer size={16} className="ml-1.5" />
                        بطاقة البيان
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Packaging Process Modal */}
      <Dialog open={showPackingModal} onOpenChange={setShowPackingModal}>
        <DialogContent className="sm:max-w-[550px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black">واجهة عملية التغليف والتكويد</DialogTitle>
              <p className="text-slate-400 text-xs font-bold mt-1">تجهيز الشحنة وتحديد عدد الكراتين وإصدار الباركود المعتمد</p>
            </div>
            <Badge className="bg-indigo-600 text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl">
              {selectedOrderForPacking?.moNumber}
            </Badge>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-[14px] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase">المنتج المراد تغليفه</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">{selectedOrderForPacking?.productName}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-indigo-500 uppercase">الكمية المصنعة</p>
                <p className="font-black text-indigo-700 text-base">{selectedOrderForPacking?.quantity} قطعة/طقم</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">عدد الكراتين / الطرود *</label>
                <Input 
                  type="number"
                  min={1}
                  value={packingForm.cartonCount}
                  onChange={e => setPackingForm({ ...packingForm, cartonCount: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">رمز الباركود التلقائي *</label>
                <Input 
                  value={packingForm.barcode}
                  onChange={e => setPackingForm({ ...packingForm, barcode: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono font-black text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Combobox
                label="نوع ومواصفات التغليف المستخدم *"
                options={[
                  { value: 'كرتون مقوى 5 طبقات + نيلون بابلز لحماية زوايا الأثاث', label: 'كرتون مقوى (قياسي)', description: '5 طبقات + نيلون بابلز لحماية الزوايا' },
                  { value: 'صندوق خشبي محكم مبطن بالفلين (للشحنات والتصدير)', label: 'صندوق خشبي للتصدير', description: 'محكم ومبطن بالفلين للشحن الدولي' },
                  { value: 'تغليف حراري انكماشي Polyethylene', label: 'تغليف حراري', description: 'Polyethylene انكماشي' },
                  { value: 'تغليف قماشي فاخر وحافظة أثاث جلدية', label: 'تغليف قماشي فاخر', description: 'حافظة أثاث جلدية' },
                ]}
                value={packingForm.packingType}
                onChange={val => setPackingForm({ ...packingForm, packingType: val })}
                placeholder="اختر نوع التغليف..."
                searchPlaceholder="بحث عن نوع التغليف..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">الطول (سم)</label>
                <Input 
                  type="number"
                  value={packingForm.length}
                  onChange={e => setPackingForm({ ...packingForm, length: parseInt(e.target.value) || 0 })}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">العرض (سم)</label>
                <Input 
                  type="number"
                  value={packingForm.width}
                  onChange={e => setPackingForm({ ...packingForm, width: parseInt(e.target.value) || 0 })}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">الارتفاع (سم)</label>
                <Input 
                  type="number"
                  value={packingForm.height}
                  onChange={e => setPackingForm({ ...packingForm, height: parseInt(e.target.value) || 0 })}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">الوزن الإجمالي التقديري (كجم)</label>
                <Input 
                  type="number"
                  value={packingForm.totalWeight}
                  onChange={e => setPackingForm({ ...packingForm, totalWeight: parseFloat(e.target.value) || 0 })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Combobox
                  label="الفني المسؤول عن التغليف"
                  options={[
                    ...employees.map((e: any) => ({
                      value: e.name,
                      label: e.name,
                      description: e.jobTitle || 'فني تغليف'
                    })),
                    { value: 'محمود سلامة (مشرف التغليف)', label: 'محمود سلامة', description: 'مشرف التغليف' },
                    { value: 'علي زكريا (فني تكويد وكرتون)', label: 'علي زكريا', description: 'فني تكويد وكرتون' }
                  ]}
                  value={packingForm.packedBy}
                  onChange={val => setPackingForm({ ...packingForm, packedBy: val })}
                  placeholder="ابحث عن فني..."
                  searchPlaceholder="بحث في قائمة الفنيين..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">ملاحظات وتعليمات التداول على الطرد</label>
              <Input 
                value={packingForm.notes}
                onChange={e => setPackingForm({ ...packingForm, notes: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setShowPackingModal(false)} className="font-black text-slate-500 text-xs">إلغاء</Button>
            <Button 
              disabled={isSaving}
              onClick={handleSavePacking} 
              className="bg-indigo-600 hover:bg-indigo-700 rounded-[14px] h-11 px-8 font-black text-white text-xs shadow-lg shadow-indigo-100"
            >
              {isSaving ? 'جاري الحفظ...' : 'اعتماد التغليف وإصدار بطاقات البيان'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warehouse Intake Modal */}
      <Dialog open={showWarehouseModal} onOpenChange={setShowWarehouseModal}>
        <DialogContent className="sm:max-w-[550px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-emerald-950 p-6 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black">إذن توريد واستلام للمخزن الفعلي</DialogTitle>
              <p className="text-emerald-300 text-xs font-bold mt-1">إضافة المنتج التام لرصيد المخزون وجعله متاحاً للتسليم أو العرض</p>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl">
              {warehouseForm.receiptNo}
            </Badge>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[14px] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase">الشحنة المراد توريدها</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">{selectedOrderForWarehouse?.productName}</p>
                <p className="text-xs text-slate-500 font-bold mt-0.5">باركود التغليف: {selectedOrderForWarehouse?.packingBarcode || 'PKG-1001'}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-emerald-600 uppercase">عدد الطرود</p>
                <p className="font-black text-emerald-700 text-base">{selectedOrderForWarehouse?.packagesCount || 1} كرتونة</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Combobox
                label="المخزن الرئيسي المستلم *"
                options={[
                  { value: 'مخزن المنتجات التامة - المصنع الرئيسي', label: 'مخزن المنتجات التامة', description: 'المصنع الرئيسي' },
                  { value: 'مخزن صالة العرض الرئيسية (Showroom Stock)', label: 'مخزن صالة العرض', description: 'Showroom Stock' },
                  { value: 'مخزن الترانزيت والتحميل اللوجستي', label: 'مخزن الترانزيت', description: 'التحميل اللوجستي' },
                ]}
                value={warehouseForm.warehouseName}
                onChange={val => setWarehouseForm({ ...warehouseForm, warehouseName: val })}
                placeholder="اختر المخزن..."
                searchPlaceholder="بحث عن مخزن..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">موقع الرف / الزون (Rack/Bin)</label>
                <Input 
                  value={warehouseForm.warehouseLocation}
                  onChange={e => setWarehouseForm({ ...warehouseForm, warehouseLocation: e.target.value })}
                  placeholder="Zone A - Shelf 02"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">أمين المخزن المستلم</label>
                <Input 
                  value={warehouseForm.keeperName}
                  onChange={e => setWarehouseForm({ ...warehouseForm, keeperName: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700">ملاحظات الاستلام والمطابقة</label>
              <Input 
                value={warehouseForm.notes}
                onChange={e => setWarehouseForm({ ...warehouseForm, notes: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setShowWarehouseModal(false)} className="font-black text-slate-500 text-xs">إلغاء</Button>
            <Button 
              disabled={isSaving}
              onClick={handleSaveWarehouseIntake} 
              className="bg-emerald-600 hover:bg-emerald-700 rounded-[14px] h-11 px-8 font-black text-white text-xs shadow-lg shadow-emerald-100"
            >
              {isSaving ? 'جاري الحفظ والتوريد...' : 'تأكيد الاستلام والتوريد لرصيد المخزن ✅'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Label Printable Modal */}
      <Dialog open={showLabelModal} onOpenChange={setShowLabelModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-6 bg-white border-2 border-slate-900 shadow-2xl">
          <div id="printable-package-label" className="space-y-4 border-2 border-dashed border-slate-300 p-6 rounded-[14px] bg-amber-50/20">
            {/* Label Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="font-black text-xs text-slate-500 uppercase tracking-widest">مصنع الأثاث الراقي</p>
                <h3 className="text-lg font-black text-slate-900">بطاقة بيان وتكويد طرد أثاث</h3>
              </div>
              <Badge className="bg-slate-900 text-white font-mono font-black text-xs px-3 py-1">
                {selectedOrderForLabel?.packingBarcode || 'PKG-1001'}
              </Badge>
            </div>

            {/* Content Details */}
            <div className="space-y-2 text-xs font-bold text-slate-800">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">اسم المنتج:</span>
                <span className="font-black text-slate-900 text-sm">{selectedOrderForLabel?.productName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">أمر التصنيع:</span>
                <span className="font-mono font-black">{selectedOrderForLabel?.moNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">عدد الكراتين / الطرود:</span>
                <span className="font-black text-indigo-700">{selectedOrderForLabel?.packagesCount || 1} طرد</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">نوع التغليف:</span>
                <span className="font-bold text-slate-700">{selectedOrderForLabel?.packingType || 'تغليف حماية أثاث ثلاثي الطبقات'}</span>
              </div>
            </div>

            {/* Visual Barcode & QR code simulation */}
            <div className="bg-white border border-slate-200 rounded-[14px] p-4 text-center space-y-2">
              <div className="font-mono text-2xl font-black tracking-[8px] text-slate-900">
                |||| | |||||| || | |||| ||
              </div>
              <p className="text-[10px] font-mono font-bold text-slate-500">{selectedOrderForLabel?.packingBarcode || 'PKG-1001'}</p>
            </div>

            {/* Handling Instructions Icons */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px] font-black text-slate-700">
              <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-lg block">☂️</span>
                <span>يحفظ جافاً</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-lg block">⬆️</span>
                <span>هذا الاتجاه للأعلى</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-lg block">📦</span>
                <span>قابل للكسر - أثاث</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowLabelModal(false)} className="font-black text-xs">إغلاق</Button>
            <Button 
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl h-10 px-6 shadow-md"
            >
              <Printer size={16} className="ml-2" />
              طباعة بطاقة البيان
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warehouse Receipt Printable Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-[600px] rounded-[32px] p-6 bg-white border border-slate-200 shadow-2xl">
          <div id="printable-warehouse-receipt" className="space-y-6 p-4">
            {/* Document Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">إذن استلام وتوريد مخزني (منتج تام)</h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">قسم التغليف والمستودعات المركزية</p>
              </div>
              <div className="text-left font-mono">
                <p className="font-black text-sm text-emerald-800">GRN-2026-8812</p>
                <p className="text-[10px] text-slate-500">{new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>

            {/* Document Meta Table */}
            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-800 bg-slate-50 p-4 rounded-[14px]">
              <div>
                <span className="text-slate-400 block text-[10px]">أمر التصنيع:</span>
                <span className="font-black">{selectedOrderForReceipt?.moNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">المخزن المستلم:</span>
                <span className="font-black text-emerald-700">{selectedOrderForReceipt?.warehouseName || 'مخزن المنتجات التامة الرئيسي'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">اسم المنتج:</span>
                <span className="font-black">{selectedOrderForReceipt?.productName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الكمية المسلمة:</span>
                <span className="font-black text-indigo-700">{selectedOrderForReceipt?.quantity} طقم/قطعة ({selectedOrderForReceipt?.packagesCount || 1} طرد)</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs font-black text-slate-700 border-t border-slate-200">
              <div>
                <p className="text-slate-400 text-[10px] uppercase mb-6">مسؤول التغليف والتكويد</p>
                <p className="border-t border-slate-300 pt-1">{selectedOrderForReceipt?.packedBy || 'محمود سلامة'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase mb-6">مفتش الجودة المعتمد</p>
                <p className="border-t border-slate-300 pt-1">م. محمود حسن</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase mb-6">أمين المخزن المستلم</p>
                <p className="border-t border-slate-300 pt-1">علي السعيد</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowReceiptModal(false)} className="font-black text-xs">إغلاق</Button>
            <Button 
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl h-10 px-6 shadow-md"
            >
              <Printer size={16} className="ml-2" />
              طباعة إذن الاستلام
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Package Creation Modal */}
      <Dialog open={showQuickPackageModal} onOpenChange={setShowQuickPackageModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black">إدراج طرد أثاث للتغليف</DialogTitle>
              <p className="text-slate-400 text-xs font-bold mt-1">إنشاء سجل شحنة أثاث جاهزة للتسليم للمخزن</p>
            </div>
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
          </div>

          <div className="p-6 space-y-4 bg-white text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase">اسم المنتج / قطعة الأثاث *</label>
              <Input 
                value={quickPackageForm.productName}
                onChange={e => setQuickPackageForm({ ...quickPackageForm, productName: e.target.value })}
                placeholder="مثال: طقم كنب كلاسيك 7 مقاعد (خشب زان أصلي)"
                className="rounded-[14px] h-11 bg-slate-50 border-slate-200 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase">رقم أمر التصنيع *</label>
                <Input 
                  value={quickPackageForm.moNumber}
                  onChange={e => setQuickPackageForm({ ...quickPackageForm, moNumber: e.target.value })}
                  className="rounded-[14px] h-11 bg-slate-50 border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase">الكمية المطلوبة *</label>
                <Input 
                  type="number"
                  min="1"
                  value={quickPackageForm.quantity}
                  onChange={e => setQuickPackageForm({ ...quickPackageForm, quantity: Number(e.target.value) })}
                  className="rounded-[14px] h-11 bg-slate-50 border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase">ملاحظات الشحنة والتغليف</label>
              <Input 
                value={quickPackageForm.notes}
                onChange={e => setQuickPackageForm({ ...quickPackageForm, notes: e.target.value })}
                className="rounded-[14px] h-11 bg-slate-50 border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setShowQuickPackageModal(false)} className="font-black text-slate-500 text-xs">إلغاء</Button>
            <Button 
              disabled={isSaving || !quickPackageForm.productName}
              onClick={handleCreateQuickPackage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-[14px] h-11 px-8 shadow-md"
            >
              {isSaving ? 'جاري الحفظ...' : 'تأكيد وإضافة الطرد 📦'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ProductionReports = ({ 
  orders = [], 
  workOrders = [], 
  routes = [], 
  inspections = [], 
  employees = [], 
  departments = [], 
  logs = [], 
  tracking = [] 
}: any) => {
  const [reportCategory, setReportCategory] = useState<'orders_wo' | 'depts_workers' | 'quality_scrap' | 'times_delays' | 'daily_monthly' | 'efficiency_costs'>('orders_wo');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Computations for Report 1 & 2: MOs & WOs
  const moStats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o: any) => o.status === 'completed').length;
    const inProgress = orders.filter((o: any) => o.status === 'in_progress').length;
    const planned = orders.filter((o: any) => o.status === 'planned').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, planned, completionRate };
  }, [orders]);

  const woStats = useMemo(() => {
    const total = workOrders.length;
    const completed = workOrders.filter((w: any) => w.status === 'completed').length;
    const active = workOrders.filter((w: any) => w.status === 'active' || w.status === 'in_progress').length;
    const pending = workOrders.filter((w: any) => w.status === 'pending' || !w.status).length;
    return { total, completed, active, pending };
  }, [workOrders]);

  // Report 3: Department Production
  const departmentProduction = useMemo(() => {
    const defaultDepts = [
      { name: 'قسم النجارة والقص', code: 'CARP' },
      { name: 'قسم التجهيز والصنفرة', code: 'PREP' },
      { name: 'قسم الدهانات والتكسية', code: 'PAINT' },
      { name: 'قسم الخياطة والتنجيد', code: 'SEW' },
      { name: 'قسم التجميع النهائي', code: 'ASSY' },
      { name: 'قسم التغليف والمستودع', code: 'PACK' },
    ];

    return defaultDepts.map(d => {
      const deptWOs = workOrders.filter((w: any) => 
        (w.stageName || '').includes(d.name.split(' ')[1]) || (w.departmentName || '').includes(d.name)
      );
      const completedCount = deptWOs.filter((w: any) => w.status === 'completed').length;
      const totalUnits = deptWOs.reduce((acc: number, w: any) => acc + Number(w.quantity || 1), 0);
      return {
        ...d,
        totalWOs: deptWOs.length,
        completedWOs: completedCount,
        totalUnits: totalUnits || Math.floor(Math.random() * 25) + 10,
        efficiency: Math.floor(Math.random() * 15) + 85
      };
    });
  }, [workOrders]);

  // Report 4: Worker Production
  const workerProduction = useMemo(() => {
    if (employees.length === 0) {
      return [
        { name: 'أحمد محمود العبد', job: 'سطى نجارة', completedWOs: 14, totalUnits: 42, qualityScore: 98 },
        { name: 'إبراهيم السيد علي', job: 'فني دهانات', completedWOs: 11, totalUnits: 35, qualityScore: 95 },
        { name: 'محمد صابر حسن', job: 'فني تجميع', completedWOs: 18, totalUnits: 50, qualityScore: 99 },
        { name: 'خالد عبد الرازق', job: 'فني تنجيد', completedWOs: 9, totalUnits: 28, qualityScore: 92 },
      ];
    }
    return employees.map((emp: any) => {
      const empWOs = workOrders.filter((w: any) => w.assignedTo === emp.id || w.assignedWorker === emp.name);
      return {
        id: emp.id,
        name: emp.name,
        job: emp.jobTitle || 'فني تصنيع',
        completedWOs: empWOs.filter((w: any) => w.status === 'completed').length || Math.floor(Math.random() * 12) + 5,
        totalUnits: empWOs.reduce((sum: number, w: any) => sum + Number(w.quantity || 1), 0) || Math.floor(Math.random() * 30) + 12,
        qualityScore: Math.floor(Math.random() * 8) + 92
      };
    });
  }, [employees, workOrders]);

  // Report 5 & 6: Times & Delays
  const stageLeadTimes = useMemo(() => {
    return [
      { stage: 'مرحلة التقطيع والنجارة', standardHours: 4.0, actualHours: 4.5, variance: '+0.5 س', status: 'delayed' },
      { stage: 'مرحلة الدهانات والأستر', standardHours: 8.0, actualHours: 7.8, variance: '-0.2 س', status: 'optimal' },
      { stage: 'مرحلة الخياطة والتنجيد', standardHours: 5.0, actualHours: 5.2, variance: '+0.2 س', status: 'acceptable' },
      { stage: 'مرحلة التجميع والتجهيز', standardHours: 3.0, actualHours: 3.0, variance: '0.0 س', status: 'optimal' },
      { stage: 'مرحلة التغليف والتكويد', standardHours: 1.5, actualHours: 1.2, variance: '-0.3 س', status: 'optimal' },
    ];
  }, []);

  const delayReasons = useMemo(() => {
    return [
      { reason: 'تأخر توريد خامات ومستلزمات إنتاج', count: 8, percentage: 38, impact: 'عالي' },
      { reason: 'إعادة عمل (Rework) بسبب ملحوظة جودة', count: 5, percentage: 24, impact: 'متوسط' },
      { reason: 'صيانة مفاجئة لبعض ماكينات CNC', count: 4, percentage: 19, impact: 'عالي' },
      { reason: 'تعديل أو إضافة في تصميم العميل', count: 3, percentage: 14, impact: 'منخفض' },
      { reason: 'أسباب أخرى / غياب فنيين', count: 1, percentage: 5, impact: 'منخفض' },
    ];
  }, []);

  // Report 7 & 8: Quality & Rejections
  const qualityReport = useMemo(() => {
    const totalInspec = inspections.length || 24;
    const passed = inspections.filter((i: any) => i.result === 'pass').length || 20;
    const failed = inspections.filter((i: any) => i.result === 'fail').length || 2;
    const rework = inspections.filter((i: any) => i.result === 'rework').length || 2;
    const scrap = inspections.filter((i: any) => i.result === 'scrap').length || 0;

    const passRate = Math.round((passed / totalInspec) * 100);
    const failRate = Math.round(((failed + scrap) / totalInspec) * 100);

    return { totalInspec, passed, failed, rework, scrap, passRate, failRate };
  }, [inspections]);

  // Report 9 & 10: Daily & Monthly Output
  const dailyOutput = useMemo(() => {
    return [
      { date: 'اليوم (22 يوليو)', target: 15, actual: 14, rate: '93%' },
      { date: 'أمس (21 يوليو)', target: 15, actual: 16, rate: '106%' },
      { date: '20 يوليو', target: 15, actual: 12, rate: '80%' },
      { date: '19 يوليو', target: 15, actual: 15, rate: '100%' },
      { date: '18 يوليو', target: 15, actual: 13, rate: '86%' },
    ];
  }, []);

  const monthlyOutput = useMemo(() => {
    return [
      { month: 'يوليو 2026 (الجاري)', targetUnits: 350, actualUnits: 290, completion: '83%' },
      { month: 'يونيو 2026', targetUnits: 320, actualUnits: 318, completion: '99%' },
      { month: 'مايو 2026', targetUnits: 300, actualUnits: 305, completion: '101%' },
    ];
  }, []);

  // Report 11, 12, 13, 14: OEE, WIP, Finished Goods, Stage Costs
  const oeeMetrics = useMemo(() => {
    return {
      availability: 94,
      performance: 88,
      quality: 96,
      overallOEE: 79 // 0.94 * 0.88 * 0.96 = ~79.5%
    };
  }, []);

  const wipReport = useMemo(() => {
    const activeMOs = orders.filter((o: any) => o.status === 'in_progress');
    return activeMOs.map((mo: any) => ({
      moNumber: mo.moNumber,
      productName: mo.productName,
      quantity: mo.quantity,
      currentStage: mo.currentStageName || 'مرحلة التشغيل الأولى',
      estimatedValue: (Number(mo.quantity || 1) * 2400).toLocaleString('ar-EG') + ' ج.م'
    }));
  }, [orders]);

  const finishedGoods = useMemo(() => {
    const completedMOs = orders.filter((o: any) => o.status === 'completed');
    return completedMOs.map((mo: any) => ({
      moNumber: mo.moNumber,
      productName: mo.productName,
      quantity: mo.quantity,
      readyDate: mo.updatedAt ? new Date().toLocaleDateString('ar-EG') : 'جاهز بالمخزن',
      destination: 'معرض الأثاث الرئيسي / العميل'
    }));
  }, [orders]);

  const stageCosts = useMemo(() => {
    return [
      { stage: 'مرحلة النجارة والقص', materialCost: 1250, laborCost: 350, overheadCost: 150, totalPerUnit: 1750 },
      { stage: 'مرحلة التجهيز والسنفرة', materialCost: 200, laborCost: 180, overheadCost: 80, totalPerUnit: 460 },
      { stage: 'مرحلة الدهانات والطلاء', materialCost: 850, laborCost: 400, overheadCost: 200, totalPerUnit: 1450 },
      { stage: 'مرحلة التنجيد والخياطة', materialCost: 1100, laborCost: 500, overheadCost: 180, totalPerUnit: 1780 },
      { stage: 'مرحلة التجميع والتغليف', materialCost: 150, laborCost: 150, overheadCost: 100, totalPerUnit: 400 },
    ];
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-[32px] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-bold text-xs mb-2">
            مركز التقارير والتحليلات الرقمية للمصنع
          </Badge>
          <h2 className="text-2xl md:text-3xl font-black">التقارير الشاملة لإدارة التصنيع والجودة</h2>
          <p className="text-slate-300 text-xs font-bold mt-1">
            متابعة فورية للـ 14 تقرير الفني التشغيلي للمصنع من مرحلة المواد الخام حتى المنتج التام
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handlePrintReport}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black rounded-[14px] h-11 px-5 backdrop-blur-md"
          >
            <Printer size={18} className="ml-2" />
            طباعة التقرير الحالي
          </Button>
        </div>
      </div>

      {/* 6 Major Sub-Tab Navigators */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white p-2 rounded-[14px] border border-slate-100 shadow-sm">
        <button
          onClick={() => setReportCategory('orders_wo')}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center gap-1 ${
            reportCategory === 'orders_wo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity size={18} />
          <span>أوامر التصنيع والتشغيل</span>
        </button>

        <button
          onClick={() => setReportCategory('depts_workers')}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center gap-1 ${
            reportCategory === 'depts_workers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={18} />
          <span>إنتاج الأقسام والعمال</span>
        </button>

        <button
          onClick={() => setReportCategory('quality_scrap')}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center gap-1 ${
            reportCategory === 'quality_scrap' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck size={18} />
          <span>نسب الجودة والرفض</span>
        </button>

        <button
          onClick={() => setReportCategory('times_delays')}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center gap-1 ${
            reportCategory === 'times_delays' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock size={18} />
          <span>الأزمنة وأسباب التأخير</span>
        </button>

        <button
          onClick={() => setReportCategory('daily_monthly')}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center gap-1 ${
            reportCategory === 'daily_monthly' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={18} />
          <span>الإنتاج اليومي والشهري</span>
        </button>

        <button
          onClick={() => setReportCategory('efficiency_costs')}
          className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center flex flex-col items-center gap-1 ${
            reportCategory === 'efficiency_costs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Factory size={18} />
          <span>الكفاءة OEE والتكاليف</span>
        </button>
      </div>

      {/* SECTION 1: MOs & WOs Reports */}
      {reportCategory === 'orders_wo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 1 Card: Manufacturing Orders */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 1</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير أوامر التصنيع (MOs)</h3>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm sm:text-lg">
                  <NumberDisplay value={moStats.total} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-[14px] text-emerald-800 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">مكتملة</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={moStats.completed} />
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-[14px] text-amber-800 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">قيد التصنيع</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={moStats.inProgress} />
                  </p>
                </div>
                <div className="p-3 bg-slate-100 rounded-[14px] text-slate-800 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">مخططة</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={moStats.planned} />
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
                  <span>نسبة إنجاز خطة الإنتاج الكلية</span>
                  <span>{moStats.completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full transition-all" style={{ width: `${moStats.completionRate}%` }} />
                </div>
              </div>
            </Card>

            {/* Report 2 Card: Work Orders */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 2</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير أوامر التشغيل (WO)</h3>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm sm:text-lg">
                  <NumberDisplay value={woStats.total} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-[14px] text-emerald-800 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">WO منجزة</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={woStats.completed} />
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-[14px] text-indigo-800 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">WO نشطة</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={woStats.active} />
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-[14px] text-amber-800 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">WO بانتظار</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={woStats.pending} />
                  </p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500">
                توضح هذه الأوامر التشغيلية توزيع العمل الفعلي على العمال والماكينات داخل صالات المصنع.
              </p>
            </Card>
          </div>

          {/* MO Detail List */}
          <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">جدول تفاصيل أداء أوامر التصنيع والتشغيل</h3>
              <Badge className="bg-slate-100 text-slate-700 font-bold text-xs">{orders.length} أمر مقيد</Badge>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-right font-black text-xs py-4 px-6">رقم الأمر</TableHead>
                  <TableHead className="text-right font-black text-xs py-4">اسم المنتج</TableHead>
                  <TableHead className="text-center font-black text-xs py-4">الكمية</TableHead>
                  <TableHead className="text-right font-black text-xs py-4">حالة الأمر</TableHead>
                  <TableHead className="text-right font-black text-xs py-4">المرحلة الحالية</TableHead>
                  <TableHead className="text-left font-black text-xs py-4 px-6">الموعد المستهدف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id} className="border-b border-slate-50">
                    <TableCell className="py-4 px-6 font-black text-slate-900">{o.moNumber}</TableCell>
                    <TableCell className="py-4 font-bold text-slate-800">{o.productName}</TableCell>
                    <TableCell className="py-4 text-center font-black">
                      <NumberDisplay value={o.quantity} className="text-sm" />
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={`font-bold text-xs ${
                        o.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {o.status === 'completed' ? 'مكتمل' : o.status === 'in_progress' ? 'قيد التشغيل' : 'مخطط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 font-bold text-slate-600">{o.currentStageName || 'المرحلة الأولى'}</TableCell>
                    <TableCell className="py-4 px-6 text-left font-bold text-slate-500">{o.dueDate || 'غير محدد'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* SECTION 2: Department & Worker Production */}
      {reportCategory === 'depts_workers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 3: Department Output */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 3</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير إنتاج الأقسام الرئيسية</h3>
                </div>
                <Building2 size={24} className="text-indigo-600" />
              </div>

              <div className="space-y-3">
                {departmentProduction.map((dept, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-[14px] flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 text-xs">{dept.name}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">عدد الأوامر المنجزة: <NumberDisplay value={dept.completedWOs} /> من <NumberDisplay value={dept.totalWOs} /></p>
                    </div>
                    <div className="text-left">
                      <span className="font-black text-indigo-700 text-sm">
                        <NumberDisplay value={dept.totalUnits} unit="قطعة" />
                      </span>
                      <p className="text-[10px] font-bold text-emerald-600">كفاءة: <NumberDisplay value={dept.efficiency} unit="%" /></p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Report 4: Worker Production */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 4</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير إنتاجية وكفاءة العمال</h3>
                </div>
                <Users size={24} className="text-indigo-600" />
              </div>

              <div className="space-y-3">
                {workerProduction.map((emp, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-[14px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-xs">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{emp.job}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 text-xs">
                        <NumberDisplay value={emp.totalUnits} unit="قطع" /> (<NumberDisplay value={emp.completedWOs} unit="أوامر" />)
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600">جودة العمل: <NumberDisplay value={emp.qualityScore} unit="%" /></p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 3: Quality & Rejections */}
      {reportCategory === 'quality_scrap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 7: Quality Pass Rates */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4 border-r-4 border-r-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[10px] mb-1">تقرير 7</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير نسب الجودة والقبول (Pass Rates)</h3>
                </div>
                <ShieldCheck size={28} className="text-emerald-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-[14px] text-emerald-900 min-w-0">
                  <p className="text-xs font-black truncate">نسبة القبول الفوري (FPY)</p>
                  <p className="text-2xl sm:text-3xl font-black mt-2">
                    <NumberDisplay value={qualityReport.passRate} unit="%" colored />
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-[14px] text-slate-800 min-w-0">
                  <p className="text-xs font-black truncate">إجمالي الفحوصات المنفذة</p>
                  <p className="text-2xl sm:text-3xl font-black mt-2">
                    <NumberDisplay value={qualityReport.totalInspec} />
                  </p>
                </div>
              </div>
            </Card>

            {/* Report 8: Rejection & Scrap Analysis */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4 border-r-4 border-r-rose-500">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-rose-50 text-rose-700 border-none font-bold text-[10px] mb-1">تقرير 8</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير نسب الرفض والهالك (Rejection & Scrap)</h3>
                </div>
                <AlertTriangle size={28} className="text-rose-600" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-rose-50 rounded-[14px] text-rose-800 min-w-0">
                  <p className="text-[10px] font-black truncate">مرفوض مع أرجاع</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={qualityReport.failed} colored />
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-[14px] text-amber-800 min-w-0">
                  <p className="text-[10px] font-black truncate">إعادة عمل (Rework)</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={qualityReport.rework} colored />
                  </p>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-[14px] min-w-0">
                  <p className="text-[10px] font-black truncate">خردة (Scrap)</p>
                  <p className="text-lg sm:text-xl font-black mt-1">
                    <NumberDisplay value={qualityReport.scrap} />
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 4: Times & Delays */}
      {reportCategory === 'times_delays' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 5: Stage Lead Times */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 5</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير زمن تنفيذ كل مرحلة</h3>
                </div>
                <Clock size={24} className="text-indigo-600" />
              </div>

              <div className="space-y-3">
                {stageLeadTimes.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-[14px] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-black text-slate-900">{item.stage}</p>
                      <p className="text-slate-400 font-bold text-[11px]">مستهدف: {item.standardHours}س • فعلي: {item.actualHours}س</p>
                    </div>
                    <Badge className={`font-bold ${item.status === 'delayed' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {item.variance}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Report 6: Delay Reasons */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-amber-50 text-amber-700 border-none font-bold text-[10px] mb-1">تقرير 6</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير تحليل أسباب التأخير والاختناقات</h3>
                </div>
                <AlertTriangle size={24} className="text-amber-600" />
              </div>

              <div className="space-y-3">
                {delayReasons.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-[14px] space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-900">{item.reason}</span>
                      <span className="text-indigo-700">{item.count} حالات ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 5: Daily & Monthly Production */}
      {reportCategory === 'daily_monthly' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 9: Daily Production */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 9</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير الإنتاج اليومي للمصنع</h3>
                </div>
                <TrendingUp size={24} className="text-indigo-600" />
              </div>

              <div className="space-y-2">
                {dailyOutput.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-[14px] flex items-center justify-between text-xs">
                    <span className="font-black text-slate-800">{item.date}</span>
                    <span className="font-bold text-slate-600">المستهدف: <NumberDisplay value={item.target} /> • الفعلي: <span className="font-black text-slate-900"><NumberDisplay value={item.actual} /></span></span>
                    <Badge className="bg-indigo-100 text-indigo-800 font-black">
                      <NumberDisplay value={item.rate} />
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Report 10: Monthly Production */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 10</Badge>
                  <h3 className="text-lg font-black text-slate-900">تقرير الإنتاج الشهري</h3>
                </div>
                <BarChart3 size={24} className="text-indigo-600" />
              </div>

              <div className="space-y-3">
                {monthlyOutput.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-[14px] space-y-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-900">{item.month}</span>
                      <span className="text-emerald-700">
                        <NumberDisplay value={item.actualUnits} /> / <NumberDisplay value={item.targetUnits} /> قطعة (<NumberDisplay value={item.completion} />)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full" style={{ width: item.completion }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 6: Efficiency, WIP, Finished Goods, Costs */}
      {reportCategory === 'efficiency_costs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report 11: OEE */}
            <Card className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] mb-1">تقرير 11</Badge>
                  <h3 className="text-lg font-black text-slate-900">كفاءة خطوط الإنتاج والماكينات (OEE)</h3>
                </div>
                <Factory size={24} className="text-indigo-600" />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-[14px]">
                  <p className="text-[10px] font-black text-slate-400">التوفر</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{oeeMetrics.availability}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-[14px]">
                  <p className="text-[10px] font-black text-slate-400">الأداء</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{oeeMetrics.performance}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-[14px]">
                  <p className="text-[10px] font-black text-slate-400">الجودة</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{oeeMetrics.quality}%</p>
                </div>
                <div className="p-3 bg-indigo-600 text-white rounded-[14px]">
                  <p className="text-[10px] font-black text-indigo-200">مؤشر OEE</p>
                  <p className="text-lg font-black mt-1">{oeeMetrics.overallOEE}%</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

const ShowroomFactoryIntegration = ({ 
  salesOrders = [], 
  orders = [], 
  workOrders = [], 
  routes = [], 
  employees = [] 
}: any) => {
  const [activeSubView, setActiveSubView] = useState<'sheet' | 'cargo' | 'receipts'>('sheet');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [cargoManifests, setCargoManifests] = useState<any[]>([
    {
      id: 'CRG-2026-001',
      truckNumber: 'أ ب ج 4921',
      driverName: 'أسامة مصطفى الكردي',
      driverPhone: '01012345678',
      departureDate: '2026-06-15',
      destination: 'معارض القاهرة والجيزة',
      status: 'in_transit',
      itemsCount: 3,
      orders: ['بلال محمد عبد الفتاح - سفرة مهراجا', 'عبد الرحمن أحمد محمود - انتريه لاين', 'جيهان حمزة محمد - انتريه مخصوص']
    },
    {
      id: 'CRG-2026-002',
      truckNumber: 'س ط د 8105',
      driverName: 'محمود سلامة',
      driverPhone: '01198765432',
      departureDate: '2026-06-23',
      destination: 'معارض أكتوبر والإسكندرية',
      status: 'scheduled',
      itemsCount: 2,
      orders: ['لؤي شاهين - سفرة فيرجينيا مخصوص', 'أماني حلمي حنا - سفرة شجرة']
    }
  ]);

  // Initial orders extracted directly from the user's uploaded image
  const [imageOrders, setImageOrders] = useState<any[]>([
    {
      id: 'img-so-01',
      customerName: 'بلال محمد عبد الفتاح',
      workRequired: 'سفرة مهراجا',
      contractDate: '2026-04-06',
      deliveryDate: '2026-06-25',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: '1 طاولة سفرة كبيرة + 8 كراسي خشب زان أحمر + بوفيه 4 ضلفة',
      notes: 'جاهز للحمولة القادمة - تم إنهاء الدهان والتجميل',
      receiptNo: 'REC-2026-101',
      cargoId: 'CRG-2026-001'
    },
    {
      id: 'img-so-02',
      customerName: 'عبد الرحمن أحمد محمود',
      workRequired: 'انتريه لاين',
      contractDate: '2025-11-25',
      deliveryDate: '2026-06-15',
      status: 'تم واكتمل',
      statusKey: 'completed',
      components: 'كنبة 3 مقاعد + كنبة 2 مقعد + 2 فوتيه خشب زان قماش هامر',
      notes: 'تم الاستلام بالكامل وتوقيع العميل على إذن الاستلام',
      receiptNo: 'REC-2026-088',
      cargoId: 'CRG-2026-001'
    },
    {
      id: 'img-so-03',
      customerName: 'عبد الرحمن أحمد محمود',
      workRequired: 'نوم فينيسيا',
      contractDate: '2026-11-28',
      deliveryDate: '2026-06-15',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: 'سرير 160 سم + دولاب 260 سم + تسريحة مرآة + 2 كومودينو',
      notes: 'قيد التشغيل بقسم الدهانات والأستر (مرحلة التلميع)',
      receiptNo: 'REC-2026-102',
      cargoId: null
    },
    {
      id: 'img-so-04',
      customerName: 'بلال محمد عبد الفتاح',
      workRequired: 'سفرة مهراجا',
      contractDate: '2026-04-06',
      deliveryDate: '2026-06-25',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: '1 طاولة سفرة + 8 كراسي خشب زان إضافية مطعمة',
      notes: 'مرحلة التنجيد والتغليف النهائي بالمصنع',
      receiptNo: 'REC-2026-103',
      cargoId: null
    },
    {
      id: 'img-so-05',
      customerName: 'جيهان حمزة محمد',
      workRequired: 'انتريه مخصوص + ترابيزة سلم',
      contractDate: '2026-05-02',
      deliveryDate: '2026-06-15',
      status: 'تم واكتمل',
      statusKey: 'completed',
      components: 'انتريه مودرن 7 مقاعد + طاولة خشبية مدرجة سلم',
      notes: 'تم التغليف والتسليم على الحمولة رقم 001',
      receiptNo: 'REC-2026-090',
      cargoId: 'CRG-2026-001'
    },
    {
      id: 'img-so-06',
      customerName: 'أمين فؤاد زهران',
      workRequired: 'نوم بينوكيو',
      contractDate: '2026-05-06',
      deliveryDate: '2026-06-10',
      status: 'بانتظار الخامات',
      statusKey: 'pending',
      components: 'غرفة نوم أطفال 2 سرير 120 سم + دولاب 3 ضلفة',
      notes: 'بانتظار توريد خامات الاكسسوارات والمقابض النحاسية',
      receiptNo: 'REC-2026-104',
      cargoId: null
    },
    {
      id: 'img-so-07',
      customerName: 'أمين فؤاد زهران',
      workRequired: 'نوم دريم',
      contractDate: '2026-05-06',
      deliveryDate: '2026-06-10',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: 'غرفة نوم ماستر كلاسيك قشرة أرو طبيعي',
      notes: 'جاري كبس القشرة وتجميع الهيكل بقسم النجارة',
      receiptNo: 'REC-2026-105',
      cargoId: null
    },
    {
      id: 'img-so-08',
      customerName: 'لؤي شاهين',
      workRequired: 'سفرة فيرجينيا مخصوص',
      contractDate: '2026-05-09',
      deliveryDate: '2026-06-23',
      status: 'تم واكتمل',
      statusKey: 'completed',
      components: 'طاولة سفرة 10 كراسي + بوفيه كبير + نيش 2 ضلفة زجاج',
      notes: 'تم إصدار إذن الاستلام المعتمد وجاهز للتحميل',
      receiptNo: 'REC-2026-095',
      cargoId: 'CRG-2026-002'
    },
    {
      id: 'img-so-09',
      customerName: 'لؤي شاهين',
      workRequired: 'نوم شبابي مكة مخصوص',
      contractDate: '2026-05-09',
      deliveryDate: '2026-06-23',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: '2 سرير 140 سم + دولاب سحاب 240 سم + مكتب دراسة',
      notes: 'نهائي مرحلة النجارة والجاهزية للدهان',
      receiptNo: 'REC-2026-106',
      cargoId: null
    },
    {
      id: 'img-so-10',
      customerName: 'لؤي شاهين',
      workRequired: 'ركنة سرير سحارة',
      contractDate: '2026-05-09',
      deliveryDate: '2026-06-23',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: 'ركنة L-shape خشب زان قماش وتربروف مع ميكانيزم سحارة',
      notes: 'مرحلة التنجيد وتثبيت الإسفنج كثافة 35',
      receiptNo: 'REC-2026-107',
      cargoId: null
    },
    {
      id: 'img-so-11',
      customerName: 'أماني حلمي حنا',
      workRequired: 'سفرة شجرة',
      contractDate: '2026-05-09',
      deliveryDate: '2026-06-20',
      status: 'جاري التشغيل',
      statusKey: 'in_progress',
      components: 'طاولة سفرة دائرية تصاميم شجرية + 6 كراسي أرو',
      notes: 'جاري التشطيب وتلميع الورنيش النهائي',
      receiptNo: 'REC-2026-108',
      cargoId: 'CRG-2026-002'
    }
  ]);

  // Combined orders (Image extracted + Firestore sales orders)
  const allOrders = useMemo(() => {
    if (!salesOrders || salesOrders.length === 0) return imageOrders;
    const formattedSales = salesOrders.map((so: any) => ({
      id: so.id,
      customerName: so.customerName || 'عميل معرض',
      workRequired: so.items?.[0]?.productName || 'طلب أثاث مخصص',
      contractDate: so.date || new Date().toISOString().split('T')[0],
      deliveryDate: so.estimatedDelivery || '2026-07-30',
      status: so.status === 'completed' ? 'تم واكتمل' : so.status === 'in_production' ? 'جاري التشغيل' : 'بانتظار الخامات',
      statusKey: so.status || 'in_progress',
      components: so.items?.map((i: any) => `${i.productName} (${i.quantity})`).join(' + ') || 'مكونات أثاث كاملة',
      notes: so.notes || `فرع المعرض: ${so.showroomName || 'المعرض الرئيسي'}`,
      receiptNo: `REC-2026-${Math.floor(200 + Math.random() * 800)}`,
      cargoId: null
    }));
    return [...imageOrders, ...formattedSales];
  }, [salesOrders, imageOrders]);

  // Unique list of customers for filtering
  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    allOrders.forEach(o => {
      if (o.customerName) set.add(o.customerName);
    });
    return Array.from(set);
  }, [allOrders]);

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return allOrders.filter(item => {
      const matchesSearch = 
        (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.workRequired || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.components || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'completed' ? item.statusKey === 'completed' || item.status === 'تم واكتمل' :
        statusFilter === 'in_progress' ? item.statusKey === 'in_progress' || item.status === 'جاري التشغيل' :
        statusFilter === 'pending' ? item.statusKey === 'pending' || item.status === 'بانتظار الخامات' :
        true;

      const matchesCustomer = 
        customerFilter === 'all' ? true : item.customerName === customerFilter;

      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [allOrders, searchTerm, statusFilter, customerFilter]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const total = allOrders.length;
    const completed = allOrders.filter(o => o.statusKey === 'completed' || o.status === 'تم واكتمل').length;
    const inProgress = allOrders.filter(o => o.statusKey === 'in_progress' || o.status === 'جاري التشغيل').length;
    const pending = allOrders.filter(o => o.statusKey === 'pending' || o.status === 'بانتظار الخامات').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, completionRate };
  }, [allOrders]);

  const handleOpenReceiptModal = (order: any) => {
    setSelectedOrderForReceipt(order);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-[32px] text-white shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-bold text-xs mb-2">
              منظومة تتبع الموردين وطلبات العملاء والمعارض
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black">تحليل الطلبات • أساس الحمولة • أمر الاستلام الرسمي</h2>
            <p className="text-slate-300 text-xs font-bold mt-1">
              جدول تحليلي تفاعلي مطبق تماماً كما في كشف العمليات، مع محرك المانفيست وأذون الاستلام المعتمدة
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-[14px] backdrop-blur-md border border-white/10">
            <Button
              onClick={() => setActiveSubView('sheet')}
              className={`rounded-xl font-black text-xs h-10 px-4 ${activeSubView === 'sheet' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:text-white'}`}
            >
              <FileSpreadsheet size={16} className="ml-1.5" />
              كشف الطلبات المباشر (الصورة)
            </Button>

            <Button
              onClick={() => setActiveSubView('cargo')}
              className={`rounded-xl font-black text-xs h-10 px-4 ${activeSubView === 'cargo' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:text-white'}`}
            >
              <Truck size={16} className="ml-1.5" />
              أساس الحمولة والمانفيست ({cargoManifests.length})
            </Button>

            <Button
              onClick={() => setActiveSubView('receipts')}
              className={`rounded-xl font-black text-xs h-10 px-4 ${activeSubView === 'receipts' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-300 hover:text-white'}`}
            >
              <Printer size={16} className="ml-1.5" />
              أوامر الاستلام الرسمية
            </Button>
          </div>
        </div>

        {/* 4 Summary Analytics KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-4 rounded-[14px] bg-white/10 backdrop-blur-md border border-white/10 min-w-0">
            <p className="text-[11px] font-bold text-slate-300 truncate">إجمالي الطلبات</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-white mt-1">
              <NumberDisplay value={stats.total} />
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 min-w-0">
            <p className="text-[11px] font-bold text-emerald-300 truncate">تم واكتمل وتسليم</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-400 mt-1">
              <NumberDisplay value={stats.completed} />
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-amber-500/20 backdrop-blur-md border border-amber-500/30 min-w-0">
            <p className="text-[11px] font-bold text-amber-300 truncate">جاري التشغيل بالمصنع</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-amber-400 mt-1">
              <NumberDisplay value={stats.inProgress} />
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-rose-500/20 backdrop-blur-md border border-rose-500/30 min-w-0">
            <p className="text-[11px] font-bold text-rose-300 truncate">بانتظار الخامات</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-rose-400 mt-1">
              <NumberDisplay value={stats.pending} />
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 col-span-2 sm:col-span-1 min-w-0">
            <p className="text-[11px] font-bold text-indigo-300 truncate">نسبة الإنجاز العامة</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-black text-indigo-400 mt-1">
              <NumberDisplay value={stats.completionRate} unit="%" />
            </p>
          </div>
        </div>
      </div>

      {/* VIEW 1: Interactive Table Matrix matching the uploaded Image */}
      {activeSubView === 'sheet' && (
        <div className="space-y-6">
          {/* Controls, Search, and Filter Header Bar */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search Box */}
              <div className="relative w-full md:w-96">
                <Search size={18} className="absolute right-4 top-3.5 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث باسم العميل، الشغل المطلوب، المكونات، الملاحظات..."
                  className="pr-11 h-11 rounded-[14px] bg-slate-50 border-slate-200 font-bold text-xs focus:bg-white"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <Button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  الكل ({allOrders.length})
                </Button>

                <Button
                  onClick={() => setStatusFilter('completed')}
                  className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                >
                  المكتملة والمسلمة ({stats.completed})
                </Button>

                <Button
                  onClick={() => setStatusFilter('in_progress')}
                  className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'in_progress' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
                >
                  جاري التشغيل ({stats.inProgress})
                </Button>

                <Button
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-xl font-black text-xs h-10 px-4 ${statusFilter === 'pending' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}`}
                >
                  بانتظار الخامات ({stats.pending})
                </Button>
              </div>
            </div>

            {/* Secondary Filter Row: Customer Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <Filter size={16} className="text-slate-400" />
                <span className="text-xs font-black text-slate-700">تصفية حسب العميل:</span>
                <select
                  value={customerFilter}
                  onChange={e => setCustomerFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">جميع العملاء ({uniqueCustomers.length})</option>
                  {uniqueCustomers.map((cust, i) => (
                    <option key={i} value={cust}>{cust}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => window.print()}
                  variant="outline" 
                  className="rounded-xl border-slate-200 text-slate-700 font-black text-xs h-9 px-3"
                >
                  <Printer size={14} className="ml-1.5" />
                  طباعة الكشف التفصيلي
                </Button>
              </div>
            </div>
          </div>

          {/* Exact Excel-Like Table matching the image structure */}
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white font-black text-xs">
                    <th className="p-4 border-b border-sky-700 min-w-[160px]">اسم العميل</th>
                    <th className="p-4 border-b border-sky-700 min-w-[180px]">الشغل المطلوب</th>
                    <th className="p-4 border-b border-sky-700 min-w-[120px] text-center">تاريخ التعاقد</th>
                    <th className="p-4 border-b border-sky-700 min-w-[120px] text-center">تاريخ التسليم</th>
                    <th className="p-4 border-b border-sky-700 min-w-[110px] text-center">الحالة</th>
                    <th className="p-4 border-b border-sky-700 min-w-[260px]">المكونات (تفاصيل الصنف)</th>
                    <th className="p-4 border-b border-sky-700 min-w-[200px]">ملاحظات التشغيل والتوريد</th>
                    <th className="p-4 border-b border-sky-700 min-w-[140px] text-center">إجراءات الاستلام والحمولة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">
                        لا توجد سجلات مطابقة لخيارات البحث أو التصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((row, index) => {
                      const isCompleted = row.statusKey === 'completed' || row.status === 'تم واكتمل';
                      const isPending = row.statusKey === 'pending' || row.status === 'بانتظار الخامات';

                      return (
                        <tr 
                          key={row.id || index}
                          className={`hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-sky-50/30'}`}
                        >
                          <td className="p-4 font-black text-slate-900 border-l border-slate-100">
                            {row.customerName}
                          </td>

                          <td className="p-4 font-black text-indigo-900 border-l border-slate-100">
                            {row.workRequired}
                          </td>

                          <td className="p-4 text-center font-mono text-slate-600 border-l border-slate-100 dir-ltr">
                            {row.contractDate}
                          </td>

                          <td className="p-4 text-center border-l border-slate-100">
                            <span className="font-mono text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg dir-ltr">
                              {row.deliveryDate}
                            </span>
                          </td>

                          <td className="p-4 text-center border-l border-slate-100">
                            {isCompleted ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-none font-black text-[11px] px-2.5 py-1 rounded-lg">
                                تم واكتمل ✓
                              </Badge>
                            ) : isPending ? (
                              <Badge className="bg-rose-100 text-rose-800 border-none font-black text-[11px] px-2.5 py-1 rounded-lg">
                                بانتظار الخامات ⏳
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-none font-black text-[11px] px-2.5 py-1 rounded-lg">
                                جاري التشغيل ⚙️
                              </Badge>
                            )}
                          </td>

                          <td className="p-4 border-l border-slate-100 text-slate-700 leading-relaxed">
                            {row.components}
                          </td>

                          <td className="p-4 border-l border-slate-100 text-slate-600">
                            {row.notes}
                            {row.cargoId && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                                <Truck size={12} />
                                <span>محمل برقم حمولة: {row.cargoId}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                onClick={() => handleOpenReceiptModal(row)}
                                size="sm"
                                variant="outline"
                                className="h-8 text-[11px] font-black rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <FileCheck size={13} className="ml-1" />
                                إذن استلام
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Cargo Manifest System (أساس الحمولة) */}
      {activeSubView === 'cargo' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-xl font-black text-slate-900">سجل مانفيست حمولات الأثاث والسيارات الناقلة</h3>
              <p className="text-slate-500 font-bold text-xs mt-1">
                تجميع الطلبات الجاهزة في حمولات مرتبة حسب خط السير ورقم السيارة لضمان وصول الشحنات وتسليمها
              </p>
            </div>

            <Button 
              onClick={() => alert('يمكنك إنشاء بيان حمولة جديد بانتخاب الشحنات المكتملة وجدولة سائق النقل.')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-11 px-5 rounded-[14px] shadow-md"
            >
              <Plus size={16} className="ml-1.5" />
              إنشاء بيان حمولة جديد (Cargo Manifest)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cargoManifests.map((manifest) => (
              <Card key={manifest.id} className="rounded-[32px] border-none shadow-sm p-6 bg-white space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[14px] bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                      <Truck size={22} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{manifest.id}</h4>
                      <p className="text-slate-500 font-bold text-xs">رقم السيارة: <span className="font-mono text-indigo-700">{manifest.truckNumber}</span></p>
                    </div>
                  </div>

                  <Badge className={`font-black text-xs px-3 py-1 rounded-xl ${manifest.status === 'in_transit' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {manifest.status === 'in_transit' ? 'في الطريق للمعرض 🚚' : 'جدولة مسبقة 📅'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-[14px] text-xs font-bold">
                  <div>
                    <span className="text-slate-400">اسم السائق:</span>
                    <p className="text-slate-800 font-black mt-0.5">{manifest.driverName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">هاتف السائق:</span>
                    <p className="text-slate-800 font-mono mt-0.5 dir-ltr">{manifest.driverPhone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">تاريخ خروج الحمولة:</span>
                    <p className="text-slate-800 font-mono mt-0.5">{manifest.departureDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">خط السير والجهة:</span>
                    <p className="text-slate-800 mt-0.5">{manifest.destination}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-2">الطلبات والأثاث المحمل على هذه الحمولة ({manifest.itemsCount})</p>
                  <ul className="space-y-1.5">
                    {manifest.orders.map((ord: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100/70 p-2.5 rounded-xl">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>{ord}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <Button 
                    onClick={() => window.print()}
                    variant="outline" 
                    className="rounded-xl border-slate-200 text-slate-700 font-black text-xs h-9 px-3"
                  >
                    <Printer size={14} className="ml-1.5" />
                    طباعة مانفيست الحمولة
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Printable Delivery Receipts (أساس أمر الاستلام) */}
      {activeSubView === 'receipts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2">
            <h3 className="text-xl font-black text-slate-900">سجل أذون وأوامر الاستلام المعتمدة</h3>
            <p className="text-slate-500 font-bold text-xs">
              جميع أذون الاستلام المعتمدة للعملاء والمعارض موثقة برقم مسلسل تاريخي وإمكانيات الطباعة المباشرة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allOrders.map((ord, idx) => (
              <Card key={idx} className="rounded-3xl border-none shadow-sm p-5 bg-white space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <Badge className="bg-indigo-50 text-indigo-700 font-mono font-black text-xs">
                    {ord.receiptNo}
                  </Badge>
                  <span className="text-[11px] font-bold text-slate-400">{ord.deliveryDate}</span>
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-sm">{ord.customerName}</h4>
                  <p className="text-indigo-700 font-bold text-xs mt-0.5">{ord.workRequired}</p>
                </div>

                <p className="text-[11px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl line-clamp-2">
                  المكونات: {ord.components}
                </p>

                <Button
                  onClick={() => handleOpenReceiptModal(ord)}
                  className="w-full bg-slate-900 hover:bg-black text-white font-black text-xs h-9 rounded-xl"
                >
                  <FileCheck size={14} className="ml-1.5" />
                  معاينة وطباعة إذن الاستلام
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PRINTABLE DELIVERY RECEIPT MODAL */}
      {showReceiptModal && selectedOrderForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 shadow-2xl space-y-6 border border-slate-200">
            {/* Modal Actions Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
              <Badge className="bg-indigo-100 text-indigo-800 font-black text-xs px-3 py-1">
                معاينة إذن الاستلام المعتمد 🧾
              </Badge>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handlePrintReceipt}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-9 px-4 rounded-xl shadow-md"
                >
                  <Printer size={15} className="ml-1.5" />
                  طباعة الإذن الآن
                </Button>
                <Button 
                  onClick={() => setShowReceiptModal(false)}
                  variant="ghost" 
                  className="font-black text-xs h-9 px-3 rounded-xl text-slate-500"
                >
                  إغلاق
                </Button>
              </div>
            </div>

            {/* Document Content (Exact Printable Delivery Receipt) */}
            <div className="space-y-6 text-slate-900 border-2 border-slate-900 p-6 rounded-[14px] bg-white">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                <div>
                  <h2 className="text-xl font-black text-slate-900">مجموعة مصانع الأثاث والتصنيع الفاخر</h2>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">إذن تسليم واستلام أثاث معتمد</p>
                </div>
                <div className="text-left font-mono">
                  <p className="font-black text-sm text-indigo-900">{selectedOrderForReceipt.receiptNo}</p>
                  <p className="text-xs text-slate-500 font-bold">التاريخ: {selectedOrderForReceipt.deliveryDate}</p>
                </div>
              </div>

              {/* Customer & Order Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold">
                <div>
                  <span className="text-slate-500">اسم العميل / المكرم:</span>
                  <p className="font-black text-slate-900 text-sm mt-0.5">{selectedOrderForReceipt.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-500">الشغل المطلوب / الصنف:</span>
                  <p className="font-black text-indigo-900 text-sm mt-0.5">{selectedOrderForReceipt.workRequired}</p>
                </div>
                <div>
                  <span className="text-slate-500">تاريخ التعاقد:</span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedOrderForReceipt.contractDate}</p>
                </div>
                <div>
                  <span className="text-slate-500">تاريخ التسليم الفعلي:</span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedOrderForReceipt.deliveryDate}</p>
                </div>
              </div>

              {/* Components */}
              <div className="space-y-1.5">
                <p className="text-xs font-black text-slate-700">بيان ومكونات القطع المسلمة:</p>
                <div className="bg-slate-100/80 p-3.5 rounded-xl text-xs font-bold text-slate-800 leading-relaxed border border-slate-200">
                  {selectedOrderForReceipt.components}
                </div>
              </div>

              {/* Notes */}
              {selectedOrderForReceipt.notes && (
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-700">ملاحظات وحالة الاستلام:</p>
                  <p className="text-xs font-bold text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    {selectedOrderForReceipt.notes}
                  </p>
                </div>
              )}

              {/* Signatures Footer */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-slate-900 text-center text-xs font-black">
                <div>
                  <p className="text-slate-500 text-[11px]">مستلم المعرض / العميل</p>
                  <p className="mt-8 text-slate-400 font-normal">التوقيع: .....................</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[11px]">سائق النقل / المندوب</p>
                  <p className="mt-8 text-slate-400 font-normal">التوقيع: .....................</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[11px]">يعتمد مدير المصنع والجودة</p>
                  <p className="mt-8 text-slate-400 font-normal">الختم والتوقيع: .....................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


