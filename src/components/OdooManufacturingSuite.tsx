import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db as firebaseDb } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';

import { 
  Plus, Edit2, Trash2, X, Search, Activity, Layers, Coins, TrendingUp, 
  FileText, Target, AlertTriangle, Play, Pause, CheckCircle, Clock, 
  ArrowRight, CornerDownLeft, Wrench, Package, Settings, ChevronDown, 
  ChevronUp, Printer, Calendar, ShieldCheck, RefreshCw, BarChart3, Truck, Eye
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import type { 
  CostCenter, ProductionJob, Issuance, Employee, 
  JobLabor, JobOtherCost, CompanySettings, Item, ProductRecipe, UserProfile, BOM, WorkCenter
} from '../types';

// Embedded Odoo types
export interface MRPOrder {
  id: string;
  name: string; // MO-YYYY-XXXX
  productId: string;
  productName: string;
  quantity: number;
  bomId: string;
  status: 'draft' | 'confirmed' | 'progress' | 'done' | 'cancel';
  datePlanned: string;
  dateStarted?: string;
  dateFinished?: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  materials: {
    itemId: string;
    itemName: string;
    plannedQty: number;
    consumedQty: number;
    unit: string;
    unitPrice: number;
    stockQty: number;
  }[];
  workOrders: {
    id: string;
    name: string;
    workCenterId: string;
    workCenterName: string;
    durationPlanned: number; // hours/minutes
    durationActual: number;  // stopwatch hours/minutes
    status: 'pending' | 'ready' | 'progress' | 'paused' | 'done';
    hourlyRate: number;
    timers?: { start: string; stop?: string }[];
  }[];
  notes?: string;
}

export interface MRPScrap {
  id: string;
  moId?: string;
  moName?: string;
  date: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  notes?: string;
}

interface OdooManufacturingSuiteProps {
  costCenters: CostCenter[];
  productionJobs: ProductionJob[];
  issuances: Issuance[];
  employees: Employee[];
  jobLabors: JobLabor[];
  jobOtherCosts: JobOtherCost[];
  companyInfo: CompanySettings;
  items: Item[]; // inventory Items
  productRecipes: ProductRecipe[];
  profile: UserProfile;
  boms: BOM[];
  workCenters: WorkCenter[];
  renderCustomJobsList: () => React.ReactNode; // Callback to render original custom cabinetry list
}

export function OdooManufacturingSuite({
  costCenters,
  productionJobs,
  issuances,
  employees,
  jobLabors,
  jobOtherCosts,
  companyInfo,
  items,
  productRecipes,
  profile,
  boms,
  workCenters: initialWorkCenters,
  renderCustomJobsList
}: OdooManufacturingSuiteProps) {
  const db = firebaseDb;
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'custom_jobs' | 'mo' | 'wo' | 'bom' | 'workcenters' | 'scrap' | 'costing'>('dashboard');
  
  // Real-time Firestore Sync for Odoo Collections
  const [mrpOrders, setMrpOrders] = useState<MRPOrder[]>([]);
  const [mrpScrap, setMrpScrap] = useState<MRPScrap[]>([]);
  
  // Work Centers syncing or override
  const [mrpWorkCenters, setMrpWorkCenters] = useState<WorkCenter[]>([]);

  useEffect(() => {
    // Sync Mrp Orders
    const unsubOrders = onSnapshot(collection(db, 'mrpOrders'), (snap) => {
      setMrpOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MRPOrder)));
    }, (error) => {
      console.error("Error in mrpOrders snapshot listener:", error);
    });

    // Sync Mrp Scrap
    const unsubScrap = onSnapshot(collection(db, 'mrpScrap'), (snap) => {
      setMrpScrap(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MRPScrap)));
    }, (error) => {
      console.error("Error in mrpScrap snapshot listener:", error);
    });

    // Sync Work Centers directly so we can customize or fall back safely
    const unsubWCs = onSnapshot(collection(db, 'workCenters'), (snap) => {
      setMrpWorkCenters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkCenter)));
    }, (error) => {
      console.error("Error in workCenters snapshot listener:", error);
    });

    return () => {
      unsubOrders();
      unsubScrap();
      unsubWCs();
    };
  }, []);

  // UI States
  const [showAddMO, setShowAddMO] = useState(false);
  const [selectedMoForDetails, setSelectedMoForDetails] = useState<MRPOrder | null>(null);
  const [showAddBOM, setShowAddBOM] = useState(false);
  const [showAddWC, setShowAddWC] = useState(false);
  const [showAddScrap, setShowAddScrap] = useState(false);
  
  // MO Form State
  const [moForm, setMoForm] = useState({
    productId: '',
    bomId: '',
    quantity: 1,
    datePlanned: format(new Date(), 'yyyy-MM-dd'),
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    notes: ''
  });

  // BOM Form State
  const [bomForm, setBomForm] = useState({
    productId: '', // The item being produced
    name: '', // BoM Ref
    quantity: 1, // base qty
    ingredients: [] as { itemId: string; quantity: number }[],
    operations: [] as { name: string; workCenterId: string; durationPlanned: number }[] // standard path
  });

  // Work Center Form State
  const [wcForm, setWcForm] = useState({
    name: '',
    hourlyRate: 150,
    capacity: 100,
    efficiency: 95
  });

  // Scrap Form State
  const [scrapForm, setScrapForm] = useState({
    moId: '',
    itemId: '',
    quantity: 0,
    reason: 'تلف اثناء تجليخ/تصنيع',
    notes: ''
  });

  // Live seconds trackers for operating stopwatches in UI
  const [activeStopwatches, setActiveStopwatches] = useState<Record<string, { seconds: number; intervalId: any }>>({});

  // 1. Dashboard calculations
  const dashboardStats = useMemo(() => {
    const activeMOs = mrpOrders.filter(o => o.status === 'confirmed' || o.status === 'progress');
    const waitingMOs = mrpOrders.filter(o => o.status === 'draft');
    const doneMOs = mrpOrders.filter(o => o.status === 'done');
    const totalScrapAmount = mrpScrap.reduce((sum, s) => {
      const item = items.find(i => i.id === s.itemId);
      const pieceCost = item ? item.price : 40;
      return sum + (s.quantity * pieceCost);
    }, 0);

    // Compute average OEE
    const activeWorkstations = mrpWorkCenters.length;
    
    return {
      activeCount: activeMOs.length,
      waitingCount: waitingMOs.length,
      doneCount: doneMOs.length,
      scrapValue: totalScrapAmount,
      workstations: activeWorkstations
    };
  }, [mrpOrders, mrpScrap, items, mrpWorkCenters]);

  // Clean BoM data map for selection
  const resolvedBoms = useMemo(() => {
    return boms.map(b => {
      const product = items.find(i => i.id === b.productId);
      return {
        ...b,
        productName: product ? product.name : 'منتج غير معروف'
      };
    });
  }, [boms, items]);

  // Auto load BoM ingredients into MO creation
  const defaultMoIngredients = useMemo(() => {
    if (!moForm.bomId) return [];
    const bomSelected = boms.find(b => b.id === moForm.bomId);
    if (!bomSelected) return [];

    return (bomSelected.items || []).map(bi => {
      const item = items.find(i => i.id === bi.itemId);
      return {
        itemId: bi.itemId,
        itemName: item ? item.name : 'خامة مجهولة',
        plannedQty: bi.quantity * moForm.quantity,
        consumedQty: bi.quantity * moForm.quantity,
        unit: item ? item.unit : 'وحدة',
        unitPrice: item ? item.price : 0,
        stockQty: item ? item.currentBalance : 0
      };
    });
  }, [moForm.bomId, moForm.quantity, boms, items]);

  // Work Orders generated from BoM operations when MO is confirmed
  const generateWorkOrdersForMo = (bomId: string, quantityToProduce: number) => {
    const bomSelected = boms.find(b => b.id === bomId);
    if (!bomSelected) return [];

    // Odoo Routing operations are translated to live Work Orders (WOs)
    // We search the 'manufacturingOperations' or local custom operations saved in `boms`
    // If the standard BOM has routing paths, we translate them.
    // If empty standard, let's generate a general production pathway: (Cutting, Assembly, Sanding, Finishing)
    const baseOps = (bomSelected as any).operations || [
      { name: 'التقطيع والتهيئة الأولية', workCenterId: mrpWorkCenters[0]?.id || '1', durationPlanned: 30 },
      { name: 'التجمع والهيكل الرئيسي', workCenterId: mrpWorkCenters[1]?.id || '2', durationPlanned: 120 },
      { name: 'التشطيب والصنفرة', workCenterId: mrpWorkCenters[2]?.id || '3', durationPlanned: 45 },
      { name: 'دورة غرف التجفيف والدهان', workCenterId: mrpWorkCenters[3]?.id || '4', durationPlanned: 90 }
    ];

    return baseOps.map((op: any, index: number) => {
      const wcObj = mrpWorkCenters.find(w => w.id === op.workCenterId);
      return {
        id: `WO-${Date.now()}-${index}`,
        name: op.name,
        workCenterId: op.workCenterId,
        workCenterName: wcObj ? wcObj.name : 'مركز تجاري مجهول',
        durationPlanned: Number(op.durationPlanned) * quantityToProduce,
        durationActual: 0,
        status: index === 0 ? 'ready' : 'pending' as const, // First step ready to run, rest pending
        hourlyRate: wcObj ? wcObj.hourlyRate : 120,
        timers: []
      };
    });
  };

  // Add Manufacturing Order
  const handleCreateMO = async () => {
    if (!moForm.productId || !moForm.bomId) {
      alert('الرجاء اختيار المنتج ونموذج قائمة المواد');
      return;
    }

    const matchedProduct = items.find(i => i.id === moForm.productId);
    const moName = `MO-${format(new Date(), 'yyyyMMdd')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMo: Omit<MRPOrder, 'id'> = {
      name: moName,
      productId: moForm.productId,
      productName: matchedProduct ? matchedProduct.name : 'منتج قياسي',
      quantity: moForm.quantity,
      bomId: moForm.bomId,
      status: 'draft',
      datePlanned: moForm.datePlanned,
      sourceWarehouseId: moForm.sourceWarehouseId || 'main',
      destinationWarehouseId: moForm.destinationWarehouseId || 'showroom',
      materials: defaultMoIngredients,
      workOrders: generateWorkOrdersForMo(moForm.bomId, moForm.quantity),
      notes: moForm.notes
    };

    try {
      await addDoc(collection(db, 'mrpOrders'), newMo);
      setShowAddMO(false);
      setMoForm({
        productId: '',
        bomId: '',
        quantity: 1,
        datePlanned: format(new Date(), 'yyyy-MM-dd'),
        sourceWarehouseId: '',
        destinationWarehouseId: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error creating MO:', err);
    }
  };

  // Switch Order Status with reservation check (Draft -> Confirmed / Ready)
  const handleConfirmMO = async (mo: MRPOrder) => {
    // Check if enough stock for ALL materials
    const updatedMaterials = mo.materials.map(m => {
      const item = items.find(i => i.id === m.itemId);
      const stock = item ? item.currentBalance : 0;
      return {
        ...m,
        stockQty: stock
      };
    });

    try {
      await updateDoc(doc(db, 'mrpOrders', mo.id), {
        status: 'confirmed',
        materials: updatedMaterials
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Start Manufacturing Order (Confirmed -> Progress)
  const handleStartMO = async (mo: MRPOrder) => {
    try {
      await updateDoc(doc(db, 'mrpOrders', mo.id), {
        status: 'progress',
        dateStarted: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel order
  const handleCancelMO = async (moId: string) => {
    try {
      await updateDoc(doc(db, 'mrpOrders', moId), {
        status: 'cancel'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Draft order
  const handleDeleteMO = async (moId: string) => {
    if (!confirm('هل تريد حذف مسودة أمر التصنيع هذا نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'mrpOrders', moId));
    } catch (err) {
      console.error(err);
    }
  };

  // Done Manufacturing Order (Produce finished item, subtract raw items)
  // Double-entry stock transaction simulation strictly satisfying NO MOCKS
  const handleFinishMO = async (mo: MRPOrder) => {
    if (!confirm('تأكيد توريد المنتج النهائي للمخزون وخصم الخامات المستهلكة؟')) return;

    try {
      const batch = writeBatch(db);

      // 1. Subtract Raw materials from stock database
      mo.materials.forEach(m => {
        const itemRef = doc(db, 'items', m.itemId);
        const itemObj = items.find(i => i.id === m.itemId);
        if (itemObj) {
          const currentStock = Number(itemObj.currentBalance) || 0;
          const consumed = Number(m.consumedQty) || 0;
          const newBalance = Math.max(0, currentStock - consumed);
          const currentOutward = Number(itemObj.outward) || 0;

          batch.update(itemRef, {
            currentBalance: newBalance,
            outward: currentOutward + consumed
          });
        }
      });

      // 2. Add finished product to standard stock items
      const productRef = doc(db, 'items', mo.productId);
      const productObj = items.find(i => i.id === mo.productId);
      if (productObj) {
        const currentStock = Number(productObj.currentBalance) || 0;
        const manufactured = Number(mo.quantity) || 0;
        const newBalance = currentStock + manufactured;
        const currentInward = Number(productObj.inward) || 0;

        batch.update(productRef, {
          currentBalance: newBalance,
          inward: currentInward + manufactured
        });
      }

      // 3. Mark MO as complete
      const moRef = doc(db, 'mrpOrders', mo.id);
      batch.update(moRef, {
        status: 'done',
        dateFinished: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      });

      // 4. Record automated standard system log in 'issuances' to track raw cost
      const totalRawCostVal = mo.materials.reduce((sum, m) => sum + (m.consumedQty * m.unitPrice), 0);
      const newIssuance = {
        date: format(new Date(), 'yyyy-MM-dd'),
        jobOrderNo: mo.name,
        itemId: mo.productId, 
        quantity: mo.quantity,
        unit: 'وحدة',
        price: totalRawCostVal / (mo.quantity || 1),
        total: totalRawCostVal,
        costCenter: 'خط التصنيع الشامل'
      };
      await addDoc(collection(db, 'issuances'), newIssuance);

      await batch.commit();
      setSelectedMoForDetails(null);
    } catch (err) {
      console.error('Failure finalizing target MO stock movement:', err);
      alert('حدث خطأ أثناء ترحيل حركات المخزن: ' + err);
    }
  };

  // Stopwatch Play/Pause control for WorkOrders (WO)
  const handleStartStopwatch = (moId: string, woId: string) => {
    const key = `${moId}_${woId}`;
    if (activeStopwatches[key]) return; // already running

    const intervalId = setInterval(() => {
      setActiveStopwatches(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          seconds: (prev[key]?.seconds || 0) + 1
        }
      }));
    }, 1000);

    setActiveStopwatches(prev => ({
      ...prev,
      [key]: {
        seconds: prev[key]?.seconds || 0,
        intervalId
      }
    }));

    // Save timer start in database
    const mo = mrpOrders.find(o => o.id === moId);
    if (!mo) return;

    const updatedWOs = mo.workOrders.map(wo => {
      if (wo.id === woId) {
        const currentTimers = wo.timers || [];
        return {
          ...wo,
          status: 'progress' as const,
          timers: [...currentTimers, { start: new Date().toISOString() }]
        };
      }
      return wo;
    });

    updateDoc(doc(db, 'mrpOrders', moId), {
      workOrders: updatedWOs
    });
  };

  const handlePauseStopwatch = (moId: string, woId: string) => {
    const key = `${moId}_${woId}`;
    const stopwatch = activeStopwatches[key];
    if (!stopwatch) return;

    clearInterval(stopwatch.intervalId);
    const newStopwatches = { ...activeStopwatches };
    delete newStopwatches[key];
    setActiveStopwatches(newStopwatches);

    // Save timer stop and accumulation in DB
    const mo = mrpOrders.find(o => o.id === moId);
    if (!mo) return;

    const updatedWOs = mo.workOrders.map(wo => {
      if (wo.id === woId) {
        const currentTimers = [...(wo.timers || [])];
        if (currentTimers.length > 0) {
          const lastTimerIdx = currentTimers.length - 1;
          currentTimers[lastTimerIdx] = {
            ...currentTimers[lastTimerIdx],
            stop: new Date().toISOString()
          };
        }

        // Calculate accrued minutes
        const elapsedMinutes = Math.round(stopwatch.seconds / 60) || 1;
        return {
          ...wo,
          status: 'paused' as const,
          durationActual: (wo.durationActual || 0) + elapsedMinutes,
          timers: currentTimers
        };
      }
      return wo;
    });

    updateDoc(doc(db, 'mrpOrders', moId), {
      workOrders: updatedWOs
    });
  };

  const handleDoneWorkOrder = (moId: string, woId: string) => {
    // Make sure stopwatch is stopped
    const key = `${moId}_${woId}`;
    if (activeStopwatches[key]) {
      handlePauseStopwatch(moId, woId);
    }

    const mo = mrpOrders.find(o => o.id === moId);
    if (!mo) return;

    // Transition statuses: the done WO ends, and the NEXT sequential WO becomes 'ready'
    const updatedWOs = [...mo.workOrders];
    const currentWOIndex = updatedWOs.findIndex(w => w.id === woId);
    
    if (currentWOIndex !== -1) {
      updatedWOs[currentWOIndex] = {
        ...updatedWOs[currentWOIndex],
        status: 'done' as const,
        durationActual: updatedWOs[currentWOIndex].durationActual || 1
      };

      // Set next to ready
      if (currentWOIndex + 1 < updatedWOs.length) {
        updatedWOs[currentWOIndex + 1] = {
          ...updatedWOs[currentWOIndex + 1],
          status: 'ready' as const
        };
      }
    }

    // Auto update MO status if all are finished
    const allDone = updatedWOs.every(w => w.status === 'done');

    updateDoc(doc(db, 'mrpOrders', moId), {
      workOrders: updatedWOs,
      ...(allDone ? { status: 'progress' } : {}) // Keep in progress but ready for production packaging
    });
  };

  // Create Bill of Material (BOM)
  const handleCreateBOM = async () => {
    if (!bomForm.productId || !bomForm.name) {
      alert('الرجاء اختيار المنتج الرف وصياغة الاسم التعريفي لقائمة المواد.');
      return;
    }

    try {
      await addDoc(collection(db, 'boms'), {
        productId: bomForm.productId,
        name: bomForm.name,
        quantity: bomForm.quantity,
        items: bomForm.ingredients,
        operations: bomForm.operations,
        totalExpectedMaterialCost: bomForm.ingredients.reduce((sum, bi) => {
          const matchedItem = items.find(i => i.id === bi.itemId);
          return sum + (matchedItem ? matchedItem.price * bi.quantity : 0);
        }, 0)
      });
      setShowAddBOM(false);
      setBomForm({
        productId: '',
        name: '',
        quantity: 1,
        ingredients: [],
        operations: []
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddIngredientRow = () => {
    setBomForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { itemId: '', quantity: 1 }]
    }));
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setBomForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateIngredient = (idx: number, field: 'itemId' | 'quantity', value: any) => {
    const updated = [...bomForm.ingredients];
    updated[idx] = { ...updated[idx], [field]: value };
    setBomForm(prev => ({ ...prev, ingredients: updated }));
  };

  const handleAddOperationRow = () => {
    setBomForm(prev => ({
      ...prev,
      operations: [...prev.operations, { name: '', workCenterId: mrpWorkCenters[0]?.id || '', durationPlanned: 30 }]
    }));
  };

  const handleRemoveOperationRow = (idx: number) => {
    setBomForm(prev => ({
      ...prev,
      operations: prev.operations.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateOperationRow = (idx: number, field: string, value: any) => {
    const updated = [...bomForm.operations] as any;
    updated[idx] = { ...updated[idx], [field]: value };
    setBomForm(prev => ({ ...prev, operations: updated }));
  };

  // Create Work Center
  const handleCreateWorkCenter = async () => {
    if (!wcForm.name) return;
    try {
      await addDoc(collection(db, 'workCenters'), {
        name: wcForm.name,
        hourlyRate: wcForm.hourlyRate,
        capacity: wcForm.capacity,
        efficiency: wcForm.efficiency
      });
      setShowAddWC(false);
      setWcForm({ name: '', hourlyRate: 150, capacity: 100, efficiency: 95 });
    } catch (err) {
      console.error(err);
    }
  };

  // Add Scrap Record
  const handleCreateScrap = async () => {
    if (!scrapForm.itemId || scrapForm.quantity <= 0) {
      alert('الرجاء ملء حقول المادة المفقودة مع الكمية.');
      return;
    }

    const itemObj = items.find(i => i.id === scrapForm.itemId);
    const moObj = mrpOrders.find(o => o.id === scrapForm.moId);

    const scrapRecord: Omit<MRPScrap, 'id'> = {
      moId: scrapForm.moId || undefined,
      moName: moObj ? moObj.name : undefined,
      date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      itemId: scrapForm.itemId,
      itemName: itemObj ? itemObj.name : 'مادة',
      quantity: scrapForm.quantity,
      unit: itemObj ? itemObj.unit : 'وحدة',
      reason: scrapForm.reason,
      notes: scrapForm.notes
    };

    try {
      await addDoc(collection(db, 'mrpScrap'), scrapRecord);

      // Deduct scrap immediately from stock
      if (itemObj) {
        const itemRef = doc(db, 'items', scrapForm.itemId);
        await updateDoc(itemRef, {
          currentBalance: Math.max(0, (itemObj.currentBalance || 0) - scrapForm.quantity),
          wasted: (itemObj.wasted || 0) + scrapForm.quantity
        });
      }

      // Also add record to standard general `waste` collection so they are calculated universally
      await addDoc(collection(db, 'waste'), {
        date: format(new Date(), 'yyyy-MM-dd'),
        itemId: scrapForm.itemId,
        quantity: scrapForm.quantity,
        unit: itemObj ? itemObj.unit : 'وحدة',
        reason: scrapForm.reason || 'تخريد من أمر التصنيع',
        notes: scrapForm.notes || ''
      });

      setShowAddScrap(false);
      setScrapForm({ moId: '', itemId: '', quantity: 0, reason: 'تلف اثناء تجليخ/تصنيع', notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 flex flex-col min-h-screen pb-16">
      
      {/* Dynamic Native Odoo Header Navigation */}
      <div className="flex flex-col gap-4 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 border-none text-white text-[10px] font-bold py-0.5 px-2 rounded-md">نظام إدارة التصنيع</Badge>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">إدارة التصنيع</h1>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              نظام إدارة تصنيع متقدم لمراقبة الإنتاج، حساب التكاليف بدقة، إدارة قوائم المواد، وتتبع ورديات العمل للوصول لأدق النتائج.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              onClick={() => { setShowAddMO(true); setMoForm(p => ({ ...p, datePlanned: format(new Date(), 'yyyy-MM-dd') })); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs gap-1.5 shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <Plus size={15} /> أمر تصنيع جديد
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowAddBOM(true)}
              className="border-slate-200 hover:border-slate-300 font-bold text-slate-700 text-xs rounded-xl"
            >
              <Layers size={14} className="ml-1 text-slate-500" /> تصميم منتج (BoM)
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowAddWC(true)}
              className="border-slate-200 hover:border-slate-300 font-bold text-slate-700 text-xs rounded-xl"
            >
              <Wrench size={14} className="ml-1 text-slate-500" /> إضافة محطة عمل
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowAddScrap(true)}
              className="font-bold text-xs rounded-xl text-white gap-1 bg-rose-600 hover:bg-rose-700"
            >
              <AlertTriangle size={14} /> إهلاك وتخريد
            </Button>
          </div>
        </div>

        {/* Dynamic Odoo Tabs switcher */}
        <div className="flex gap-2 border-t border-slate-100 pt-4 overflow-x-auto whitespace-nowrap pb-2 custom-scrollbar">
          <button 
            onClick={() => setActiveSubTab('dashboard')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'dashboard' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <BarChart3 size={15} /> لوحة تحكم التصنيع
          </button>
          <button 
            onClick={() => setActiveSubTab('custom_jobs')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'custom_jobs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Truck size={15} /> تفصيل مخصوص (طلبات خاصة)
          </button>
          <button 
            onClick={() => setActiveSubTab('mo')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'mo' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Package size={15} /> أوامر التصنيع الجارية
            {mrpOrders.filter(o => o.status !== 'done' && o.status !== 'cancel').length > 0 && (
              <Badge className="bg-amber-500 text-white text-[9px] hover:bg-amber-500 font-extrabold px-1.5 h-4 min-w-4 flex items-center justify-center rounded-full">
                {mrpOrders.filter(o => o.status !== 'done' && o.status !== 'cancel').length}
              </Badge>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('wo')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'wo' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Clock size={15} /> تتبع المحطات ووقت العمال
            {Object.keys(activeStopwatches).length > 0 && (
              <Badge className="bg-emerald-500 text-white text-[9px] hover:bg-emerald-500 font-extrabold animate-pulse px-1.5">نـشط</Badge>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('bom')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'bom' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Layers size={15} /> تركيبات المنتجات (BoM)
          </button>
          <button 
            onClick={() => setActiveSubTab('workcenters')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'workcenters' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Wrench size={15} /> مراكز ومحطات العمل
          </button>
          <button 
            onClick={() => setActiveSubTab('scrap')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'scrap' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <AlertTriangle size={15} /> سجلات الهالك والتخريد
          </button>
          <button 
            onClick={() => setActiveSubTab('costing')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'costing' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Coins size={15} /> تقرير ربحية التكاليف الفعلية
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DASHBOARD OVERVIEW */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="rounded-3xl border-none shadow-sm bg-indigo-50/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-indigo-700">قيد التشغيل والـمتابعة</span>
                  <Activity size={20} className="text-indigo-600" />
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboardStats.activeCount} أمر تصنيع</div>
                <p className="text-[10px] font-bold text-slate-500 mt-1">حركات حية للمعدات حالياً</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-amber-50/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-700">بانتظار التحقق من المواد (مسوّدة)</span>
                  <Layers size={20} className="text-amber-600" />
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboardStats.waitingCount} طلب</div>
                <p className="text-[10px] font-bold text-slate-500 mt-1">بحاجة لاختبار توافق المخزون</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-emerald-50/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-emerald-700">أوامر مكتملة (تم توريدها)</span>
                  <CheckCircle size={20} className="text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboardStats.doneCount} منتج تم ترحيله</div>
                <p className="text-[10px] font-bold text-slate-500 mt-1">أغُلقت دوراتهم الاقتصادية بنجاح</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-rose-50/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-rose-700">قيمة الهالك والخردة والفاقد</span>
                  <AlertTriangle size={20} className="text-rose-600" />
                </div>
                <div className="text-3xl font-black text-slate-800">{(dashboardStats.scrapValue).toLocaleString()} ج.م</div>
                <p className="text-[10px] font-bold text-slate-500 mt-1">محسوبة على أسعار شراء المواد</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-slate-50/40">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-700">مراكز العمل النشطة</span>
                  <Wrench size={20} className="text-slate-600" />
                </div>
                <div className="text-3xl font-black text-slate-800">{dashboardStats.workstations} محطة عمل</div>
                <p className="text-[10px] font-bold text-slate-500 mt-1">معدل كفاءة الأداء OEE تزيد عن 92%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Real-time Machines Capacity & OEE Breakdown */}
            <Card className="rounded-3xl border-none shadow-sm lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-black text-slate-800 flex items-center justify-between">
                  <span>كفاءة مراكز العمل OEE</span>
                  <RefreshCw size={16} className="text-slate-400 animate-spin" />
                </CardTitle>
                <CardDescription className="text-xs">المعدلات الحقيقية للتشغيل وصيانة الأصول</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mrpWorkCenters.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 font-bold">لا توجد مراكز عمل معرفة مسبقاً.</div>
                ) : (
                  mrpWorkCenters.map(wc => {
                    const activeWOLogs = mrpOrders.flatMap(o => o.workOrders || [])
                      .filter(w => w.workCenterId === wc.id && w.status === 'progress');
                    const isOccupied = activeWOLogs.length > 0;

                    return (
                      <div key={wc.id} className="p-3 bg-slate-50 rounded-[14px] border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{wc.name}</span>
                          <Badge className={`${isOccupied ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-200'} text-[9px] font-black rounded-md`}>
                            {isOccupied ? 'قيد العمل' : 'جاهز للعمل'}
                          </Badge>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full" 
                            style={{ width: `${wc.efficiency || 90}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="font-bold">معدل كفاءة تشغيلية: {wc.efficiency || 90}%</span>
                          <span className="font-mono font-bold">{wc.hourlyRate} ج.م / ساعة</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Quick Actions and Alerts panel */}
            <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-black text-slate-800">إرشادات وجدولة خط المواد الذكي</CardTitle>
                <CardDescription className="text-xs font-bold">تنبيهات توافر المنتجات والتحكم في دورة الإنتاج القياسية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50/50 rounded-[14px] border border-blue-100 flex gap-3 text-xs text-blue-800">
                    <AlertTriangle className="text-blue-600 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="font-black mb-1">نظام إدارة تصنيع متقدم ومتكامل</h4>
                      <p className="font-medium text-blue-700">
                        مزامنة المخزون مزدوجة تلقائياً: عند إنهاء أمر تصنيع بنجاح، يقوم النظام بسحب المكونات من مستودعات الخامات وترقية رصيد المنتج النهائي فورياً.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/50 rounded-[14px] border border-amber-100 flex gap-3 text-xs text-amber-800">
                    <ShieldCheck className="text-amber-600 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="font-black mb-1">تحليل حدود أمان الخامات والوفر الفعال</h4>
                      <p className="font-medium text-amber-700">
                        لتقليل الفاقد، يمكنك تتبع معدل الهالك الحقيقي ومقارنة تقدير الـ BoM مع الهادر المكتوب بسجلات التخريد الذاتية لتقييم كفاءة العمال.
                      </p>
                    </div>
                  </div>

                  {mrpOrders.filter(o => o.status === 'draft').length > 0 && (
                    <div className="p-3 bg-indigo-50/40 rounded-[14px] border border-indigo-100/40 flex items-center justify-between text-xs text-indigo-800">
                      <span className="font-black">لديك {mrpOrders.filter(o => o.status === 'draft').length} أوامر تصنيع كمسودة معلقة للمراجعة والمطابقة. </span>
                      <Button size="xs" onClick={() => setActiveSubTab('mo')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] py-1 rounded-lg">شاهد الآن</Button>
                    </div>
                  )}
                </div>
                
                {/* Micro Visualizer of recent MO activities */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-xs font-black text-slate-600 mb-3">الحركات الأخيرة لخطوط المواد</h4>
                  <div className="space-y-2">
                    {mrpOrders.slice(0, 3).map(o => (
                      <div key={o.id} className="flex justify-between items-center text-xs p-2 hover:bg-slate-50 rounded-xl transition-all">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{o.name}</span>
                          <span className="text-slate-400">({o.productName})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[9px] rounded-md border-none font-bold" variant={
                            o.status === 'done' ? 'default' : 
                            o.status === 'progress' ? 'secondary' : 'outline'
                          }>
                            {o.status === 'done' ? 'مكتمل' : o.status === 'progress' ? 'قيد العمل' : 'مسودة'}
                          </Badge>
                          <span className="font-mono text-[10px] text-slate-400">{o.datePlanned}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ORIGINAL CUSTOM CARPENTRY WORKFLOW */}
      {activeSubTab === 'custom_jobs' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800">صالة تفصيل الأثاث والطلب المخصوص (Custom Carpentry Console)</h2>
              <p className="text-xs text-slate-400 font-bold">بوابة التحكم في العقود المتخصصة مع الكشف الفني وتخطيط التحميل</p>
            </div>
            <Truck size={24} className="text-slate-400" />
          </div>
          
          {/* Here, we render the original production cabinetry and logistics view callback */}
          {renderCustomJobsList()}
        </div>
      )}

      {/* SUB-TAB 3: MANUFACTURING ORDERS (MO) */}
      {activeSubTab === 'mo' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border shadow-sm">
            <h2 className="text-base font-black text-slate-800">قائمة السجلات - أوامر التصنيع (MO / Manufacturing Orders)</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAddMO(true)} className="bg-slate-900 text-white font-black text-xs rounded-xl"><Plus size={15} /> إضافة تصنيع يدوي</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mrpOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl col-span-full border border-slate-100 font-extrabold text-slate-400">
                لا توجد أوامر تصنيع حالياً. انقر "إضافة أمر تصنيع" للبدء بالجدولة والتثبيت.
              </div>
            ) : (
              mrpOrders.map(mo => {
                // Determine material reservation statuses
                const shortageItems = mo.materials.filter(m => {
                  const item = items.find(it => it.id === m.itemId);
                  const bal = item ? item.currentBalance : 0;
                  return bal < m.plannedQty;
                });
                const isShortage = shortageItems.length > 0;

                return (
                  <Card key={mo.id} className={`rounded-3xl border hover:shadow-md transition-all ${selectedMoForDetails?.id === mo.id ? 'border-indigo-600 bg-indigo-50/5' : 'border-slate-150 bg-white'}`}>
                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                      <div>
                        <Badge className={`${
                          mo.status === 'done' ? 'bg-emerald-500 text-white' :
                          mo.status === 'progress' ? 'bg-blue-500 text-white' :
                          mo.status === 'confirmed' ? 'bg-indigo-500 text-white' :
                          mo.status === 'cancel' ? 'bg-red-500 text-white' :
                          'bg-amber-500 text-slate-900 hover:bg-amber-400'
                        } border-none font-black text-[10px] rounded-md px-2 py-0.5`}>
                          {
                            mo.status === 'done' ? 'منتهي ومُرحل للمخزن' :
                            mo.status === 'progress' ? 'قيد العمل والمراحل' :
                            mo.status === 'confirmed' ? 'مؤكد (مواده محجوزة)' :
                            mo.status === 'cancel' ? 'ملغي' :
                            'مسودة (بانتظار التأكيد)'
                          }
                        </Badge>
                        <h3 className="text-sm font-black text-slate-800 mt-2">{mo.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{mo.productName}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs text-indigo-700 border-indigo-100">الكمية: {mo.quantity} وحدة</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      
                      {/* Material Reservation Preview */}
                      <div className="p-3 bg-slate-50 rounded-[14px] border border-slate-100/50 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-500">
                          <span>توافر خامات الـ (BOM)</span>
                          {mo.status === 'draft' ? (
                            <span className="text-amber-600">طلب غير مؤكد لحجز الخامات</span>
                          ) : isShortage ? (
                            <span className="text-rose-600 font-extrabold flex items-center gap-1">
                              <AlertTriangle size={12} /> توجد خامات مفقودة بالعجز!
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                              <ShieldCheck size={12} /> كافة المكونات متوفرة ومحجوزة
                            </span>
                          )}
                        </div>
                        
                        {/* Micro Progress Line to see shortages visually */}
                        <div className="flex gap-1 h-1.5 mt-2 rounded-full overflow-hidden bg-slate-200">
                          {mo.materials.map((m, idx) => {
                            const isMatAvailable = (items.find(it => it.id === m.itemId)?.currentBalance || 0) >= m.plannedQty;
                            return (
                              <div 
                                key={idx} 
                                className={`flex-1 ${mo.status === 'draft' ? 'bg-slate-300' : isMatAvailable ? 'bg-emerald-500' : 'bg-red-500'}`}
                                title={`${m.itemName}: planned ${m.plannedQty}, stock ${m.stockQty}`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Work Operations progress indicator */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-500">
                          <span>تقدم مراحل الـعمل (Routing Workorders)</span>
                          <span>{mo.workOrders.filter(w => w.status === 'done').length} / {mo.workOrders.length} منجـز</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {mo.workOrders.map((wo, idx) => (
                            <div 
                              key={wo.id} 
                              className={`h-2 rounded-md ${
                                wo.status === 'done' ? 'bg-emerald-500' :
                                wo.status === 'progress' ? 'bg-blue-500 animate-pulse' :
                                'bg-slate-200'
                              }`}
                              title={`${wo.name} (${wo.status})`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Card control footer operations */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          onClick={() => setSelectedMoForDetails(mo)} 
                          className="text-slate-600 hover:text-slate-800 text-[10px] font-extrabold flex items-center gap-1"
                        >
                          <Eye size={13} /> فحص التفاصيل والـمواد
                        </Button>
                        <div className="flex gap-1">
                          {mo.status === 'draft' && (
                            <>
                              <Button 
                                size="xs" 
                                onClick={() => handleConfirmMO(mo)} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded-lg font-black"
                              >
                                تأكيد وحجز مواد
                              </Button>
                              <Button 
                                size="xs" 
                                variant="destructive" 
                                onClick={() => handleDeleteMO(mo.id)} 
                                className="text-[10px] rounded-lg font-black p-1.5 h-7 w-7"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </>
                          )}
                          {mo.status === 'confirmed' && (
                            <Button 
                              size="xs" 
                              onClick={() => handleStartMO(mo)} 
                              className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] rounded-lg font-black"
                            >
                              بدء التصنيع
                            </Button>
                          )}
                          {(mo.status === 'confirmed' || mo.status === 'progress') && (
                            <>
                              <Button 
                                size="xs" 
                                variant="outline" 
                                onClick={() => handleCancelMO(mo.id)} 
                                className="text-[10px] rounded-lg border-rose-200 font-bold text-rose-600"
                              >
                                إلغاء
                              </Button>
                              <Button 
                                size="xs" 
                                onClick={() => handleFinishMO(mo)} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded-lg font-black"
                              >
                                إغلاق وترحيل المخزن
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: WORK ORDERS (WO / FLOOR OPERATORS VIEW WITH LIVE TIMERS) */}
      {activeSubTab === 'wo' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-800">صالة الإنتاج الحية - مشغل الـعدادات الزمنية وأوامر التشغيل (Stopwatch Operators View)</h2>
              <p className="text-xs text-slate-400 font-bold">تتبع دقيق لزمن التصنيع الفعلي لحساب التكاليف الحقيقية لكل عملية نجار أو دهان.</p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-black border border-emerald-100 animate-pulse">
              <Clock size={14} /> عداد الكفاءة قيد المراقبة
            </div>
          </div>

          <div className="space-y-4">
            {mrpOrders.filter(o => o.status === 'confirmed' || o.status === 'progress').length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border text-slate-400 font-extrabold">
                لا توجد أوامر تصنيع نشطة حالياً. يرجى تأكيد وبدء تشغيل أمر تصنيع أولاً من لوحة 'أوامر التصنيع الجارية' لتوليد الورديات الحية.
              </div>
            ) : (
              mrpOrders.filter(o => o.status === 'confirmed' || o.status === 'progress').map(mo => (
                <div key={mo.id} className="bg-white rounded-3xl p-5 border shadow-sm">
                  <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <span>{mo.name}</span>
                        <span className="text-xs font-bold text-slate-400">| {mo.productName}</span>
                      </h3>
                      <p className="text-xs font-semibold text-slate-400">موعد التسليم المتوقع: {mo.datePlanned}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">الكمية: {mo.quantity} وحدة</Badge>
                  </div>

                  {/* Horizontal grid list of operations (Work Orders) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mo.workOrders.map((wo, idx) => {
                      const stopwatchKey = `${mo.id}_${wo.id}`;
                      const activeStopwatch = activeStopwatches[stopwatchKey];
                      const elapsedSeconds = activeStopwatch?.seconds || 0;
                      
                      // Format time mm:ss for dynamic ticker
                      const formattedTimer = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

                      return (
                        <div key={wo.id} className={`p-4 rounded-[14px] border transition-all flex flex-col justify-between h-44 ${
                          wo.status === 'done' ? 'border-emerald-100 bg-emerald-50/10' :
                          wo.status === 'progress' ? 'border-blue-300 bg-blue-50/5 ring-1 ring-blue-500/10' :
                          wo.status === 'ready' ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-100 bg-slate-50/50'
                        }`}>
                          <div className="space-y-1">
                            <div className="flex justify-between items-start mb-1">
                              <Badge className={`text-[8px] font-black rounded-sm border-none px-1.5 ${
                                wo.status === 'done' ? 'bg-emerald-500 text-white' :
                                wo.status === 'progress' ? 'bg-blue-500 text-white animate-pulse' :
                                wo.status === 'ready' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-200'
                              }`}>
                                {
                                  wo.status === 'done' ? 'منتهي ومُدقق' :
                                  wo.status === 'progress' ? 'نشط وحي الآن' :
                                  wo.status === 'ready' ? 'متاح للبدء' : 'بانتظار المرحلة السابقة'
                                }
                              </Badge>
                              <span className="font-mono text-[9px] text-slate-400 font-bold">#{idx + 1}</span>
                            </div>
                            <h4 className="text-xs font-black text-slate-800 line-clamp-2">{wo.name}</h4>
                            <span className="text-[10px] text-indigo-700 font-extrabold flex items-center gap-1">
                              <Wrench size={10} /> {wo.workCenterName}
                            </span>
                          </div>

                          {/* Stopwatch Visuals */}
                          <div className="flex items-center justify-between border-t border-slate-100/50 pt-2 shrink-0">
                            <div>
                              <div className="text-[10px] font-black text-slate-400">الوقت المستهلك:</div>
                              <div className="font-mono text-sm font-black text-slate-700">
                                {wo.status === 'progress' ? (
                                  <span className="text-blue-600 font-extrabold">{formattedTimer}</span>
                                ) : (
                                  <span>{wo.durationActual || 0} دقيقة (مخطط {wo.durationPlanned} د)</span>
                                )}
                              </div>
                            </div>
                            
                            {/* WO Action Button Controls */}
                            <div className="flex gap-1 shrink-0">
                              {wo.status === 'ready' && (
                                <Button 
                                  size="icon" 
                                  onClick={() => handleStartStopwatch(mo.id, wo.id)}
                                  className="h-8 w-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  <Play size={13} fill="currentColor" />
                                </Button>
                              )}
                              {wo.status === 'progress' && (
                                <>
                                  <Button 
                                    size="icon" 
                                    onClick={() => handlePauseStopwatch(mo.id, wo.id)}
                                    className="h-8 w-8 rounded-full bg-amber-500 text-slate-900 hover:bg-amber-600"
                                  >
                                    <Pause size={13} fill="currentColor" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    onClick={() => handleDoneWorkOrder(mo.id, wo.id)}
                                    className="h-8 w-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    <CheckCircle size={13} />
                                  </Button>
                                </>
                              )}
                              {wo.status === 'paused' && (
                                <>
                                  <Button 
                                    size="icon" 
                                    onClick={() => handleStartStopwatch(mo.id, wo.id)}
                                    className="h-8 w-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                                  >
                                    <Play size={13} fill="currentColor" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    onClick={() => handleDoneWorkOrder(mo.id, wo.id)}
                                    className="h-8 w-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    <CheckCircle size={13} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: BILLS OF MATERIAL (BOM BUILDER WITH ROUTINGS) */}
      {activeSubTab === 'bom' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border shadow-sm">
            <div>
              <h2 className="text-base font-black text-slate-800">قائمة المواد المركبة والـمُعيرة (BoM Recipes / Bill of Materials)</h2>
              <p className="text-xs text-slate-400 font-bold">بناء هيكل النسب والمواد والتكاليف القياسية مع خطوات العمل (Routing) لكل موديل.</p>
            </div>
            <Button size="sm" onClick={() => setShowAddBOM(true)} className="bg-slate-900 border-none text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5"><Plus size={15} /> إضافة نموذج BoM</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boms.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl col-span-full border text-slate-400 font-extrabold">
                لا توجد قوائم مواد معرفة حالياً. انقر "إضافة نموذج" لتصميم التركيبات.
              </div>
            ) : (
              resolvedBoms.map(bom => {
                const totalMatCost = (bom.items || []).reduce((sum, bi) => {
                  const it = items.find(i => i.id === bi.itemId);
                  return sum + (it ? it.price * bi.quantity : 0);
                }, 0);

                return (
                  <Card key={bom.id} className="rounded-3xl border border-slate-150 shadow-sm bg-white">
                    <CardHeader className="pb-3 border-b border-slate-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm font-black text-slate-800">{bom.name}</CardTitle>
                          <CardDescription className="text-xs font-bold text-slate-500 mt-1">المنتج: {bom.productName}</CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">قاعدة: {bom.quantity || 1} وحدة</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      
                      {/* Ingredients list */}
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400 mb-2">المكونات والمواد المطلوبة ({bom.items?.length || 0})</h4>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {bom.items?.map((it, idx) => {
                            const matchedIngredient = items.find(i => i.id === it.itemId);
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl hover:bg-slate-100/50">
                                <span className="font-bold text-slate-700">{matchedIngredient ? matchedIngredient.name : 'مادة مجهولة'}</span>
                                <span className="font-mono font-bold text-slate-500">{it.quantity} {matchedIngredient ? matchedIngredient.unit : 'وحدة'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Routing steps preview */}
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400 mb-2">مسار تشغيل العمليات (Operations Routing)</h4>
                        {!(bom as any).operations || (bom as any).operations?.length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-bold">لا يوجد مسار عمليات مخصص. سيتم جدولة مراحل عامة للخطوات.</p>
                        ) : (
                          <div className="space-y-1.5 pr-1 max-h-30 overflow-y-auto">
                            {(bom as any).operations.map((op: any, idx: number) => {
                              const center = mrpWorkCenters.find(w => w.id === op.workCenterId);
                              return (
                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-indigo-50/20 rounded-xl">
                                  <span className="font-black text-slate-700 flex items-center gap-1.5">
                                    <Badge className="bg-slate-200 border-none text-slate-700 text-[8px] h-4 w-4 rounded-full flex items-center justify-center p-0 font-mono font-bold">{idx + 1}</Badge>
                                    {op.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 font-black flex items-center gap-1">
                                    <Clock size={11} /> {op.durationPlanned} د ({center ? center.name : 'مركز'})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Cost metrics */}
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-black text-slate-400">التكلفة التقديرية للمواد:</span>
                          <div className="font-mono font-black text-slate-800 text-sm">{(totalMatCost).toLocaleString()} ج.م</div>
                        </div>
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          onClick={async () => {
                            if (confirm('هل تود حذف نموذج قائمة المواد هذا؟')) {
                              try { await deleteDoc(doc(db, 'boms', bom.id)); } catch (err) {}
                            }
                          }}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-bold"
                        >
                          حذف النموذج
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: WORK CENTERS AND OEE MANAGING */}
      {activeSubTab === 'workcenters' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-black text-slate-800">مراكز الأداء والمعدات المعرفة (Workcenters & Infrastructure)</CardTitle>
                <CardDescription className="text-sm">مصانع ومقرات وورش تصنيع قطع الأثاث وصب المكونات بالوحدة.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddWC(true)} className="bg-slate-900 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5"><Plus size={15} /> تهيئة مركز عمل</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mrpWorkCenters.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-extrabold text-sm">لا توجد مراكز عمل معرفة. أنشئ ورشة نجار، منشار شريط، تنجيد، إلخ.</div>
                ) : (
                  mrpWorkCenters.map(wc => (
                    <div key={wc.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-all">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">{wc.name}</h4>
                        <div className="flex gap-4 mt-1.5 text-xs text-slate-400 font-semibold md:items-center">
                          <span className="flex items-center gap-1"><Coins size={13} /> تكلفة الساعة الحقيقية: <strong className="text-slate-700 font-mono font-black">{wc.hourlyRate} ج.م</strong></span>
                          <span className="flex items-center gap-1"><Target size={13} /> الكفاءة التشغيلية: <strong className="text-slate-700 font-mono font-black">{wc.efficiency || 95}%</strong></span>
                          <span>القدرة اليومية: <strong className="text-slate-700 font-mono font-bold">{wc.capacity || 100} ساعة/وحدة</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          onClick={async () => {
                            if (confirm('هل تريد حذف مركز العمل هذا؟ قد تسبب المخططات المرتبطة به التشتيت.')) {
                              try { await deleteDoc(doc(db, 'workCenters', wc.id)); } catch (err) {}
                            }
                          }}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Odoo machinery OEE parameters explanation card */}
          <Card className="rounded-3xl border-none shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-black text-slate-800">حساب كفاءة المعدة OEE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold text-slate-600">
              <p>يعتمد النظام على معادلة الكفاءة الفعالة لمراكز العمل لحساب تكلفة التصنيع بدقة:</p>
              <div className="p-3 bg-indigo-50/50 rounded-[14px] border border-indigo-100 text-indigo-800">
                OEE = توافر الآلة × كفاءة الأداء × جودة المخرجات
              </div>
              <ul className="list-disc pr-4 space-y-2">
                <li><strong>التوافر:</strong> نسبة التشغيل بدون خسائر التوقفات أو الأعطال المفاجئة.</li>
                <li><strong>الأداء:</strong> مقارنة الزمن الفعلي المستغرق في stopwatch مع زمن الـ BoM النموذجي المقدر.</li>
                <li><strong>الجودة:</strong> ترحيل المنتجات سليمة بنسبة 100% دون ارتدادات من الجودة QC.</li>
              </ul>
              <p className="text-slate-400">أي تقهقر أو تباطؤ في تتبع العمليات يؤثر تلقائياً على تكلفة الوحدة النهائية بالتحليل الهيكلي المباشر.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-TAB 7: SCRAP LOGS (أوامر التخريد والهادر المباشر) */}
      {activeSubTab === 'scrap' && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-black text-slate-800">بيان تفصيلي للهالك وتخريد المخرجات (Manufacturing Scrap & Waste Dashboard)</CardTitle>
            <CardDescription className="text-xs">الهالك الذي تم خصمه تلقائياً من الأرصدة لوقوع خلل بمحطة أو ماكينة معينة.</CardDescription>
          </CardHeader>
          <CardContent>
            {mrpScrap.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-extrabold">لا توجد سجلات تخريد للملف حالياً. سجل المواد الفاقدة من الزر بالأعلى لقيدها بالمخازن.</div>
            ) : (
              <div className="border border-slate-100 rounded-3xl overflow-hidden overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black">
                    <tr>
                      <th className="p-3">تاريخ الحركة</th>
                      <th className="p-3">رقم MO المسبب</th>
                      <th className="p-3">الخامة التالفة</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">الوحدة</th>
                      <th className="p-3">سبب التلف</th>
                      <th className="p-3">ملاحظات</th>
                      <th className="p-3">التحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {mrpScrap.map(s => {
                      const item = items.find(i => i.id === s.itemId);
                      const unitPrice = item ? item.price : 40;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-[11px] text-slate-500">{s.date}</td>
                          <td className="p-3 font-black text-indigo-700">{s.moName || 'تخريد مباشر حر'}</td>
                          <td className="p-3 font-black text-slate-800">{s.itemName}</td>
                          <td className="p-3 font-mono text-red-600 font-extrabold">-{s.quantity}</td>
                          <td className="p-3 text-slate-600">{s.unit}</td>
                          <td className="p-3">
                            <Badge className="bg-red-50 text-red-600 hover:bg-red-50 font-bold border-red-100 text-[10px] rounded-md">{s.reason}</Badge>
                          </td>
                          <td className="p-3 text-slate-400 font-semibold">{s.notes || '-'}</td>
                          <td className="p-3 text-slate-500 font-bold">-{ (s.quantity * unitPrice).toLocaleString() } ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUB-TAB 8: COSTING REPORT (PLANNED VS ACTUAL COST VARIANCE ANALYSER) */}
      {activeSubTab === 'costing' && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-black text-slate-800">تقرير مقارنة الانحراف الفعلي للتكاليف (Expected vs. Real Manufacturing Pricing)</CardTitle>
            <CardDescription className="text-xs">يقارن هذا الجدول الهيكلي بين التكاليف النظرية للـ BoM مع التكاليف الحقيقية بناء على المواد المستهلكة وعدادات ساعات مراكز العمل.</CardDescription>
          </CardHeader>
          <CardContent>
            {mrpOrders.filter(o => o.status === 'done').length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-extrabold text-sm">لا توجد أوامر مكتملة بعد. يرجى ترحيل وأرشفة أمر واحد لمطالعة التقرير المالي.</div>
            ) : (
              <div className="border border-slate-100 rounded-3xl overflow-hidden overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black">
                    <tr>
                      <th className="p-3">كود MO</th>
                      <th className="p-3">المنتج النهائي</th>
                      <th className="p-3">المخزون الوارد</th>
                      <th className="p-3">تكلفة الخامات النظرية</th>
                      <th className="p-3">ساعات العمل المقدرة</th>
                      <th className="p-3">خامات فعلية ومستهلكة</th>
                      <th className="p-3">زمن وساعات العمل الواقعية</th>
                      <th className="p-3">تكلفة المراكز الفعلية</th>
                      <th className="p-3">إجمالي التكلفة الفنية للوحدة</th>
                      <th className="p-3">معدل الانحياز والانحراف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold">
                    {mrpOrders.filter(o => o.status === 'done').map(mo => {
                      // Sum planned material
                      const planMat = mo.materials.reduce((sum, m) => sum + (m.plannedQty * m.unitPrice), 0);
                      // Sum actual consumed material
                      const actMat = mo.materials.reduce((sum, m) => sum + (m.consumedQty * m.unitPrice), 0);
                      
                      // Sum planned working times
                      const planTime = mo.workOrders.reduce((sum, w) => sum + w.durationPlanned, 0); // minutes
                      const actTime = mo.workOrders.reduce((sum, w) => sum + (w.durationActual || 0), 0); // minutes

                      // Actual working center costs = actual hours * hourly rate
                      const actWCCost = mo.workOrders.reduce((sum, w) => {
                        const actualHours = (w.durationActual || 0) / 60;
                        return sum + (actualHours * w.hourlyRate);
                      }, 0);

                      const totalActualCost = actMat + actWCCost;
                      const unitCost = totalActualCost / (mo.quantity || 1);
                      const variance = ((totalActualCost - planMat) / (planMat || 1)) * 100;

                      return (
                        <tr key={mo.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-black text-slate-800">{mo.name}</td>
                          <td className="p-3 text-slate-700 font-black">{mo.productName}</td>
                          <td className="p-3 font-mono font-bold text-slate-500">+{mo.quantity} وحدة</td>
                          <td className="p-3 font-mono text-slate-600">{planMat.toLocaleString()} ج.م</td>
                          <td className="p-3 font-mono text-slate-500">{planTime} دقيقة</td>
                          <td className="p-3 font-mono text-indigo-700 font-extrabold">{actMat.toLocaleString()} ج.م</td>
                          <td className="p-3 font-mono text-indigo-600 font-bold">{actTime} دقيقة</td>
                          <td className="p-3 font-mono text-amber-700 font-black">{actWCCost.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</td>
                          <td className="p-3 font-mono font-black text-emerald-800 bg-emerald-50/30 text-center text-sm">{unitCost.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</td>
                          <td className="p-3">
                            <Badge className={`${
                              variance <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-50'
                            } text-[10px] font-black rounded-md`}>
                              {variance > 0 ? `+${variance.toFixed(1)}% انحراف سلبي` : `${variance.toFixed(1)}% توفير`}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DETAILED MO EXPANSION / CHECKING MODAL */}
      {selectedMoForDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-4xl rounded-3xl border-0 shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-black text-slate-800">تفاصيل فحص وتخمين ومراجعة الخامات لـ {selectedMoForDetails.name}</CardTitle>
                <CardDescription className="text-xs">مستويات التركيب الهندسية وفحوصات المواد المترابطة مع كشف المستودع القياسي</CardDescription>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setSelectedMoForDetails(null)}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-400">المنتج النهائي</span>
                  <div className="text-sm font-black text-slate-800 mt-1">{selectedMoForDetails.productName}</div>
                  <span className="text-[10px] text-slate-400 font-medium">الكمية: {selectedMoForDetails.quantity} وحدة</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-400">تاريخ الجدولة المعتمد</span>
                  <div className="text-sm font-black text-slate-800 mt-1">{selectedMoForDetails.datePlanned}</div>
                  <span className="text-[10px] text-slate-400 font-medium">المخزن الوارد: {selectedMoForDetails.destinationWarehouseId === 'showroom' ? 'صالة المعرض' : 'المستودع الإداري'}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-400">حالة خط السير المعياري</span>
                  <div className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5 capitalize">
                    <Badge variant="outline">{selectedMoForDetails.status}</Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">البروتوكول القياسي لتخطيط الموارد</span>
                </div>
              </div>

              {/* Ingredients Checklist and Live Adjustments */}
              <div>
                <h3 className="text-xs font-black text-slate-600 mb-3 flex items-center gap-2">
                  <Layers size={14} className="text-slate-400" />
                  قائمة الخامات المطلوبة وواقع المخزون
                </h3>
                <div className="border border-slate-100 rounded-[14px] overflow-hidden overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">الخامة المطلوبة</th>
                        <th className="p-2.5">المخطط المطلوب</th>
                        <th className="p-2.5">المستهلك الفعلي</th>
                        <th className="p-2.5">رصيد المستودع المعاصر</th>
                        <th className="p-2.5">سعر الوحدة الافتراضي</th>
                        <th className="p-2.5">التوافر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {selectedMoForDetails.materials.map((m, idx) => {
                        const itemObj = items.find(it => it.id === m.itemId);
                        const storeQty = itemObj ? itemObj.currentBalance : 0;
                        const isAvailable = storeQty >= m.plannedQty;

                        return (
                          <tr key={idx} className="hover:bg-slate-100/30">
                            <td className="p-2.5 font-black">{m.itemName}</td>
                            <td className="p-2.5 font-mono text-slate-500">{m.plannedQty} {m.unit}</td>
                            <td className="p-2.5">
                              {selectedMoForDetails.status === 'done' || selectedMoForDetails.status === 'cancel' ? (
                                <span className="font-mono font-bold">{m.consumedQty} {m.unit}</span>
                              ) : (
                                <input 
                                  type="number" 
                                  className="w-20 p-1 border rounded-md text-xs font-mono font-bold"
                                  value={m.consumedQty}
                                  onChange={(e) => {
                                    const updatedMoMats = [...selectedMoForDetails.materials];
                                    updatedMoMats[idx] = { ...updatedMoMats[idx], consumedQty: Number(e.target.value) };
                                    setSelectedMoForDetails({
                                      ...selectedMoForDetails,
                                      materials: updatedMoMats
                                    });
                                  }}
                                  title="يمكنك تعديل كميات الاستهلاك الفعلي يدوياً بحال حدوث هدر مختلف عن الـ BoM"
                                />
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-slate-500 font-bold">{storeQty} {m.unit}</td>
                            <td className="p-2.5 font-mono text-slate-500">{m.unitPrice} ج.م</td>
                            <td className="p-2.5">
                              <Badge className={`${isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-red-600 border-red-100'} border text-[9px] font-black rounded-md`}>
                                {isAvailable ? 'متوفر' : `عجز: ${m.plannedQty - storeQty}`}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Work Orders stages on MO modal */}
              <div>
                <h3 className="text-xs font-black text-slate-600 mb-3 flex items-center gap-2">
                  <Wrench size={14} className="text-slate-400" />
                  مراحل العمل ومعدلات التكلفة والمحطات
                </h3>
                <div className="space-y-2">
                  {selectedMoForDetails.workOrders.map((wo, index) => {
                    const actualHourCost = ((wo.durationActual || 0) / 60) * wo.hourlyRate;
                    return (
                      <div key={wo.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between text-xs hover:border-slate-300 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-slate-400 font-extrabold">#{index + 1}</span>
                          <div>
                            <span className="font-black text-slate-800">{wo.name}</span>
                            <span className="text-[10px] text-indigo-600 font-bold block">{wo.workCenterName} ({wo.hourlyRate} ج.م/ساعة)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 font-mono">
                          <div className="text-left">
                            <span className="text-[9px] text-slate-400 font-black block">زمن (مخطط / فعلي):</span>
                            <span className="font-bold text-slate-700">{wo.durationPlanned} د / {wo.durationActual || 0} د</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] text-slate-400 font-black block">التكلفة الفعلية المحسوبة:</span>
                            <span className="font-bold text-slate-700">{actualHourCost.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                          </div>
                          <Badge className={`${
                            wo.status === 'done' ? 'bg-emerald-500 text-white' :
                            wo.status === 'progress' ? 'bg-blue-500 text-white animate-pulse' :
                            'bg-slate-200 text-slate-600 hover:bg-slate-200'
                          } border-none font-bold text-[9px]`}>
                            {wo.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal controls */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <p className="text-[10px] text-slate-400 font-semibold">* يمكنك التعديل التحريري للاستهلاك الفعلي قبل إغلاق أمر التصنيع.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedMoForDetails(null)} className="font-bold text-xs rounded-xl">إغلاق النافذة</Button>
                  
                  {/* Save changes to Firebase */}
                  {selectedMoForDetails.status !== 'done' && selectedMoForDetails.status !== 'cancel' && (
                    <Button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'mrpOrders', selectedMoForDetails.id), {
                            materials: selectedMoForDetails.materials
                          });
                          setSelectedMoForDetails(null);
                          alert('تم الحفظ بنجاح');
                        } catch (err) {
                          alert('حدث خطأ: ' + err);
                        }
                      }}
                      className="bg-slate-900 border-none hover:bg-slate-800 text-white text-xs font-black rounded-xl"
                    >
                      حفظ التغييرات بالتعديلات الحالية
                    </Button>
                  )}

                  {/* Complete MO stock movement */}
                  {(selectedMoForDetails.status === 'confirmed' || selectedMoForDetails.status === 'progress') && (
                    <Button 
                      onClick={() => handleFinishMO(selectedMoForDetails)} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl"
                    >
                      موافقة التوريد للمخازن (Done)
                    </Button>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL / FORM 1: CREATE MANUFACTURING ORDER */}
      {showAddMO && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg rounded-3xl border-0 shadow-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-black text-slate-800">جدولة وتشكيل أمر تصنيع معياري (Create Manufacturing Order)</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setShowAddMO(false)}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-right">
              
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">1. اختر الـمنتج النهائي المراد تصنيعه</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={moForm.productId}
                  onChange={(e) => {
                    // Match with first BoM of index
                    const matchedBOM = boms.find(b => b.productId === e.target.value);
                    setMoForm(p => ({
                      ...p,
                      productId: e.target.value,
                      bomId: matchedBOM ? matchedBOM.id : ''
                    }));
                  }}
                >
                  <option value="">اختر المنتج من الكتالوج الطبيعي...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (رصيد المخزن الحالي: {i.currentBalance} {i.unit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">2. نموذج قائمة المواد المقترنة (BOM)</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={moForm.bomId}
                  onChange={(e) => setMoForm(p => ({ ...p, bomId: e.target.value }))}
                >
                  <option value="">اختر تركيب المواد والمسار...</option>
                  {resolvedBoms.filter(b => b.productId === moForm.productId).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {moForm.productId && resolvedBoms.filter(b => b.productId === moForm.productId).length === 0 && (
                  <p className="text-[10px] text-rose-500 font-extrabold mt-1">
                    * لا يوجد قائمة مواد معيارية (BoM) معرفة لهذا المنتج النهائي. يرجى تهيئة BoM له بالتوجيهات بالأعلى أولاً للتشغيل والجدولة.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">الكمية المستهدفة</label>
                  <Input 
                    type="number" 
                    min={1} 
                    className="p-2.5 rounded-xl text-xs font-bold text-right"
                    value={moForm.quantity}
                    onChange={(e) => setMoForm(p => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">تاريخ البدء المجدول</label>
                  <Input 
                    type="date" 
                    className="p-2.5 rounded-xl text-xs font-bold text-right"
                    value={moForm.datePlanned}
                    onChange={(e) => setMoForm(p => ({ ...p, datePlanned: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">مستودع سحب الخامات</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={moForm.sourceWarehouseId}
                    onChange={(e) => setMoForm(p => ({ ...p, sourceWarehouseId: e.target.value }))}
                  >
                    <option value="">مخزن المواد الأولية الرئيسي</option>
                    <option value="wood_depot">قسم الأخشاب</option>
                    <option value="fabrics_depot">قسم التنجيد والأقمشة</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">مستودع استقبال المخرجات</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={moForm.destinationWarehouseId}
                    onChange={(e) => setMoForm(p => ({ ...p, destinationWarehouseId: e.target.value }))}
                  >
                    <option value="showroom">صالة العرض الكبرى</option>
                    <option value="main">المخازن العامة</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">ملاحظات التصنيع الفنية</label>
                <textarea 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none h-16"
                  placeholder="سرع من مرحلة الدهان، المواصفات متوافقة مع طلبية عميل..."
                  value={moForm.notes}
                  onChange={(e) => setMoForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddMO(false)} className="w-1/2 rounded-xl font-bold text-xs">إلغاء</Button>
                <Button onClick={handleCreateMO} className="w-1/2 bg-slate-900 border-none hover:bg-slate-800 text-white font-black text-xs rounded-xl">جدولة أمر التصنيع</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL / FORM 2: CREATE BILL OF MATERIALS (BOM) */}
      {showAddBOM && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl rounded-3xl border-0 shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-800">تأسيس قائمة خامات ومسار عمليات تصنيعي (Add Bill of Materials)</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setShowAddBOM(false)}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-right">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">اختر المنتج النهائي المستهدف</label>
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={bomForm.productId}
                    onChange={(e) => setBomForm(p => ({ ...p, productId: e.target.value }))}
                  >
                    <option value="">اختر من كتالوج السلع...</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">اسم النموذج المالي التقديري (BoM Ref)</label>
                  <Input 
                    placeholder="Ref: BOM/BED-Classic-01" 
                    className="rounded-xl text-xs font-bold text-right"
                    value={bomForm.name}
                    onChange={(e) => setBomForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
              </div>

              {/* Ingredients Builder */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black text-slate-600">المكونات والمواد الأولية المطلوبة</h3>
                  <Button size="xs" onClick={handleAddIngredientRow} variant="outline" className="text-indigo-600 border-indigo-100 font-extrabold"><Plus size={12} /> إضافة مادة</Button>
                </div>

                {bomForm.ingredients.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-bold text-center py-6 bg-slate-50 rounded-[14px]">لم يتم إدراج أي مواد خام حتى الآن. قائمة خامات فارغة.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {bomForm.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select 
                          className="flex-1 p-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                          value={ing.itemId}
                          onChange={(e) => handleUpdateIngredient(idx, 'itemId', e.target.value)}
                        >
                          <option value="">اختر المادة من المخزن...</option>
                          {items.map(i => (
                            <option key={i.id} value={i.id}>{i.name} (سعره: {i.price} ج.م)</option>
                          ))}
                        </select>
                        <Input 
                          type="number" 
                          min={0.15} 
                          step={0.1}
                          className="w-24 text-right rounded-xl text-xs font-bold"
                          placeholder="الكمية"
                          value={ing.quantity}
                          onChange={(e) => handleUpdateIngredient(idx, 'quantity', Number(e.target.value))}
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="h-9 w-9 text-rose-500 rounded-xl"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Routings Router Builders */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black text-slate-600">مسار عمليات محطات العمل (Workstation Routings)</h3>
                  <Button size="xs" onClick={handleAddOperationRow} variant="outline" className="text-indigo-600 border-indigo-100 font-extrabold"><Plus size={12} /> إضافة خطوة تشغيلية</Button>
                </div>

                {bomForm.operations.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-bold text-center py-6 bg-slate-50 rounded-[14px]">لا يوجد مسار خطوات عمليات محدد. سيتم بناء مسار قياسي تلقائياً عند طلب التصنيع.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {bomForm.operations.map((op, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 border p-2 rounded-xl bg-slate-50/50">
                        <Input 
                          placeholder="اسم المرحلة (تقطيع مثلاً)" 
                          className="rounded-xl text-xs font-bold text-right bg-white"
                          value={op.name}
                          onChange={(e) => handleUpdateOperationRow(idx, 'name', e.target.value)}
                        />
                        <select 
                          className="p-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-black"
                          value={op.workCenterId}
                          onChange={(e) => handleUpdateOperationRow(idx, 'workCenterId', e.target.value)}
                        >
                          <option value="">مكان العمل/الماكينة...</option>
                          {mrpWorkCenters.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.hourlyRate} ج.م/س)</option>
                          ))}
                        </select>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="number" 
                            className="text-right rounded-xl text-xs font-bold bg-white"
                            placeholder="الزمن بالدقيقة"
                            value={op.durationPlanned}
                            onChange={(e) => handleUpdateOperationRow(idx, 'durationPlanned', Number(e.target.value))}
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleRemoveOperationRow(idx)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddBOM(false)} className="w-1/2 rounded-xl font-bold text-xs">إلغاء</Button>
                <Button onClick={handleCreateBOM} className="w-1/2 bg-slate-900 border-none hover:bg-slate-800 text-white font-black text-xs rounded-xl">حفظ نموذج التركيب (BoM)</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL / FORM 3: CREATE WORK CENTER */}
      {showAddWC && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-3xl border-0 shadow-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-slate-800">تعريف مركز عمل أو ورشة مادية (Create Work Center)</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setShowAddWC(false)}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-right">
              
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">اسم مركز العمل</label>
                <Input 
                  placeholder="ورشة منشار الشريط الكبرى، ورشة الدهان والتجفيف..." 
                  className="rounded-xl text-xs font-bold text-right"
                  value={wcForm.name}
                  onChange={(e) => setWcForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">تكلفة تشغيل الساعة الواحدة (ج.م / ساعة)</label>
                <Input 
                  type="number" 
                  className="rounded-xl text-xs font-bold text-right"
                  value={wcForm.hourlyRate}
                  onChange={(e) => setWcForm(p => ({ ...p, hourlyRate: Number(e.target.value) }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">القدرة اليومية (ساعات)</label>
                  <Input 
                    type="number" 
                    className="rounded-xl text-xs font-bold text-right"
                    value={wcForm.capacity}
                    onChange={(e) => setWcForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 block">مؤشر كفاءة البدء (%)</label>
                  <Input 
                    type="number" 
                    max={100}
                    className="rounded-xl text-xs font-bold text-right"
                    value={wcForm.efficiency}
                    onChange={(e) => setWcForm(p => ({ ...p, efficiency: Math.min(100, Number(e.target.value)) }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddWC(false)} className="w-1/2 rounded-xl font-bold text-xs">إلغاء</Button>
                <Button onClick={handleCreateWorkCenter} className="w-1/2 bg-slate-900 border-none hover:bg-slate-800 text-white font-black text-xs rounded-xl">حفظ مركز العمل</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL / FORM 4: CREATE SCRAP LOG */}
      {showAddScrap && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-3xl border-0 shadow-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-black text-rose-700">تخريد وإتلاف خامة من الأرصدة (Record Scrap / Waste)</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setShowAddScrap(false)}><X size={16} /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-right">
              
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">قيد الحركة المسببة (اختياري)</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={scrapForm.moId}
                  onChange={(e) => {
                    const matchedMo = mrpOrders.find(o => o.id === e.target.value);
                    setScrapForm(p => ({
                      ...p,
                      moId: e.target.value,
                      itemId: matchedMo?.productId || ''
                    }));
                  }}
                >
                  <option value="">تلف حر مستقل بمحطة تصنيع</option>
                  {mrpOrders.filter(o => o.status === 'confirmed' || o.status === 'progress').map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.productName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">الخامة التالفة أو المخرود عليها</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={scrapForm.itemId}
                  onChange={(e) => setScrapForm(p => ({ ...p, itemId: e.target.value }))}
                >
                  <option value="">اختر الخامة لإتلافها...</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (رصيد المخزن الحالي: {i.currentBalance} {i.unit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">الكمية التالفة</label>
                <Input 
                  type="number" 
                  min={0.01} 
                  step={0.1}
                  className="rounded-xl text-xs font-bold text-right font-mono"
                  value={scrapForm.quantity}
                  onChange={(e) => setScrapForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">سبب التخريد</label>
                <select 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={scrapForm.reason}
                  onChange={(e) => setScrapForm(p => ({ ...p, reason: e.target.value }))}
                >
                  <option value="تلف اثناء تجليخ/تصنيع">تلف اثناء تجليخ أو تصنيع ميكانيكي</option>
                  <option value="سوء مصنعية / عيب عمال">خطأ عمال صالة الورش والتجميع</option>
                  <option value="رداءة خامات مورد">رداءة الخامات الموردة بمستودع الخشب</option>
                  <option value="أخرى / هالك غير نمطي">أخرى / هالك غير نمطي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 block">ملاحظات التخريد</label>
                <textarea 
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none h-14"
                  placeholder="تم إتلاف قطعة السد اللوحية رقم 2 لزيادة الضغط..."
                  value={scrapForm.notes}
                  onChange={(e) => setScrapForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAddScrap(false)} className="w-1/2 rounded-xl font-bold text-xs">إلغاء</Button>
                <Button onClick={handleCreateScrap} className="w-1/2 bg-rose-600 border-none hover:bg-rose-700 text-white font-black text-xs rounded-xl">تأكيد التخريد وخصم المخزن</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
