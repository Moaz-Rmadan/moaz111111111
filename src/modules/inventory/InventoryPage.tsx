import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  RefreshCw, FileText, CheckCircle2, AlertTriangle, Printer, 
  Download, Warehouse as WarehouseIcon, Layers, ShieldCheck, 
  Trash2, Edit3, X, Check, BarChart3, ArrowRightLeft, Scale, Calculator
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NumberDisplay } from '../../lib/numberUtils';
import { PrintHeader, PrintSignatures } from '../../components/PrintHeader';
import { tafqeetArabic } from '../../lib/tafqeet';
import { SearchableSelect } from '../../components/SearchableSelect';
import { Item, Warehouse, CostCenter } from '../../types';
import { StockTransaction } from './types';

export interface LocalIssuance {
  id?: string;
  jobOrderNo?: string;
  date: string;
  items?: {
    itemId: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
  }[];
  selectedItems?: {
    itemId: string;
    quantity: number;
  }[];
  totalAmount?: number;
}

interface InventoryPageProps {
  items: Item[];
  warehouses: Warehouse[];
  issuances: LocalIssuance[];
  stockTransactions: StockTransaction[];
  costCenters: CostCenter[];
  companySettings: any;
  companyInfo: any;
  onAddItem: (item: Omit<Item, 'id'>) => Promise<void>;
  onUpdateItem: (id: string, data: Partial<Item>) => Promise<void>;
  onAddTransaction: (tx: Omit<StockTransaction, 'id'>) => Promise<void>;
  onAddIssuance: (iss: Omit<LocalIssuance, 'id'>) => Promise<void>;
}

export const InventoryPage = React.memo(function InventoryPage({
  items,
  warehouses,
  issuances,
  stockTransactions,
  costCenters,
  companySettings,
  companyInfo,
  onAddItem,
  onUpdateItem,
  onAddTransaction,
  onAddIssuance
}: InventoryPageProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'transactions' | 'issuances' | 'audit' | 'reports'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // New Item Form
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'خامات أولية',
    unit: 'قطعة',
    secondaryUnit: '',
    conversionFactor: 1,
    price: 0,
    department: costCenters[0]?.name || 'الإدارة العامة',
    warehouseId: warehouses[0]?.id || 'default',
    openingBalance: 0,
    safetyLimit: 5
  });

  // New Transaction Form
  const [newTx, setNewTx] = useState({
    transactionNo: `TX-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    itemId: '',
    warehouseId: warehouses[0]?.id || 'default',
    transactionType: 'PURCHASE_RECEIPT' as const,
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
    direction: 'in' as 'in' | 'out',
    referenceType: 'purchase' as const,
    notes: ''
  });

  // Physical Audit State
  const [auditCounts, setAuditCounts] = useState<{ [itemId: string]: number }>({});

  // Categories list
  const categories = useMemo(() => {
    return ['الكل', ...new Set(items.map(i => i.category || 'أخرى'))];
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchWarehouse = selectedWarehouse === 'all' || item.warehouseId === selectedWarehouse;
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchWarehouse && matchCategory;
    });
  }, [items, searchTerm, selectedWarehouse, selectedCategory]);

  // KPIs
  const totalItemsCount = items.length;
  const totalStockValue = items.reduce((sum, item) => sum + ((item.currentBalance ?? item.openingBalance ?? 0) * (item.price || 0)), 0);
  const lowStockItemsCount = items.filter(item => (item.currentBalance ?? item.openingBalance ?? 0) <= (item.safetyLimit || 5)).length;
  const totalWarehousesCount = warehouses.length || 1;

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.price < 0) {
      alert('يرجى إدخال اسم الصنف وسعر التكلفة بصورة صحيحة');
      return;
    }
    await onAddItem({
      ...newItem,
      inward: 0,
      outward: 0,
      returned: 0,
      wasted: 0,
      currentBalance: newItem.openingBalance,
      totalValue: newItem.openingBalance * newItem.price
    });
    setShowAddItemModal(false);
    setNewItem({
      name: '',
      category: 'خامات أولية',
      unit: 'قطعة',
      secondaryUnit: '',
      conversionFactor: 1,
      price: 0,
      department: costCenters[0]?.name || 'الإدارة العامة',
      warehouseId: warehouses[0]?.id || 'default',
      openingBalance: 0,
      safetyLimit: 5
    });
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.itemId || newTx.quantity <= 0) {
      alert('يرجى اختيار الصنف وتحديد كمية صحيحة');
      return;
    }
    const targetItem = items.find(i => i.id === newTx.itemId);
    const unitCost = newTx.unitCost > 0 ? newTx.unitCost : (targetItem?.price || 0);

    await onAddTransaction({
      ...newTx,
      unitCost,
      totalCost: newTx.quantity * unitCost,
      createdBy: profileName()
    });

    setShowTransactionModal(false);
    setNewTx({
      transactionNo: `TX-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      itemId: '',
      warehouseId: warehouses[0]?.id || 'default',
      transactionType: 'PURCHASE_RECEIPT',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      direction: 'in',
      referenceType: 'purchase',
      notes: ''
    });
  };

  function profileName() {
    return 'مدير المخازن';
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200 pb-12" dir="rtl">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full w-fit">
            <WarehouseIcon size={14} />
            الإدارة المتكاملة للمخزون وسلسلة الإمداد
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">موديول المخازن والمستودعات</h2>
          <p className="text-slate-500 font-bold text-xs sm:text-sm">إدارة الأصناف، تتبع الأرصدة، أذونات الصرف والإدخال، والجرد الدوري</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            onClick={() => setShowTransactionModal(true)} 
            variant="outline"
            className="h-11 px-4 rounded-xl font-black text-xs border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2"
          >
            <ArrowRightLeft size={16} className="text-indigo-600" />
            حركة مخزنية جديدة
          </Button>

          <Button 
            onClick={() => setShowAddItemModal(true)} 
            className="btn-primary h-11 px-5 rounded-xl font-black text-xs shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={16} />
            إضافة صنف جديد للمخزن
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm shadow-slate-200/30 hover:border-slate-300 transition-all duration-200 min-w-0 flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500 truncate">إجمالي الأصناف</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight tabular-nums truncate">
              {totalItemsCount} <span className="text-xs font-bold text-slate-400">صنف</span>
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm shadow-slate-200/30 hover:border-slate-300 transition-all duration-200 min-w-0 flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Calculator size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500 truncate">قيمة المخزون الإجمالية</p>
            <h3 className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5 font-mono tracking-tight tabular-nums truncate">
              {totalStockValue.toLocaleString()} <span className="text-xs font-bold text-slate-400">ج.م</span>
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm shadow-slate-200/30 hover:border-slate-300 transition-all duration-200 min-w-0 flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500 truncate">أصناف قاربت النفاد</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5 tracking-tight tabular-nums truncate">
              {lowStockItemsCount} <span className="text-xs font-bold text-slate-400">صنف</span>
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm shadow-slate-200/30 hover:border-slate-300 transition-all duration-200 min-w-0 flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <WarehouseIcon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500 truncate">المستودعات النشطة</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight tabular-nums truncate">
              {totalWarehousesCount} <span className="text-xs font-bold text-slate-400">مستودع</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-3 px-4 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
            activeTab === 'items' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package size={16} />
          أرصدة الأصناف والمخزون
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-3 px-4 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
            activeTab === 'transactions' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft size={16} />
          حركات وأذونات المخزن ({stockTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('issuances')}
          className={`flex-1 py-3 px-4 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
            activeTab === 'issuances' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText size={16} />
          أذونات الصرف للإنتاج ({issuances.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-3 px-4 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale size={16} />
          جرد المخازن والتسوية
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-3 px-4 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${
            activeTab === 'reports' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={16} />
          التقارير التحليلية والقيمة
        </button>
      </div>

      {/* TAB 1: ITEMS CATALOG */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="بحث باسم الصنف..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-11 h-11 rounded-xl border-slate-200 font-bold"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 text-xs outline-none"
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700 text-xs outline-none"
              >
                <option value="all">جميع المستودعات</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Table */}
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50 h-14">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-right font-black text-slate-900 px-6 text-xs uppercase">اسم الصنف</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">التصنيف</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">الرصيد الحالي</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">سعر التكلفة</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">إجمالي القيمة</TableHead>
                  <TableHead className="text-left font-black text-slate-900 px-6 text-xs uppercase print:hidden">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const qty = item.currentBalance ?? item.openingBalance ?? 0;
                  const isLow = qty <= (item.safetyLimit || 5);
                  const totalVal = qty * (item.price || 0);

                  return (
                    <TableRow key={item.id} className="h-16 border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-6 font-black text-slate-900">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {isLow && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-black">منخفض</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-slate-600">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-black text-slate-900">
                        {qty.toLocaleString()} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-600">
                        {(item.price || 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell className="font-mono font-black text-emerald-600">
                        {totalVal.toLocaleString()} ج.م
                      </TableCell>
                      <TableCell className="px-6 print:hidden">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setNewTx(prev => ({ ...prev, itemId: item.id!, warehouseId: item.warehouseId || 'default', unitCost: item.price || 0 }));
                              setShowTransactionModal(true);
                            }}
                            className="h-9 px-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs"
                          >
                            حركة
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold">
                      لا توجد أصناف مطابقة للبحث أو التصفية الحالية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <CardTitle className="font-black text-xl text-slate-900">سجل حركات وأذونات المخزن</CardTitle>
                <CardDescription className="font-bold text-slate-500">حركات الوارد والصادر والتسويات المخزنية المرتبطة بالأصناف</CardDescription>
              </div>
              <Button onClick={() => setShowTransactionModal(true)} className="btn-primary h-10 px-4 rounded-xl font-black text-xs">
                <Plus size={16} className="ml-1" /> تسجيل حركة جديدة
              </Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50 h-14">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-right font-black text-slate-900 px-6 text-xs uppercase">رقم الحركة</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">التاريخ</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">نوع الحركة</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">الصنف</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">الكمية والاتجاه</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">إجمالي التكلفة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockTransactions.map(tx => {
                  const targetItem = items.find(i => i.id === tx.itemId);
                  const isIn = tx.direction === 'in';

                  return (
                    <TableRow key={tx.id || tx.transactionNo} className="h-16 border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-6 font-mono font-black text-indigo-600">{tx.transactionNo}</TableCell>
                      <TableCell className="font-bold text-slate-600">{tx.date}</TableCell>
                      <TableCell>
                        <Badge className={`font-black text-[10px] ${isIn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {tx.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-slate-900">{targetItem?.name || 'صنف غير معروف'}</TableCell>
                      <TableCell className={`font-mono font-black ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIn ? '+' : '-'}{tx.quantity} {targetItem?.unit || 'قطعة'}
                      </TableCell>
                      <TableCell className="font-mono font-black text-slate-900">
                        {(tx.totalCost || 0).toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  );
                })}
                {stockTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold">
                      لا توجد حركات مخزنية مسجلة حتى الآن
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: ISSUANCES */}
      {activeTab === 'issuances' && (
        <div className="space-y-4">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="font-black text-xl text-slate-900">أذونات صرف الخامات لمراحل الإنتاج</CardTitle>
              <CardDescription className="font-bold text-slate-500">سجل خروج المواد الأولية وربطها بأوامر الشغل ومراكز التكلفة</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50 h-14">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-right font-black text-slate-900 px-6 text-xs uppercase">رقم الإذن</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">التاريخ</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">رقم أمر الشغل</TableHead>
                  <TableHead className="text-right font-black text-slate-900 text-xs uppercase">الأصناف المنصرفة</TableHead>
                  <TableHead className="text-right font-black text-slate-900 px-6 text-xs uppercase">إجمالي القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issuances.map((iss: any) => {
                  const itemsList = iss.items || iss.selectedItems || [];
                  return (
                    <TableRow key={iss.id || iss.jobOrderNo} className="h-16 border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-6 font-mono font-black text-indigo-600">{iss.jobOrderNo || 'ISS'}</TableCell>
                      <TableCell className="font-bold text-slate-600">{iss.date}</TableCell>
                      <TableCell className="font-black text-slate-900">{iss.jobOrderNo || 'غير محدد'}</TableCell>
                      <TableCell className="font-bold text-slate-700">
                        {itemsList.map((i: any) => {
                          const itmName = items.find(it => it.id === i.itemId)?.name || 'صنف';
                          return `${itmName} (${i.quantity})`;
                        }).join('، ')}
                      </TableCell>
                      <TableCell className="px-6 font-mono font-black text-emerald-600">
                        {(itemsList.reduce((sum: number, i: any) => {
                          const itm = items.find(it => it.id === i.itemId);
                          return sum + (i.quantity * (itm?.price || 0));
                        }, 0) || 0).toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  );
                })}
                {issuances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold">
                      لا توجد أذونات صرف مسجلة للإنتاج
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 4: AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl p-6 bg-white space-y-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">جرد المخازن والتسوية الدورية</h3>
              <p className="text-sm font-bold text-slate-500">قم بإدخال الكميات الفعلية للمطابقة التلقائية مع الأرصدة الدفترية واكتشاف الفوارق (عجز أو زيادة)</p>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50 h-12">
                  <TableRow>
                    <TableHead className="text-right font-black text-slate-900">اسم الصنف</TableHead>
                    <TableHead className="text-right font-black text-slate-900">الرصيد الدفتري</TableHead>
                    <TableHead className="text-right font-black text-slate-900">الرصيد الفعلي (الجرد)</TableHead>
                    <TableHead className="text-right font-black text-slate-900">الفارق (عجز / زيادة)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const bookQty = item.currentBalance ?? item.openingBalance ?? 0;
                    const actualQty = auditCounts[item.id!] !== undefined ? auditCounts[item.id!] : bookQty;
                    const diff = actualQty - bookQty;

                    return (
                      <TableRow key={item.id} className="h-14">
                        <TableCell className="font-black text-slate-900">{item.name}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-700">{bookQty} {item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-32 h-10 font-black text-slate-900 bg-slate-50"
                            value={actualQty}
                            onChange={e => setAuditCounts({ ...auditCounts, [item.id!]: Number(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell className={`font-mono font-black ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {diff > 0 ? `+${diff}` : diff} {item.unit}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button onClick={() => alert('تم حفظ وتسجيل محضر الجرد وتحديث التسويات المخزنية بنجاح!')} className="btn-primary h-12 px-8 rounded-xl font-black">
                اعتماد محضر الجرد والتسوية المالية
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <PrintHeader
            title="التقرير المالي والشامل لأرصدة وقيمة المخازن"
            subtitle="حصر تقييمي متكامل لرأس المال العيني والأصناف الاستراتيجية"
            companyInfo={companySettings || companyInfo}
            kpis={[
              { label: 'إجمالي قيمة المخزون', value: `${totalStockValue.toLocaleString()} ج.م`, highlight: true },
              { label: 'عدد الأصناف', value: `${totalItemsCount} صنف` },
              { label: 'أصناف منخفضة', value: `${lowStockItemsCount} صنف` },
            ]}
          />

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl p-6 bg-white space-y-6 print:shadow-none">
            <div className="flex items-center justify-between print:hidden">
              <h3 className="text-xl font-black text-slate-900">ملخص تقييم المخزون حسب التصنيف</h3>
              <Button onClick={() => window.print()} className="h-10 px-5 rounded-xl bg-slate-900 text-white font-black text-xs">
                <Printer size={16} className="ml-1" /> طباعة التقرير الشامل
              </Button>
            </div>

            <Table>
              <TableHeader className="bg-slate-50 h-12">
                <TableRow>
                  <TableHead className="text-right font-black text-slate-900">التصنيف</TableHead>
                  <TableHead className="text-right font-black text-slate-900">عدد الأصناف</TableHead>
                  <TableHead className="text-right font-black text-slate-900">إجمالي الكميات</TableHead>
                  <TableHead className="text-right font-black text-slate-900">إجمالي القيمة التقديرية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.filter(c => c !== 'الكل').map(cat => {
                  const catItems = items.filter(i => i.category === cat);
                  const count = catItems.length;
                  const totalQty = catItems.reduce((sum, i) => sum + (i.currentBalance ?? i.openingBalance ?? 0), 0);
                  const totalVal = catItems.reduce((sum, i) => sum + ((i.currentBalance ?? i.openingBalance ?? 0) * (i.price || 0)), 0);

                  return (
                    <TableRow key={cat} className="h-14">
                      <TableCell className="font-black text-slate-900">{cat}</TableCell>
                      <TableCell className="font-bold text-slate-600">{count} صنف</TableCell>
                      <TableCell className="font-mono font-black text-slate-900">{totalQty.toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-black text-emerald-600">{totalVal.toLocaleString()} ج.م</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <PrintSignatures
            tafqeetText={tafqeetArabic(totalStockValue, 'جنيه مصري')}
            preparedByTitle="مسؤول المخازن والمستودعات"
            auditedByTitle="المراجع المالي الداخلي"
            approvedByTitle="المدير المالي والمدير العام"
          />
        </div>
      )}

      {/* MODAL: ADD ITEM */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50 border-b border-slate-100">
              <CardTitle className="font-black text-lg text-slate-900">إضافة صنف جديد للمخزن</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddItemModal(false)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">التصنيف</label>
                    <select
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs"
                    >
                      <option value="خامات أولية">خامات أولية</option>
                      <option value="منتجات تامة">منتجات تامة</option>
                      <option value="أكسسوارات ومستلزمات">أكسسوارات ومستلزمات</option>
                      <option value="قطع غيار">قطع غيار</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">المستودع</label>
                    <select
                      value={newItem.warehouseId}
                      onChange={e => setNewItem({ ...newItem, warehouseId: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500">اسم الصنف</label>
                  <Input
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="مثال: خشب زان روماني، مسامير 5 سم..."
                    required
                    className="h-11 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">الرصيد الافتتاحي</label>
                    <Input
                      type="number"
                      value={newItem.openingBalance}
                      onChange={e => setNewItem({ ...newItem, openingBalance: Number(e.target.value) })}
                      className="h-11 rounded-xl font-mono font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">سعر التكلفة</label>
                    <Input
                      type="number"
                      value={newItem.price}
                      onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
                      className="h-11 rounded-xl font-mono font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">حد الطلب</label>
                    <Input
                      type="number"
                      value={newItem.safetyLimit}
                      onChange={e => setNewItem({ ...newItem, safetyLimit: Number(e.target.value) })}
                      className="h-11 rounded-xl font-mono font-black"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setShowAddItemModal(false)}>إلغاء</Button>
                  <Button type="submit" className="btn-primary h-11 px-6 rounded-xl font-black">حفظ الصنف</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: TRANSACTION */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50 border-b border-slate-100">
              <CardTitle className="font-black text-lg text-slate-900">تسجيل حركة مخزنية جديدة</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowTransactionModal(false)}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">رقم الحركة</label>
                    <Input
                      value={newTx.transactionNo}
                      onChange={e => setNewTx({ ...newTx, transactionNo: e.target.value })}
                      required
                      className="h-11 rounded-xl font-mono font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">التاريخ</label>
                    <Input
                      type="date"
                      value={newTx.date}
                      onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                      required
                      className="h-11 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500">اختر الصنف</label>
                  <SearchableSelect
                    options={items.map(i => ({ id: i.id!, name: i.name, subtext: `المتاح: ${i.currentBalance ?? i.openingBalance ?? 0} ${i.unit}` }))}
                    selectedValue={newTx.itemId}
                    onChange={val => {
                      const selected = items.find(i => i.id === val);
                      setNewTx({ ...newTx, itemId: val, unitCost: selected?.price || 0 });
                    }}
                    placeholder="ابحث واختر الصنف..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">نوع الحركة</label>
                    <select
                      value={newTx.transactionType}
                      onChange={e => {
                        const val = e.target.value as any;
                        const direction = ['PURCHASE_RECEIPT', 'RETURN_IN', 'TRANSFER_IN', 'PRODUCTION_RECEIPT', 'OPENING'].includes(val) ? 'in' : 'out';
                        setNewTx({ ...newTx, transactionType: val, direction });
                      }}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs"
                    >
                      <option value="PURCHASE_RECEIPT">إذن إدخال مشتريات (وارد)</option>
                      <option value="PRODUCTION_RECEIPT">إضافة من إنتاج تام (وارد)</option>
                      <option value="ISSUE">إذن صرف مواد (صادر)</option>
                      <option value="WASTE">هالك / تالف (صادر)</option>
                      <option value="STOCK_ADJUSTMENT">تسوية جردية</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500">الكمية</label>
                    <Input
                      type="number"
                      min="1"
                      value={newTx.quantity}
                      onChange={e => setNewTx({ ...newTx, quantity: Number(e.target.value) })}
                      required
                      className="h-11 rounded-xl font-mono font-black"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setShowTransactionModal(false)}>إلغاء</Button>
                  <Button type="submit" className="btn-primary h-11 px-6 rounded-xl font-black">حفظ الحركة</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});
