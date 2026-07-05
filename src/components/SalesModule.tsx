import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch, 
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { 
  Building2, 
  Plus, 
  ShoppingCart, 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Layers, 
  Users, 
  Printer, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Briefcase, 
  Phone, 
  MapPin, 
  Calendar, 
  Package, 
  Search, 
  FileText, 
  BarChart3, 
  UserPlus,
  Coins,
  Check,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Showroom, 
  ShowroomInventory, 
  TransferOrder, 
  SalesOrder, 
  ProductionJob, 
  Safe, 
  SafeTransaction, 
  UserProfile,
  LostSale 
} from '../types';

interface SalesModuleProps {
  showrooms: Showroom[];
  transferOrders: TransferOrder[];
  showroomInventory: ShowroomInventory[];
  salesOrders: SalesOrder[];
  productionJobs: ProductionJob[];
  safes: Safe[];
  profile: UserProfile | null;
  lostSales: LostSale[];
}

export function SalesModule({ 
  showrooms, 
  transferOrders, 
  showroomInventory, 
  salesOrders, 
  productionJobs, 
  safes, 
  profile,
  lostSales
}: SalesModuleProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'showrooms' | 'inventory' | 'transfers' | 'sales' | 'lostSales'>('dashboard');

  // Modals / Form toggles
  const [showAddShowroom, setShowAddShowroom] = useState(false);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [showAddLostSale, setShowAddLostSale] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesOrder | null>(null);

  // Form states - Showroom
  const [showroomName, setShowroomName] = useState('');
  const [showroomLocation, setShowroomLocation] = useState('');
  const [showroomManager, setShowroomManager] = useState('');

  // Form states - Transfer
  const [transferToShowroomId, setTransferToShowroomId] = useState('');
  const [transferJobIds, setTransferJobIds] = useState<string[]>([]);
  const [transferNotes, setTransferNotes] = useState('');

  // Form states - Sales Order
  const [saleShowroomId, setSaleShowroomId] = useState('');
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [saleInventoryItemId, setSaleInventoryItemId] = useState(''); // Selected from ShowroomInventory
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleLogistics, setSaleLogistics] = useState<number>(0);
  const [saleCommission, setSaleCommission] = useState<number>(0);
  const [salePaymentMethod, setSalePaymentMethod] = useState<'نقدي' | 'شبكة' | 'تحويل بنكي'>('نقدي');
  const [saleSafeId, setSaleSafeId] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  // Form states - Lost Sale
  const [lostSaleShowroomId, setLostSaleShowroomId] = useState('');
  const [lostSaleProductName, setLostSaleProductName] = useState('');
  const [lostSaleNotes, setLostSaleNotes] = useState('');

  // Search / Filters
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryShowroomFilter, setInventoryShowroomFilter] = useState('الكل');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesShowroomFilter, setSalesShowroomFilter] = useState('الكل');

  // Operational Overhead Rate (fixed at 15%)
  const OVERHEAD_RATE = 0.15;

  // --- Dynamic Mappings / Computations ---
  
  // Calculate total metrics
  const stats = useMemo(() => {
    const totalSalesValue = salesOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCOGS = salesOrders.reduce((sum, o) => sum + o.totalCOGS, 0);
    const totalLogistics = salesOrders.reduce((sum, o) => sum + o.totalLogisticsCost, 0);
    const totalCommission = salesOrders.reduce((sum, o) => sum + o.totalCommission, 0);
    const totalOverhead = salesOrders.reduce((sum, o) => sum + o.totalOperationalOverhead, 0);
    const totalNetProfit = salesOrders.reduce((sum, o) => sum + o.netProfit, 0);

    // Showroom Inventory valuation based on manufacturing cost
    const inventoryValuation = showroomInventory.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.quantity || 1)), 0);

    return {
      totalSales: totalSalesValue,
      totalProfit: totalNetProfit,
      averageMargin: totalSalesValue > 0 ? (totalNetProfit / totalSalesValue) * 100 : 0,
      inventoryValuation,
      totalShowroomsCount: showrooms.length,
      salesCount: salesOrders.length,
      transfersCount: transferOrders.length,
    };
  }, [salesOrders, showroomInventory, showrooms, transferOrders]);

  // Map showrooms by ID for quick access
  const showroomMap = useMemo(() => {
    const map: Record<string, Showroom> = {};
    showrooms.forEach(s => { map[s.id] = s; });
    return map;
  }, [showrooms]);

  // Production jobs mapped by ID
  const jobMap = useMemo(() => {
    const map: Record<string, ProductionJob> = {};
    productionJobs.forEach(j => { map[j.id] = j; });
    return map;
  }, [productionJobs]);

  // Available jobs to transfer: Completed and not already in showroom inventory, not sold, etc.
  const jobsAvailableForTransfer = useMemo(() => {
    // A job can be transferred if it's completed (readyForDelivery or in specific status) 
    // AND is not already transferred (i.e. not in any showroom inventory and not sold)
    const activeInventoryJobIds = new Set(showroomInventory.map(item => item.itemId));
    const soldJobIds = new Set();
    salesOrders.forEach(so => {
      so.items.forEach(item => soldJobIds.add(item.jobId));
    });

    return productionJobs.filter(job => {
      const isCompleted = job.status.includes('جاهز') || job.readyForDelivery || job.status.includes('تغليف') || job.status.includes('تسليم');
      return isCompleted && !activeInventoryJobIds.has(job.id) && !soldJobIds.has(job.id);
    });
  }, [productionJobs, showroomInventory, salesOrders]);

  // Selected items in Transfer Order form
  const handleToggleTransferJob = (jobId: string) => {
    if (transferJobIds.includes(jobId)) {
      setTransferJobIds(transferJobIds.filter(id => id !== jobId));
    } else {
      setTransferJobIds([...transferJobIds, jobId]);
    }
  };

  // Safe Balance & Details mapping
  const activeSafes = useMemo(() => {
    return safes.filter(s => s.type === 'خزنة رئيسية' || s.type === 'بنك');
  }, [safes]);

  // --- actions/Firestore Handlers ---

  const handleAddShowroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showroomName || !showroomLocation) return;

    try {
      await addDoc(collection(db, 'showrooms'), {
        name: showroomName,
        location: showroomLocation,
        managerName: showroomManager || 'غير محدد',
        createdAt: serverTimestamp()
      });

      setShowroomName('');
      setShowroomLocation('');
      setShowroomManager('');
      setShowAddShowroom(false);
    } catch (error) {
      console.error('Error adding showroom:', error);
    }
  };

  const handleDeleteShowroom = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المعرض؟ لا يمكن التراجع عن هذه الخطوة.')) return;
    try {
      await deleteDoc(doc(db, 'showrooms', id));
    } catch (error) {
      console.error('Error deleting showroom:', error);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferToShowroomId || transferJobIds.length === 0) {
      alert('الرجاء اختيار المعرض واختيار قطعة واحدة على الأقل للتحويل.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const transferId = doc(collection(db, 'transferOrders')).id;

      const items = transferJobIds.map(jobId => {
        const job = jobMap[jobId];
        const directCost = (job?.totalMaterialCost || 0) + (job?.totalLaborCost || 0) + (job?.totalOtherCost || 0);
        return {
          itemId: jobId,
          quantity: 1,
          costPrice: directCost || job?.estimatedCost || 0
        };
      });

      // 1. Create Transfer Order
      batch.set(doc(db, 'transferOrders', transferId), {
        date: new Date().toISOString().split('T')[0],
        fromWarehouse: 'المصنع الرئيسي',
        toShowroomId: transferToShowroomId,
        items,
        notes: transferNotes || '',
        status: 'تم التحويل',
        createdAt: serverTimestamp()
      });

      // 2. Automatically seed to Showroom Inventory as "In Transit" or active inventory with custom pending status
      items.forEach(item => {
        const invId = doc(collection(db, 'showroomInventory')).id;
        batch.set(doc(db, 'showroomInventory', invId), {
          showroomId: transferToShowroomId,
          itemId: item.itemId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          status: 'pending_receipt', // Pending confirmation
          transferOrderId: transferId,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();

      setTransferToShowroomId('');
      setTransferJobIds([]);
      setTransferNotes('');
      setShowAddTransfer(false);
    } catch (error) {
      console.error('Error adding transfer:', error);
    }
  };

  // Confirm receipt of transfer order
  const handleConfirmReceipt = async (transfer: TransferOrder) => {
    try {
      const batch = writeBatch(db);

      // 1. Update transfer order status
      batch.update(doc(db, 'transferOrders', transfer.id), {
        status: 'تم الاستلام',
        receivedAt: serverTimestamp()
      });

      // 2. Query and update all matching showroom inventory items for this transfer
      const matchedInventoryItems = showroomInventory.filter(inv => inv.transferOrderId === transfer.id);
      matchedInventoryItems.forEach(item => {
        batch.update(doc(db, 'showroomInventory', item.id), {
          status: 'available' // Now available for sale
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error confirming receipt:', error);
    }
  };

  // Handle Sales Order save
  const handleAddSaleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleShowroomId || !saleInventoryItemId || !saleSafeId || salePrice <= 0) {
      alert('الرجاء تعبئة كافة الحقول المطلوبة واختيار قطعة للبيع وخزنة لإيداع المبلغ.');
      return;
    }

    const inventoryItem = showroomInventory.find(item => item.id === saleInventoryItemId);
    if (!inventoryItem) return;

    const job = jobMap[inventoryItem.itemId];
    const cogs = inventoryItem.costPrice || 0;
    const overhead = salePrice * OVERHEAD_RATE;
    const netProfit = salePrice - cogs - saleLogistics - saleCommission - overhead;

    try {
      const batch = writeBatch(db);
      const salesId = doc(collection(db, 'salesOrders')).id;

      // 1. Create Sales Order
      batch.set(doc(db, 'salesOrders', salesId), {
        date: new Date().toISOString().split('T')[0],
        showroomId: saleShowroomId,
        customerName: saleCustomerName || 'عميل معرض',
        customerPhone: saleCustomerPhone || '',
        items: [
          {
            jobId: inventoryItem.itemId,
            sellingPrice: salePrice,
            cogs: cogs,
            logisticsCost: saleLogistics,
            commission: saleCommission
          }
        ],
        totalAmount: salePrice,
        totalCOGS: cogs,
        totalLogisticsCost: saleLogistics,
        totalCommission: saleCommission,
        operationalOverheadRate: OVERHEAD_RATE,
        totalOperationalOverhead: overhead,
        netProfit: netProfit,
        paymentMethod: salePaymentMethod,
        notes: saleNotes || '',
        createdAt: serverTimestamp()
      });

      // 2. Remove from Showroom Inventory (or mark as Sold)
      batch.delete(doc(db, 'showroomInventory', inventoryItem.id));

      // 3. Create Safe Transaction (Receipt)
      const transId = doc(collection(db, 'safeTransactions')).id;
      const showroom = showroomMap[saleShowroomId];
      batch.set(doc(db, 'safeTransactions', transId), {
        safeId: saleSafeId,
        date: new Date().toISOString().split('T')[0],
        type: 'مبيعات',
        amount: salePrice,
        description: `مبيعات معرض - فاتورة مبيعات قطعة: ${job?.productName || 'أثاث'} - عميل: ${saleCustomerName || 'معرض'}`,
        relatedId: salesId,
        createdBy: profile?.name || 'النظام',
        createdAt: serverTimestamp()
      });

      // 4. Update Safe Balance
      batch.update(doc(db, 'safes', saleSafeId), {
        balance: increment(salePrice)
      });

      // 5. Update Production Job status to "Delivered / Sold"
      if (job) {
        batch.update(doc(db, 'productionJobs', job.id), {
          status: 'تم التسليم والبيع',
          sellingPrice: salePrice
        });
      }

      await batch.commit();

      // Reset
      setSaleInventoryItemId('');
      setSalePrice(0);
      setSaleLogistics(0);
      setSaleCommission(0);
      setSaleCustomerName('');
      setSaleCustomerPhone('');
      setSaleNotes('');
      setShowAddSale(false);
    } catch (error) {
      console.error('Error saving sales order:', error);
    }
  };

  // Lost Sale Action
  const handleAddLostSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostSaleShowroomId || !lostSaleProductName) return;

    try {
      await addDoc(collection(db, 'lostSales'), {
        date: new Date().toISOString().split('T')[0],
        showroomId: lostSaleShowroomId,
        productName: lostSaleProductName,
        notes: lostSaleNotes || '',
        createdAt: serverTimestamp()
      });

      setLostSaleProductName('');
      setLostSaleNotes('');
      setShowAddLostSale(false);
    } catch (error) {
      console.error('Error recording lost sale:', error);
    }
  };

  const handleDeleteSalesOrder = async (order: SalesOrder) => {
    if (!window.confirm('هل أنت متأكد من إلغاء وحذف هذه الفاتورة؟ سيتم إعادة القطعة للمخزون واسترجاع الأموال من الخزنة.')) return;
    
    try {
      const batch = writeBatch(db);
      
      // 1. Delete Sales Order
      batch.delete(doc(db, 'salesOrders', order.id));

      // 2. Put item back in showroom inventory
      const firstItem = order.items[0];
      if (firstItem) {
        const invId = doc(collection(db, 'showroomInventory')).id;
        batch.set(doc(db, 'showroomInventory', invId), {
          showroomId: order.showroomId,
          itemId: firstItem.jobId,
          quantity: 1,
          costPrice: firstItem.cogs,
          status: 'available',
          createdAt: serverTimestamp()
        });

        // Restore production job status
        batch.update(doc(db, 'productionJobs', firstItem.jobId), {
          status: 'جاهز للتسليم'
        });
      }

      // 3. Find and delete related Safe Transactions, and deduct the safe balance
      // Since query requires async get, we will do a write to the safe via decrement of order total amount
      // and let the user handle transactions manually, or we can look up if safes exist.
      const safeId = order.paymentMethod === 'نقدي' ? safes[0]?.id : safes.find(s => s.type === 'بنك')?.id || safes[0]?.id;
      if (safeId) {
        batch.update(doc(db, 'safes', safeId), {
          balance: increment(-order.totalAmount)
        });

        // Add adjustment transaction
        const adjTransId = doc(collection(db, 'safeTransactions')).id;
        batch.set(doc(db, 'safeTransactions', adjTransId), {
          safeId: safeId,
          date: new Date().toISOString().split('T')[0],
          type: 'سحب',
          amount: order.totalAmount,
          description: `إلغاء فاتورة مبيعات المعرض رقم ${order.id.slice(0,6)}`,
          relatedId: order.id,
          createdBy: profile?.name || 'النظام',
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting sales order:', error);
    }
  };

  // Filtered Showroom Inventory list
  const filteredInventory = useMemo(() => {
    return showroomInventory.filter(item => {
      const job = jobMap[item.itemId];
      const prodName = job?.productName || 'غير معروف';
      const orderNo = job?.orderNo || '';
      
      const matchesSearch = prodName.toLowerCase().includes(inventorySearch.toLowerCase()) || 
                            orderNo.toLowerCase().includes(inventorySearch.toLowerCase());
      const matchesShowroom = inventoryShowroomFilter === 'الكل' || item.showroomId === inventoryShowroomFilter;

      return matchesSearch && matchesShowroom;
    });
  }, [showroomInventory, inventorySearch, inventoryShowroomFilter, jobMap]);

  // Filtered Sales Orders list
  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(order => {
      const customer = order.customerName || '';
      const phone = order.customerPhone || '';
      const orderId = order.id || '';
      
      const matchesSearch = customer.toLowerCase().includes(salesSearch.toLowerCase()) || 
                            phone.toLowerCase().includes(salesSearch.toLowerCase()) ||
                            orderId.toLowerCase().includes(salesSearch.toLowerCase());
                            
      const matchesShowroom = salesShowroomFilter === 'الكل' || order.showroomId === salesShowroomFilter;

      return matchesSearch && matchesShowroom;
    });
  }, [salesOrders, salesSearch, salesShowroomFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 rtl" style={{ direction: 'rtl' }}>
      
      {/* Dynamic Dashboard Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-950 p-8 rounded-3xl text-white shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 text-emerald-400">
              <Building2 size={28} />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight">نظام إدارة المعارض والمبيعات</h1>
              <p className="text-slate-400 font-medium text-sm mt-0.5">الربط المالي والمخزني المتكامل من المصنع مباشرةً إلى صالات العرض</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => setShowAddTransfer(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-11 px-5 shadow-lg shadow-blue-500/20">
            <ArrowLeftRight size={18} className="ml-2" />
            تحويل جديد للمعارض
          </Button>
          <Button onClick={() => setShowAddSale(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-11 px-5 shadow-lg shadow-emerald-500/20">
            <Plus size={18} className="ml-2" />
            تسجيل فاتورة بيع
          </Button>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <Button 
          variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('dashboard')} 
          className={`h-11 rounded-xl font-bold px-5 ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <BarChart3 size={18} className="ml-2" />
          لوحة الأداء العام
        </Button>
        <Button 
          variant={activeTab === 'showrooms' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('showrooms')} 
          className={`h-11 rounded-xl font-bold px-5 ${activeTab === 'showrooms' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Building2 size={18} className="ml-2" />
          دليل صالات العرض
        </Button>
        <Button 
          variant={activeTab === 'inventory' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('inventory')} 
          className={`h-11 rounded-xl font-bold px-5 ${activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Layers size={18} className="ml-2" />
          مخازن الأثاث بالمعارض
        </Button>
        <Button 
          variant={activeTab === 'transfers' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('transfers')} 
          className={`h-11 rounded-xl font-bold px-5 ${activeTab === 'transfers' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <ArrowLeftRight size={18} className="ml-2" />
          طلبات التحويل ({transferOrders.filter(t => t.status === 'تم التحويل').length} معلق)
        </Button>
        <Button 
          variant={activeTab === 'sales' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('sales')} 
          className={`h-11 rounded-xl font-bold px-5 ${activeTab === 'sales' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <ShoppingCart size={18} className="ml-2" />
          الفواتير والمبيعات
        </Button>
        <Button 
          variant={activeTab === 'lostSales' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('lostSales')} 
          className={`h-11 rounded-xl font-bold px-5 ${activeTab === 'lostSales' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <TrendingDown size={18} className="ml-2" />
          متابعة الطلبات المفقودة
        </Button>
      </div>

      {/* --- DASHBOARD VIEW --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Main Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 p-5 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 tracking-wider">إجمالي مبيعات المعارض</span>
                  <h3 className="text-2xl font-black text-slate-800">
                    {stats.totalSales.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
                  </h3>
                </div>
                <span className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <TrendingUp size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <span>مسجلة عبر {stats.salesCount} فاتورة بيع حقيقية</span>
              </div>
            </Card>

            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 p-5 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 tracking-wider">صافي أرباح المعارض</span>
                  <h3 className="text-2xl font-black text-slate-800">
                    {stats.totalProfit.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
                  </h3>
                </div>
                <span className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <DollarSign size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <span className="text-emerald-600">هامش الربح التشغيلي: {stats.averageMargin.toFixed(1)}%</span>
              </div>
            </Card>

            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 p-5 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 tracking-wider">قيمة مخزون المعارض حالياً</span>
                  <h3 className="text-2xl font-black text-slate-800">
                    {stats.inventoryValuation.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
                  </h3>
                </div>
                <span className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                  <Layers size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <span>بناءً على التكلفة الفعلية (COGS) من المصنع</span>
              </div>
            </Card>

            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 p-5 bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-400 tracking-wider">الصالات النشطة</span>
                  <h3 className="text-2xl font-black text-slate-800">{stats.totalShowroomsCount} صالة</h3>
                </div>
                <span className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                  <Building2 size={22} />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <span>{transferOrders.length} طلبات تحويل أثاث مكتملة</span>
              </div>
            </Card>

          </div>

          {/* Mini Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Showroom Income leaderboard */}
            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 bg-white">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-lg font-black text-slate-800">أعلى المعارض أرباحاً ودخلاً</CardTitle>
                <CardDescription>تحليلات مبيعات صالات العرض التراكمية</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {showrooms.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-medium">الرجاء إضافة معارض أولاً لتوليد التحليلات</div>
                  ) : (
                    showrooms.map(sr => {
                      const showroomSales = salesOrders.filter(so => so.showroomId === sr.id);
                      const totalVal = showroomSales.reduce((sum, so) => sum + so.totalAmount, 0);
                      const totalProf = showroomSales.reduce((sum, so) => sum + so.netProfit, 0);
                      const percentageOfTotal = stats.totalSales > 0 ? (totalVal / stats.totalSales) * 100 : 0;

                      return (
                        <div key={sr.id} className="space-y-1.5">
                          <div className="flex justify-between text-sm font-bold text-slate-700">
                            <span>{sr.name}</span>
                            <span className="text-emerald-600">{totalVal.toLocaleString()} ج.م</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentageOfTotal}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>صافي الربح: {totalProf.toLocaleString()} ج.م</span>
                            <span>{percentageOfTotal.toFixed(1)}% من الإجمالي</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top models sold */}
            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 bg-white">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-lg font-black text-slate-800">الربحية حسب الموديل</CardTitle>
                <CardDescription>الربط الدقيق لأوامر الإنتاج مع المبيعات الحقيقية</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3.5">
                  {salesOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-medium">لا توجد مبيعات مسجلة حتى الآن</div>
                  ) : (
                    salesOrders.slice(0, 5).map(so => {
                      const item = so.items[0];
                      const job = item ? jobMap[item.jobId] : null;
                      if (!job) return null;
                      const profitMargin = so.totalAmount > 0 ? (so.netProfit / so.totalAmount) * 100 : 0;

                      return (
                        <div key={so.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-black text-slate-800">{job.productName}</h4>
                            <p className="text-xs text-slate-400 font-medium">رقم الطلب: {job.orderNo} | العميل: {so.customerName}</p>
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-black text-emerald-600 block">+{so.netProfit.toLocaleString()} ج.م</span>
                            <span className="text-[11px] font-black text-slate-400">هامش {profitMargin.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lost opportunities insights */}
            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100/70 bg-white">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-lg font-black text-slate-800">أحدث الفرص الضائعة بالمعارض</CardTitle>
                <CardDescription>لتحسين وتفادي نقص المخزون وضياع المبيعات</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {lostSales.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-medium">ممتاز! لا توجد طلبات مفقودة مسجلة</div>
                  ) : (
                    lostSales.slice(0, 4).map(ls => (
                      <div key={ls.id} className="p-3 bg-red-50/50 rounded-2xl border border-red-100 flex items-start gap-3">
                        <span className="p-2 bg-red-50 text-red-600 rounded-xl mt-0.5">
                          <AlertTriangle size={16} />
                        </span>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-800">{ls.productName}</h4>
                          <p className="text-xs text-slate-500 font-medium">{ls.notes || 'لا توجد ملاحظات مفصلة'}</p>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">{ls.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      )}

      {/* --- SHOWROOMS DIRECTORY --- */}
      {activeTab === 'showrooms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="font-black text-lg text-slate-800">دليل المعارض والوكلاء</h3>
              <p className="text-xs text-slate-400 font-semibold">إضافة صالات عرض وتحديد مدراء الفروع لمتابعة التدفق المخزني والمبيعات</p>
            </div>
            <Button onClick={() => setShowAddShowroom(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl">
              <Plus size={16} className="ml-1" />
              إضافة معرض جديد
            </Button>
          </div>

          {showAddShowroom && (
            <Card className="p-6 rounded-3xl border-0 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h4 className="font-black text-slate-800">إضافة صالة عرض جديدة</h4>
                <Button variant="ghost" onClick={() => setShowAddShowroom(false)} className="p-1 h-auto text-slate-400">
                  <X size={18} />
                </Button>
              </div>
              <form onSubmit={handleAddShowroom} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-500">اسم صالة العرض *</span>
                  <Input 
                    placeholder="مثال: معرض النزهة، فرع التجمع الخامس" 
                    value={showroomName} 
                    onChange={e => setShowroomName(e.target.value)} 
                    required 
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-500">موقع المعرض / العنوان *</span>
                  <Input 
                    placeholder="مثال: شارع النزهة، مصر الجديدة" 
                    value={showroomLocation} 
                    onChange={e => setShowroomLocation(e.target.value)} 
                    required 
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-500">اسم مدير الفرع</span>
                  <Input 
                    placeholder="مثال: أ/ محمد صلاح" 
                    value={showroomManager} 
                    onChange={e => setShowroomManager(e.target.value)} 
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2.5 mt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowAddShowroom(false)} className="rounded-xl">إلغاء</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-8">حفظ المعرض</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showrooms.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold">
                <Building2 size={48} className="mx-auto mb-3 text-slate-300" />
                لم يتم تسجيل أي معارض حالياً. اضغط على "إضافة معرض جديد" للبدء.
              </div>
            ) : (
              showrooms.map(sr => {
                const srInventory = showroomInventory.filter(item => item.showroomId === sr.id);
                const totalPieces = srInventory.reduce((sum, item) => sum + (item.quantity || 1), 0);
                const totalCostVal = srInventory.reduce((sum, item) => sum + ((item.costPrice || 0) * (item.quantity || 1)), 0);
                
                const srSales = salesOrders.filter(so => so.showroomId === sr.id);
                const totalSalesVal = srSales.reduce((sum, so) => sum + so.totalAmount, 0);

                return (
                  <Card key={sr.id} className="rounded-3xl border-0 shadow-md hover:shadow-lg shadow-slate-100 bg-white overflow-hidden group transition-all duration-300">
                    <div className="bg-slate-900 p-5 text-white flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="text-lg font-black">{sr.name}</h4>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <MapPin size={13} />
                          <span>{sr.location}</span>
                        </div>
                      </div>
                      <span className="p-2 bg-white/10 rounded-xl text-white">
                        <Building2 size={18} />
                      </span>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3.5 pt-1">
                        <div className="p-3 bg-slate-50 rounded-2xl space-y-0.5">
                          <span className="text-[10px] font-black text-slate-400 block">قطع المخزون الحالية</span>
                          <span className="text-base font-black text-slate-700">{totalPieces} قطعة</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl space-y-0.5">
                          <span className="text-[10px] font-black text-slate-400 block">إجمالي مبيعات الفرع</span>
                          <span className="text-base font-black text-emerald-600">{totalSalesVal.toLocaleString()} ج.م</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 pt-1">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-slate-400" />
                          <span>المدير: {sr.managerName}</span>
                        </div>
                        <div>قيمة المخزون بالتكلفة: {totalCostVal.toLocaleString()} ج.م</div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                        {profile?.isAdmin && (
                          <Button 
                            variant="ghost" 
                            onClick={() => handleDeleteShowroom(sr.id)} 
                            className="p-2 h-auto text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- SHOWROOMS INVENTORY --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-0.5">
              <h3 className="font-black text-lg text-slate-800">مخازن الأثاث بالمعارض</h3>
              <p className="text-xs text-slate-400 font-semibold">استعراض القطع الجاهزة المتاحة في المعارض بتكلفتها الفعلية COGS من المصنع</p>
            </div>
            
            {/* Search and filter controls */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-slate-400" size={17} />
                <Input 
                  placeholder="بحث باسم المنتج أو رقم الأوردر..." 
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                  className="rounded-xl pr-9 h-10 w-60 bg-slate-50 text-xs font-bold"
                />
              </div>

              <select 
                value={inventoryShowroomFilter} 
                onChange={e => setInventoryShowroomFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:outline-none"
              >
                <option value="الكل">كل صالات العرض</option>
                {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100 bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-700">صورة المنتج والاسم</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">رقم أوردر الإنتاج</TableHead>
                  <TableHead className="font-black text-slate-700">المعرض الحالي</TableHead>
                  <TableHead className="font-black text-slate-700 text-left">التكلفة من المصنع (COGS)</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">الحالة بالمعرض</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">الكمية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      لا يوجد قطع أثاث في مخازن المعارض تطابق البحث والفلترة حالياً.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map(item => {
                    const job = jobMap[item.itemId];
                    const showroom = showroomMap[item.showroomId];

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {job?.referenceImage ? (
                              <img src={job.referenceImage} alt="" className="w-12 h-12 rounded-xl object-cover border" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <Package size={20} />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <span className="font-black text-slate-800 text-sm block">{job?.productName || 'منتج أثاث'}</span>
                              <span className="text-xs text-slate-400 font-medium">{job?.woodType ? `نوع الخشب: ${job.woodType}` : 'تشطيب كامل مذهب'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 rounded-lg text-xs font-black">
                            {job?.orderNo || 'أمر مباشر'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-700 text-sm">{showroom?.name || 'مستودع المعارض الرئيسي'}</span>
                        </TableCell>
                        <TableCell className="text-left font-black text-slate-800">
                          {(item.costPrice || 0).toLocaleString()} ج.م
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === 'pending_receipt' ? (
                            <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold">
                              معلق - في الطريق
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 rounded-lg text-xs font-bold">
                              متوفر للبيع
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-700">
                          {item.quantity || 1}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* --- TRANSFER ORDERS --- */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="font-black text-lg text-slate-800">طلبات تحويل الأثاث للمعارض</h3>
              <p className="text-xs text-slate-400 font-semibold">تحويل القطع المنتهية بالمصنع إلى صالات العرض لتعزيز وتنشيط حركة المبيعات</p>
            </div>
            <Button onClick={() => setShowAddTransfer(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl">
              <ArrowLeftRight size={16} className="ml-1" />
              تحويل جديد من المصنع
            </Button>
          </div>

          {showAddTransfer && (
            <Card className="p-6 rounded-3xl border-0 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h4 className="font-black text-slate-800 text-lg">تحويل قطع جديدة من المصنع إلى المعارض</h4>
                <Button variant="ghost" onClick={() => setShowAddTransfer(false)} className="p-1 h-auto text-slate-400">
                  <X size={18} />
                </Button>
              </div>
              <form onSubmit={handleAddTransfer} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">اختر المعرض المستلم *</span>
                    <select 
                      value={transferToShowroomId} 
                      onChange={e => setTransferToShowroomId(e.target.value)}
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    >
                      <option value="">اختر المعرض...</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">ملاحظات التحويل</span>
                    <Input 
                      placeholder="مثال: يرجى النقل بعناية تامة في سيارة مغلقة..." 
                      value={transferNotes} 
                      onChange={e => setTransferNotes(e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-500 block">اختر قطع الأثاث المكتملة بالمصنع للتحويل * (متاحة للتحويل: {jobsAvailableForTransfer.length} قطعة)</span>
                  <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                    {jobsAvailableForTransfer.length === 0 ? (
                      <div className="col-span-full text-center py-6 text-slate-400 font-bold text-sm">
                        لا توجد حالياً قطع جاهزة ومكتملة في المصنع للتحويل للمعارض.
                      </div>
                    ) : (
                      jobsAvailableForTransfer.map(job => {
                        const directCost = (job.totalMaterialCost || 0) + (job.totalLaborCost || 0) + (job.totalOtherCost || 0);
                        return (
                          <div 
                            key={job.id} 
                            onClick={() => handleToggleTransferJob(job.id)}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${transferJobIds.includes(job.id) ? 'border-blue-600 bg-blue-50/40 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                          >
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-slate-800 block">{job.productName} ({job.orderNo})</span>
                              <span className="text-[10px] text-slate-400 font-bold">العميل الأصلي: {job.clientName || 'عقد مبيعات'}</span>
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-black text-slate-700 block">التكلفة: {directCost.toLocaleString()} ج.م</span>
                              {transferJobIds.includes(job.id) && <span className="text-[10px] text-blue-600 font-black">✓ محددة للتحويل</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowAddTransfer(false)} className="rounded-xl">إلغاء</Button>
                  <Button type="submit" disabled={transferJobIds.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl px-8">حفظ وإرسال أمر التحويل</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {transferOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold">
                <ArrowLeftRight size={48} className="mx-auto mb-3 text-slate-300" />
                لا توجد طلبات تحويل مسجلة في الأرشيف حالياً.
              </div>
            ) : (
              transferOrders.map(t => {
                const showroom = showroomMap[t.toShowroomId];
                const totalAmountTransferred = t.items.reduce((sum, item) => sum + (item.costPrice || 0), 0);

                return (
                  <Card key={t.id} className="rounded-3xl border border-slate-150 shadow-sm p-5 bg-white relative hover:shadow-md transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Left Block */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-800">أمر تحويل رقم: {t.id.slice(0, 8).toUpperCase()}</span>
                          {t.status === 'تم التحويل' ? (
                            <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold">
                              قيد التوصيل للمستودع
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 rounded-lg text-xs font-bold">
                              تم الاستلام بالمعرض
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold">
                          من: المصنع الرئيسي ⟵ إلى صالة عرض: {showroom?.name || 'غير معروف'}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">التاريخ: {t.date} {t.notes ? `| ملاحظات: ${t.notes}` : ''}</p>
                      </div>

                      {/* Middle Block (Cost Valuation) */}
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold block">إجمالي القيمة المنقولة</span>
                        <span className="text-base font-black text-slate-800">{totalAmountTransferred.toLocaleString()} ج.م</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{t.items.length} قطعة أثاث كاملة</span>
                      </div>

                      {/* Right Block (Actions) */}
                      <div className="flex gap-2">
                        {t.status === 'تم التحويل' && (
                          <Button 
                            onClick={() => handleConfirmReceipt(t)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl h-10 px-4"
                          >
                            <CheckCircle size={15} className="ml-1.5" />
                            تأكيد الاستلام بالمعرض
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => {
                          const formattedList = t.items.map((item, index) => {
                            const job = jobMap[item.itemId];
                            return `${index + 1}. ${job?.productName || 'أثاث'} (${job?.orderNo || 'أمر مباشر'}) - تكلفة: ${item.costPrice.toLocaleString()} ج.م`;
                          }).join('\n');
                          alert(`تفاصيل القطع داخل أمر التحويل:\n\n${formattedList}`);
                        }} className="rounded-xl text-xs font-bold h-10 px-3">
                          عرض القطع
                        </Button>
                      </div>

                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- SALES ORDERS & INVOICES --- */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-0.5">
              <h3 className="font-black text-lg text-slate-800">مبيعات وفواتير صالات العرض</h3>
              <p className="text-xs text-slate-400 font-semibold">أرشفة وإصدار الفواتير مع حساب الربحية الحقيقية بعد استهلاك التكاليف والأوفر هيد ومصروفات النقل</p>
            </div>

            {/* Search and filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-slate-400" size={17} />
                <Input 
                  placeholder="بحث باسم العميل أو رقم الفاتورة..." 
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  className="rounded-xl pr-9 h-10 w-60 bg-slate-50 text-xs font-bold"
                />
              </div>

              <select 
                value={salesShowroomFilter} 
                onChange={e => setSalesShowroomFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:outline-none"
              >
                <option value="الكل">كل صالات العرض</option>
                {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <Button onClick={() => setShowAddSale(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl">
                <Plus size={16} className="ml-1" />
                تسجيل بيع جديد
              </Button>
            </div>
          </div>

          {/* ADD SALE FORM */}
          {showAddSale && (
            <Card className="p-6 rounded-3xl border-0 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top duration-300 bg-white">
              <div className="flex justify-between items-center mb-5 pb-2 border-b">
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-800 text-lg">إصدار فاتورة بيع جديدة وحساب أرباح دقيق</h4>
                  <p className="text-xs text-slate-400 font-bold">يقوم النظام تلقائياً بخصم القطعة من المعرض وإيداع ثمنها في الخزينة المحددة</p>
                </div>
                <Button variant="ghost" onClick={() => setShowAddSale(false)} className="p-1 h-auto text-slate-400">
                  <X size={18} />
                </Button>
              </div>
              <form onSubmit={handleAddSaleOrder} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">من صالة عرض / معرض *</span>
                    <select 
                      value={saleShowroomId} 
                      onChange={e => {
                        setSaleShowroomId(e.target.value);
                        setSaleInventoryItemId(''); // Reset selected piece
                      }}
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none"
                    >
                      <option value="">اختر صالة العرض...</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-black text-slate-500">اختر قطعة الأثاث المتاحة للبيع بالمعرض *</span>
                    <select 
                      value={saleInventoryItemId} 
                      onChange={e => {
                        setSaleInventoryItemId(e.target.value);
                        // Default selling price can be estimated cost or similar
                        const invItem = showroomInventory.find(item => item.id === e.target.value);
                        const job = invItem ? jobMap[invItem.itemId] : null;
                        if (job?.sellingPrice) {
                          setSalePrice(job.sellingPrice);
                        } else if (invItem) {
                          setSalePrice(Math.round(invItem.costPrice * 1.4)); // Default estimate 40% margin
                        }
                      }}
                      required
                      disabled={!saleShowroomId}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="">اختر المعرض أولاً لعرض مخزونه...</option>
                      {showroomInventory
                        .filter(item => item.showroomId === saleShowroomId && item.status !== 'pending_receipt')
                        .map(item => {
                          const job = jobMap[item.itemId];
                          return (
                            <option key={item.id} value={item.id}>
                              {job?.productName || 'أثاث'} (رقم أوردر: {job?.orderNo || 'غير محدد'}) - تكلفة المصنع: {item.costPrice.toLocaleString()} ج.م
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">اسم العميل</span>
                    <Input 
                      placeholder="أدخل اسم العميل بالكامل" 
                      value={saleCustomerName} 
                      onChange={e => setSaleCustomerName(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">هاتف العميل</span>
                    <Input 
                      placeholder="رقم الموبايل" 
                      value={saleCustomerPhone} 
                      onChange={e => setSaleCustomerPhone(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">سعر البيع الفعلي (للمستهلك) *</span>
                    <Input 
                      type="number"
                      placeholder="مثال: 55000" 
                      value={salePrice || ''} 
                      onChange={e => setSalePrice(Number(e.target.value))}
                      required
                      className="rounded-xl h-11 font-black text-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">مصاريف نقل وتركيب الأثاث</span>
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={saleLogistics || ''} 
                      onChange={e => setSaleLogistics(Number(e.target.value))}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">عمولة موظف المبيعات</span>
                    <Input 
                      type="number"
                      placeholder="0" 
                      value={saleCommission || ''} 
                      onChange={e => setSaleCommission(Number(e.target.value))}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">مصاريف تشغيلية غير مباشرة ({OVERHEAD_RATE * 100}%)</span>
                    <Input 
                      value={(salePrice * OVERHEAD_RATE).toFixed(0)} 
                      disabled
                      className="rounded-xl h-11 bg-slate-50 text-slate-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">طريقة الدفع *</span>
                    <select 
                      value={salePaymentMethod} 
                      onChange={e => setSalePaymentMethod(e.target.value as any)}
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none"
                    >
                      <option value="نقدي">نقدي</option>
                      <option value="شبكة">شبكة</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">الخزنة المستلمة للنقدية *</span>
                    <select 
                      value={saleSafeId} 
                      onChange={e => setSaleSafeId(e.target.value)}
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none"
                    >
                      <option value="">اختر خزنة لتدفق النقدية...</option>
                      {activeSafes.map(s => <option key={s.id} value={s.id}>{s.name} (الرصيد: {s.balance.toLocaleString()} ج.م)</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-500">ملاحظات الفاتورة</span>
                    <Input 
                      placeholder="مثال: يرجى تسليم الفاتورة مع شهادة الضمان..." 
                      value={saleNotes} 
                      onChange={e => setSaleNotes(e.target.value)} 
                      className="rounded-xl h-11"
                    />
                  </div>

                </div>

                {/* Profit Calculator Live Preview Box */}
                {salePrice > 0 && saleInventoryItemId && (
                  <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-3.5 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-slate-400">حسبة ربحية أمر البيع المباشر بالمعارض</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">حسبة دقيقة للمصنع والشركاء</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                      <div className="space-y-1">
                        <span className="text-slate-400 block">التكلفة من المصنع (COGS):</span>
                        <span className="text-sm font-black">{(showroomInventory.find(item => item.id === saleInventoryItemId)?.costPrice || 0).toLocaleString()} ج.م</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block">مصاريف نقل وتركيب:</span>
                        <span className="text-sm font-black">{saleLogistics.toLocaleString()} ج.م</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block">عمولة السيلز:</span>
                        <span className="text-sm font-black">{saleCommission.toLocaleString()} ج.م</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block">المصاريف التشغيلية ({OVERHEAD_RATE * 100}%):</span>
                        <span className="text-sm font-black">{(salePrice * OVERHEAD_RATE).toLocaleString()} ج.م</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-slate-400 block">صافي الربح الفعلي المتوقع</span>
                        <span className={`text-xl font-black ${salePrice - (showroomInventory.find(item => item.id === saleInventoryItemId)?.costPrice || 0) - saleLogistics - saleCommission - (salePrice * OVERHEAD_RATE) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(salePrice - (showroomInventory.find(item => item.id === saleInventoryItemId)?.costPrice || 0) - saleLogistics - saleCommission - (salePrice * OVERHEAD_RATE)).toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-400 block">نسبة هامش الربح</span>
                        <span className="text-sm font-black text-slate-300">
                          {(((salePrice - (showroomInventory.find(item => item.id === saleInventoryItemId)?.costPrice || 0) - saleLogistics - saleCommission - (salePrice * OVERHEAD_RATE)) / salePrice) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-2 border-t">
                  <Button type="button" variant="ghost" onClick={() => setShowAddSale(false)} className="rounded-xl">إلغاء</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-10 h-11">حفظ وترحيل الفاتورة للدفاتر</Button>
                </div>
              </form>
            </Card>
          )}

          {/* SALES RECORD TABLE */}
          <Card className="rounded-3xl border-0 shadow-lg shadow-slate-100 bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-slate-700">رقم الفاتورة والتاريخ</TableHead>
                  <TableHead className="font-black text-slate-700">العميل</TableHead>
                  <TableHead className="font-black text-slate-700">المعرض الصادر منه</TableHead>
                  <TableHead className="font-black text-slate-700">المنتجات المباعة</TableHead>
                  <TableHead className="font-black text-slate-700 text-left">قيمة المبيعات</TableHead>
                  <TableHead className="font-black text-slate-700 text-left">صافي الأرباح</TableHead>
                  <TableHead className="font-black text-slate-700 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                      لا يوجد فواتير مبيعات مسجلة تطابق البحث حالياً.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalesOrders.map(order => {
                    const showroom = showroomMap[order.showroomId];
                    const firstItem = order.items[0];
                    const job = firstItem ? jobMap[firstItem.jobId] : null;

                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-black text-slate-800 text-xs uppercase">INV-{order.id.slice(0, 8)}</span>
                            <span className="text-[10px] text-slate-400 font-bold block">{order.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 text-sm block">{order.customerName}</span>
                            {order.customerPhone && (
                              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                <Phone size={10} />
                                {order.customerPhone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{showroom?.name || 'مستودع المعرض'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-black text-slate-800 text-xs">{job?.productName || 'قطعة أثاث'} ({job?.orderNo || 'بدون رقم'})</span>
                        </TableCell>
                        <TableCell className="text-left font-black text-slate-800 text-sm">
                          {order.totalAmount.toLocaleString()} ج.م
                        </TableCell>
                        <TableCell className="text-left font-black">
                          <span className={order.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {order.netProfit.toLocaleString()} ج.م
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedInvoice(order)} 
                              className="p-1.5 h-auto text-xs font-bold rounded-lg bg-white"
                            >
                              <FileText size={14} className="ml-1" />
                              الفاتورة
                            </Button>
                            {profile?.isAdmin && (
                              <Button 
                                variant="ghost" 
                                onClick={() => handleDeleteSalesOrder(order)} 
                                className="p-1.5 h-auto text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* --- INVOICE PRINT DIALOG MODAL --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl border-none shadow-2xl bg-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-emerald-400" />
                <h4 className="font-black text-lg">فاتورة مبيعات معارض الأثاث الحقيقية</h4>
              </div>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)} className="p-1 h-auto text-white/70 hover:text-white hover:bg-white/10">
                <X size={20} />
              </Button>
            </div>
            
            <CardContent className="p-8 space-y-6" id="printable-invoice">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b pb-5">
                <div className="space-y-1.5">
                  <h3 className="text-2xl font-black text-slate-900">مصنع ومعارض أثاث النخبة</h3>
                  <p className="text-xs text-slate-500 font-bold">الموقع الرئيسي: المنطقة الصناعية، مصر الجديدة</p>
                  <p className="text-xs text-slate-400 font-medium">سجل تجاري رقم: 492049 | مصلحة الضرائب المصرية</p>
                </div>
                <div className="text-left space-y-1">
                  <span className="text-xs font-black text-slate-400 uppercase block">رقم الفاتورة</span>
                  <span className="text-lg font-black text-slate-800 block">INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-xs font-bold text-slate-500 block">تاريخ الإصدار: {selectedInvoice.date}</span>
                </div>
              </div>

              {/* Customer and Showroom Info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">بيانات العميل المستلم:</span>
                  <span className="text-sm font-black text-slate-800">{selectedInvoice.customerName}</span>
                  {selectedInvoice.customerPhone && <span className="text-slate-500 block">الهاتف: {selectedInvoice.customerPhone}</span>}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">صالة العرض الصادرة منها:</span>
                  <span className="text-sm font-black text-slate-800">{showroomMap[selectedInvoice.showroomId]?.name || 'معرض النخبة'}</span>
                  <span className="text-slate-500 block">الموقع: {showroomMap[selectedInvoice.showroomId]?.location || 'مصر'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-black text-sm text-slate-800 border-r-4 border-slate-900 pr-2">القطع والمنتجات المشمولة بالفاتورة</h4>
                <table className="w-full text-xs text-slate-700">
                  <thead className="bg-slate-100 font-black">
                    <tr>
                      <th className="p-2 text-right">بيان القطعة والمنتج</th>
                      <th className="p-2 text-center">أمر الإنتاج</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-left">السعر الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => {
                      const job = jobMap[item.jobId];
                      return (
                        <tr key={i} className="border-b">
                          <td className="p-2 font-bold">
                            <div>{job?.productName || 'أثاث راقي وعمولة'}</div>
                            <div className="text-[10px] text-slate-400 font-medium">نوع الخشب: {job?.woodType || 'خشب زان أحمر'}</div>
                          </td>
                          <td className="p-2 text-center font-bold text-slate-500">{job?.orderNo || 'عقد مبيعات'}</td>
                          <td className="p-2 text-center">1</td>
                          <td className="p-2 text-left font-black">{item.sellingPrice.toLocaleString()} ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Payment details and Totals */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-slate-400 block">شروط وتفاصيل الدفع:</span>
                  <span className="font-black text-slate-800 block">طريقة السداد: {selectedInvoice.paymentMethod}</span>
                  <span className="text-slate-500 block">الضمان: يسري ضمان أثاث النخبة لمدة 5 سنوات من تاريخ الاستلام.</span>
                  {selectedInvoice.notes && <span className="text-amber-700 font-bold block">ملاحظات: {selectedInvoice.notes}</span>}
                </div>
                
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>قيمة المبيعات:</span>
                    <span>{selectedInvoice.totalAmount.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مصاريف النقل والتركيب:</span>
                    <span>{selectedInvoice.totalLogisticsCost.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-black text-slate-900">
                    <span>المجموع الإجمالي:</span>
                    <span>{(selectedInvoice.totalAmount + selectedInvoice.totalLogisticsCost).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

            </CardContent>

            <div className="bg-slate-50 p-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="rounded-xl font-bold">
                إغلاق
              </Button>
              <Button onClick={() => {
                const printContents = document.getElementById('printable-invoice')?.innerHTML;
                const originalContents = document.body.innerHTML;
                if (printContents) {
                  const popup = window.open('', '_blank');
                  if (popup) {
                    popup.document.write(`
                      <html>
                        <head>
                          <title>فاتورة مبيعات معارض النخبة</title>
                          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                          <style>
                            body { font-family: 'Inter', sans-serif; direction: rtl; }
                          </style>
                        </head>
                        <body onload="window.print(); window.close();" class="p-8">
                          <div>${printContents}</div>
                        </body>
                      </html>
                    `);
                    popup.document.close();
                  }
                }
              }} className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl">
                <Printer size={15} className="ml-1.5" />
                طباعة الفاتورة والشهادة
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* --- LOST SALES SECTION --- */}
      {activeTab === 'lostSales' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="font-black text-lg text-slate-800">إدارة الطلبات والفرص الضائعة بالمعارض</h3>
              <p className="text-xs text-slate-400 font-semibold">تتبع الحالات التي طلب فيها العميل منتجاً ولم يجد مخزوناً كافياً، لتحسين تخطيط الإنتاج وتفادي ضياع الربح</p>
            </div>
            <Button onClick={() => setShowAddLostSale(true)} className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl">
              <Plus size={16} className="ml-1" />
              تسجيل طلب مفقود
            </Button>
          </div>

          {showAddLostSale && (
            <Card className="p-6 rounded-3xl border-0 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                <h4 className="font-black text-slate-800">تسجيل مبيعة مفقودة بالمعرض</h4>
                <Button variant="ghost" onClick={() => setShowAddLostSale(false)} className="p-1 h-auto text-slate-400">
                  <X size={18} />
                </Button>
              </div>
              <form onSubmit={handleAddLostSale} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-black text-slate-500">من صالة عرض / معرض *</span>
                  <select 
                    value={lostSaleShowroomId} 
                    onChange={e => setLostSaleShowroomId(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:outline-none"
                  >
                    <option value="">اختر صالة العرض...</option>
                    {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-black text-slate-500">اسم المنتج المفقود / المطلوب *</span>
                  <Input 
                    placeholder="مثال: غرفة نوم كلاسيك مذهب" 
                    value={lostSaleProductName} 
                    onChange={e => setLostSaleProductName(e.target.value)} 
                    required 
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-black text-slate-500">سبب عدم إتمام البيع والتفاصيل</span>
                  <Input 
                    placeholder="مثال: العميل كان يرغب في اللون الكشمير بينما المتوفر كان اللون الفيروزي" 
                    value={lostSaleNotes} 
                    onChange={e => setLostSaleNotes(e.target.value)} 
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2.5 mt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowAddLostSale(false)} className="rounded-xl">إلغاء</Button>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl px-8">حفظ الفرصة الضائعة</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lostSales.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold">
                <TrendingDown size={48} className="mx-auto mb-3 text-slate-300" />
                سجل الفرص المفقودة فارغ حالياً.
              </div>
            ) : (
              lostSales.map(ls => {
                const showroom = showroomMap[ls.showroomId];
                return (
                  <Card key={ls.id} className="rounded-2xl border border-red-100 p-4 bg-white relative hover:shadow-md transition-all duration-300 flex items-start gap-3">
                    <span className="p-3 bg-red-50 text-red-600 rounded-xl mt-0.5">
                      <AlertTriangle size={18} />
                    </span>
                    <div className="space-y-1 w-full">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-slate-800">{ls.productName}</h4>
                        <span className="text-[10px] text-slate-400 font-bold">{ls.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-bold">المعرض: {showroom?.name || 'غير معروف'}</p>
                      <p className="text-xs text-slate-400 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100">{ls.notes || 'لا توجد ملاحظات مفصلة'}</p>
                      
                      <div className="flex justify-end pt-1">
                        {profile?.isAdmin && (
                          <Button 
                            variant="ghost" 
                            onClick={async () => {
                              if (!confirm('هل تريد حذف هذه الفرصة؟')) return;
                              try {
                                await deleteDoc(doc(db, 'lostSales', ls.id));
                              } catch (e) {
                                console.error(e);
                              }
                            }} 
                            className="p-1 h-auto text-red-400 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}
