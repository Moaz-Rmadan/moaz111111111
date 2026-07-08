import os

file_path = 'src/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'function ItemCardView({ items, suppliers, purchases, issuances, getItemMovements }: { items: Item[], suppliers: Supplier[], purchases: Purchase[], issuances: Issuance[], getItemMovements: (id: string) => any[] }) {'
end_marker = 'function PrintJobCard({ job, companyInfo }: { job: ProductionJob, companyInfo: any }) {'

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker!")
    exit(1)

end_idx = content.find(end_marker)
if end_idx == -1:
    print("ERROR: Could not find end marker!")
    exit(1)

print(f"Start index: {start_idx}, End index: {end_idx}")

new_code = """function ItemCardView({ items, suppliers, purchases, issuances, getItemMovements }: { items: Item[], suppliers: Supplier[], purchases: Purchase[], issuances: Issuance[], getItemMovements: (id: string) => any[] }) {
  const [selectedId, setSelectedId] = useState<string>('');
  const selectedItem = items.find(i => i.id === selectedId);
  const movements = selectedId ? getItemMovements(selectedId) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full w-fit">
            <Activity size={14} />
            حركة الأصناف التفصيلية
          </div>
          <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900">كارت الصنف</h2>
          <p className="text-slate-500 font-bold text-lg max-w-lg mt-2">عرض دفتر أستاذ المخزون لكل صنف للرقابة وتتبع الحركات</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => window.print()} className="h-14 px-8 rounded-2xl font-black text-slate-700 bg-white hover:bg-slate-50 shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:-translate-y-1">
            <Printer size={20} className="ml-2" />
            طباعة كارت الصنف
          </Button>
        </div>
      </div>

      <Card className="dribbble-card border-none p-8 bg-white shadow-xl shadow-slate-200/50 print:hidden relative overflow-hidden">
        <div className="absolute left-0 top-0 w-32 h-32 bg-primary/5 rounded-br-full pointer-events-none" />
        <div className="flex flex-col md:flex-row gap-6 items-end relative z-10">
          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Search size={14} className="text-primary" />
               البحث عن صنف لعرض كارت الحركة
            </label>
            <div className="relative">
              <select 
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full pl-6 pr-12 h-16 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/20 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold text-lg text-slate-700 appearance-none cursor-pointer transition-all outline-none"
              >
                <option value="">--- اضغط هنا للاختيار من القائمة ---</option>
                {items.slice().sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center pointer-events-none">
                 <Package size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {selectedItem ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="hidden print:block text-center mb-12 border-b-2 border-slate-100 pb-8 relative">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">سجل حركة صنف: {selectedItem.name}</h1>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-900 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { label: 'رصيد أول المدة', value: selectedItem.openingBalance || 0, color: 'text-slate-400', icon: <History size={24} />, bg: "bg-slate-50" },
              { label: 'إجمالي التوريدات', value: (selectedItem.inward || 0) + (selectedItem.returned || 0), color: 'text-emerald-500', icon: <ArrowDownLeft size={24} />, bg: "bg-emerald-50/50" },
              { label: 'إجمالي المنصرفات', value: selectedItem.outward || 0, color: 'text-red-500', icon: <ArrowUpRight size={24} />, bg: "bg-red-50/50" },
              { label: 'إجمالي الهالك', value: selectedItem.wasted || 0, color: 'text-orange-500', icon: <AlertCircle size={24} />, bg: "bg-orange-50/50" },
              { label: 'الرصيد الفعلي الحالي', value: selectedItem.currentBalance || 0, color: 'text-white', highlight: true, icon: <Package size={24} />, bg: "bg-slate-900" }
            ].map((stat, i) => (
              <div key={i} className={cn(
                "p-8 rounded-[2.5rem] border transition-all duration-700 relative overflow-hidden group/stat flex flex-col justify-between h-[180px]",
                stat.highlight 
                  ? "bg-slate-900 text-white border-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.3)]" 
                  : cn(stat.bg, "border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:-translate-y-2")
              )}>
                 <div className="flex items-center justify-between relative z-10">
                    <div className={cn("p-3 rounded-2.5xl transition-transform duration-500 group-hover/stat:scale-110 group-hover/stat:rotate-12", 
                      stat.highlight ? "bg-white/10 text-primary shadow-lg" : "bg-white text-slate-400 shadow-sm border border-slate-50")}>
                       {stat.icon}
                    </div>
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] font-mono", stat.highlight ? "text-white/40" : "text-slate-400")}>{stat.label}</span>
                 </div>
                 <div className="relative z-10 mt-4">
                    <p className={cn("text-5xl font-black tracking-tighter mb-1 font-mono", stat.highlight ? "text-white" : "text-slate-900")}>
                       {(stat.value || 0).toLocaleString()}
                    </p>
                    <p className={cn("text-xs font-bold uppercase tracking-widest", stat.highlight ? "text-primary-foreground/40" : "text-slate-400")}>
                       {selectedItem.unit}
                    </p>
                 </div>
                 {stat.highlight && (
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover/stat:bg-primary/20 transition-all duration-1000" />
                 )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)] group/table transition-all duration-700">
             <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/table:opacity-100 transition-opacity duration-1000" />
                <div className="relative z-10">
                   <h4 className="font-black text-slate-900 uppercase tracking-[0.25em] text-[11px] flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                        <Activity size={16} />
                     </div>
                     سجل الحركة التفصيلية (كارت الصنف)
                   </h4>
                   <p className="text-slate-400 font-bold text-xs mt-2 ml-11">عرض العمليات التاريخية المسجلة على هذا الصنف بدقة</p>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">سجل محاسبي معتمد</span>
                </div>
             </div>
             <Table>
                <TableHeader className="bg-slate-50/50 h-20 border-b border-slate-100">
                   <TableRow className="border-none">
                      <TableHead className="font-black text-slate-900 text-right px-10 text-[10px] uppercase tracking-widest">التاريخ والوقت</TableHead>
                      <TableHead className="font-black text-slate-900 text-right text-[10px] uppercase tracking-widest">نوع العملية</TableHead>
                      <TableHead className="font-black text-slate-900 text-center text-[10px] uppercase tracking-widest">الوارد (In)</TableHead>
                      <TableHead className="font-black text-slate-900 text-center text-[10px] uppercase tracking-widest">المنصرف (Out)</TableHead>
                      <TableHead className="font-black text-slate-900 text-center text-[10px] uppercase tracking-widest">الرصيد التراكمي</TableHead>
                      <TableHead className="font-black text-slate-900 text-right px-10 text-[10px] uppercase tracking-widest">البيان والملاحظات</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {movements.slice().reverse().map((m, idx) => (
                     <TableRow key={idx} className="h-24 border-slate-50 hover:bg-slate-50/50 transition-all group/row">
                       <TableCell className="px-10 text-slate-400 font-bold font-mono text-xs group-hover/row:text-slate-900 transition-colors">
                         {m.date || '---'}
                       </TableCell>
                       <TableCell>
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               m.type.includes('وارد') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                               m.type.includes('منصرف') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                             )} />
                             <span className="font-black text-[11px] text-slate-900 uppercase tracking-tight">{m.type}</span>
                          </div>
                       </TableCell>
                       <TableCell className="text-center">
                         <span className={cn("font-black text-xl tracking-tighter font-mono", m.in > 0 ? "text-emerald-600" : "text-slate-100")}>
                           {m.in > 0 ? `+${(m.in || 0).toLocaleString()}` : '0.00'}
                         </span>
                       </TableCell>
                       <TableCell className="text-center">
                         <span className={cn("font-black text-xl tracking-tighter font-mono", m.out > 0 ? "text-red-500" : "text-slate-100")}>
                           {m.out > 0 ? `-${(m.out || 0).toLocaleString()}` : '0.00'}
                         </span>
                       </TableCell>
                       <TableCell className="text-center">
                         <div className="inline-flex items-center justify-center min-w-[100px] h-12 rounded-2xl bg-slate-50 group-hover/row:bg-white group-hover/row:shadow-sm border border-transparent group-hover/row:border-slate-100 transition-all">
                           <span className="font-black text-slate-900 text-2xl tracking-tighter font-mono">
                             {(m.balance || 0).toLocaleString()}
                           </span>
                         </div>
                       </TableCell>
                       <TableCell className="px-10">
                          <div className="flex items-start gap-2">
                             <div className="mt-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <MessageSquare size={12} className="text-slate-300" />
                             </div>
                             <span className="text-slate-600 font-bold text-sm leading-relaxed max-w-[300px]">
                               {m.notes}
                             </span>
                          </div>
                       </TableCell>
                     </TableRow>
                   ))}
                   {movements.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold">
                         لا توجد حركات مسجلة لهذا الصنف بعد
                       </TableCell>
                     </TableRow>
                   )}
                </TableBody>
             </Table>
          </div>
        </div>
      ) : (
        <Card className="dribbble-card border-none p-12 text-center bg-white shadow-xl shadow-slate-200/50">
          <div className="max-w-md mx-auto space-y-4">
             <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto shadow-sm">
                <Search size={32} />
             </div>
             <h3 className="text-2xl font-black text-slate-900">الرجاء اختيار صنف</h3>
             <p className="text-slate-400 font-bold">يرجى تحديد صنف من القائمة المنسدلة أعلاه لعرض كارت الحركة التفصيلي الخاص به.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Inventory({
  items,
  warehouses,
  purchases,
  issuances,
  suppliers,
  getItemMovements,
  setShowItemAdd,
  setShowCostCenterAdd,
  costCenters,
  profile
}: {
  items: Item[],
  warehouses: Warehouse[],
  purchases: Purchase[],
  issuances: Issuance[],
  suppliers: Supplier[],
  getItemMovements: (id: string) => any[],
  setShowItemAdd: (v: boolean) => void,
  setShowCostCenterAdd: (v: boolean) => void,
  costCenters: CostCenter[],
  profile: UserProfile | null
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [selectedCostCenter, setSelectedCostCenter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedItemCard, setSelectedItemCard] = useState<Item | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await deleteDoc(doc(db, 'items', showDeleteConfirm));
        setShowDeleteConfirm(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    const matchesWarehouse = selectedWarehouseId === 'all' || item.warehouseId === selectedWarehouseId;
    const matchesCostCenter = selectedCostCenter === 'all' || item.department === selectedCostCenter;
    const matchesLowStock = !lowStockOnly || item.currentBalance <= item.safetyLimit;
    return matchesSearch && matchesCategory && matchesWarehouse && matchesCostCenter && matchesLowStock;
  });

  const exportToExcel = () => {
    const data = filtered.map(item => ({
      'اسم الصنف': item.name,
      'المخزن': warehouses.find(w => w.id === item.warehouseId)?.name,
      'الوحدة': item.unit,
      'متوسط السعر': item.price,
      'رصيد أول': item.openingBalance,
      'الوارد': item.inward,
      'المنصرف': item.outward,
      'المرتجع': item.returned,
      'الرصيد الحالي': item.currentBalance,
      'إجمالي القيمة': item.totalValue || item.currentBalance * item.price,
      'حد الأمان': item.safetyLimit
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "inventory_report.xlsx");
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 pb-6 relative">
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 text-primary font-black text-xs uppercase tracking-[0.3em] px-5 py-2.5 bg-primary/5 border border-primary/10 rounded-full w-fit shadow-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <WarehouseIcon size={16} />
            إدارة المخزون والعهدة الرقمية
          </div>
          <h2 className="text-5xl lg:text-8xl font-black tracking-tighter text-slate-900 leading-[0.8]">
            المركز <br />
            <span className="text-slate-300">اللوجستي</span>
          </h2>
          <p className="text-slate-400 font-bold text-xl max-w-xl mt-6 leading-relaxed italic">
            مـنصة مـتكاملة لمـراقبة الأرصـدة والـتحليل الـمالي لـمجمل حـركة الخـامات والمـنتج النهـائي.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 bg-white/50 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60 relative z-10">
          <div className="flex bg-slate-100/50 p-2 rounded-2xl border border-slate-200/50">
            <Button variant="ghost" size="sm" onClick={() => setViewMode("grid")} className={`rounded-xl h-12 px-6 transition-all duration-500 ${viewMode === "grid" ? "bg-white text-primary shadow-xl font-black scale-105" : "text-slate-400 hover:text-slate-600"}`}>
              <LayoutGrid size={20} className="ml-2" />
              شبكة
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode("table")} className={`rounded-xl h-12 px-6 transition-all duration-500 ${viewMode === "table" ? "bg-white text-primary shadow-xl font-black scale-105" : "text-slate-400 hover:text-slate-600"}`}>
              <List size={20} className="ml-2" />
              جدول
            </Button>
          </div>
          <Button onClick={() => setShowItemAdd(true)} className="h-16 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-2xl shadow-slate-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3">
            <Plus size={22} strokeWidth={3} />
            إضافة صنف جديد
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-16 w-16 rounded-2xl p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center transition-all hover:rotate-90">
                <SettingsIcon size={24} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-slate-100">
              <DropdownMenuItem onClick={() => setShowCostCenterAdd(true)} className="rounded-xl p-4 font-black gap-3 text-slate-700 hover:bg-slate-50">
                <Layers size={18} className="text-blue-500" />
                إضافة مركز تكلفة
              </DropdownMenuItem>
              <div className="h-px bg-slate-50 my-2" />
              <DropdownMenuItem onClick={() => window.print()} className="rounded-xl p-4 font-black gap-3 text-slate-700 md:flex hidden hover:bg-slate-50">
                <Printer size={18} className="text-slate-400" />
                طباعة جرد المخزن
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <Card className="lg:col-span-2 dribbble-card border-none overflow-hidden bg-slate-900 text-white shadow-2xl rounded-[3rem] relative p-10 flex flex-col justify-between min-h-[320px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <h4 className="font-black text-white/50 uppercase tracking-[0.3em] text-[11px] flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
                 ملـخص الكـفـاءة التشـغيـلية للمخـزون
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[
                   { label: 'أصناف آمنة (متوفرة)', count: items.filter(i => i.currentBalance > i.safetyLimit).length, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', percentage: items.length ? (items.filter(i => i.currentBalance > i.safetyLimit).length / items.length) * 100 : 0 },
                   { label: 'أصناف تحت المراقبة', count: items.filter(i => i.currentBalance > 0 && i.currentBalance <= i.safetyLimit).length, color: 'bg-amber-500', shadow: 'shadow-amber-500/30', percentage: items.length ? (items.filter(i => i.currentBalance > 0 && i.currentBalance <= i.safetyLimit).length / items.length) * 100 : 0 },
                   { label: 'أرصدة معدومة', count: items.filter(i => i.currentBalance === 0).length, color: 'bg-rose-500', shadow: 'shadow-rose-500/30', percentage: items.length ? (items.filter(i => i.currentBalance === 0).length / items.length) * 100 : 0 },
                 ].map((stat, i) => (
                   <div key={i} className="space-y-3">
                      <div className="flex justify-between items-end">
                         <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</span>
                         <span className="text-white font-black text-xl tracking-tighter">{stat.count} <span className="text-[10px] text-white/20 font-bold mr-1">صنف</span></span>
                      </div>
                      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${stat.percentage}%` }}
                           transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.2 }}
                           className={cn("h-full rounded-full", stat.color)}
                         />
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap justify-between items-center gap-4 relative z-10">
               <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-white tracking-tighter leading-none">
                     {items.length ? Math.round((items.filter(i => i.currentBalance > i.safetyLimit).length / items.length) * 100) : 0}%
                  </span>
                  <span className="text-emerald-400 font-black text-sm uppercase tracking-widest flex items-center gap-1">
                     <TrendingUp size={14} />
                     مؤشر التوفر آمن
                  </span>
               </div>
               <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">مؤشر كـفاءة التـوفر اللـوجسـتي</span>
            </div>
         </Card>

         <Card className="dribbble-card border-none bg-white p-10 shadow-xl shadow-slate-200/50 rounded-[3rem] flex flex-col justify-between min-h-[320px]">
            <div className="space-y-4">
               <h3 className="text-2xl font-black text-slate-900">التحليل السريع</h3>
               <p className="text-slate-500 font-bold text-sm leading-relaxed">يمكنك تصفية المخزون للوصول الفوري للأصناف منخفضة الرصيد لسرعة التوريد وتفادي توقف الإنتاج.</p>
            </div>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-700">عدد الأصناف الكلي</span>
                  <span className="font-black text-xl text-slate-900">{items.length} صنف</span>
               </div>
               <Button onClick={exportToExcel} className="w-full h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 font-black text-slate-700 transition-all">
                  تصدير تقرير الجرد الكامل (Excel)
               </Button>
            </div>
         </Card>
      </div>

      <div className="bg-white/50 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/60 shadow-2xl shadow-slate-200/50 space-y-10 relative overflow-hidden group/filter">
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover/filter:scale-110 transition-transform duration-1000" />
        <div className="flex flex-col lg:flex-row gap-8 justify-between relative z-10">
           <div className="flex-1 relative max-w-2xl">
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300">
                <Search size={22} strokeWidth={2.5} />
              </div>
              <Input 
                placeholder="منـصة الـبحث الذكـي عن الأصـناف والأكـواد..." 
                className="w-full h-24 pr-24 pl-10 rounded-[2.5rem] border-none bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] focus-visible:ring-0 focus-visible:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.15)] font-black text-xl placeholder:text-slate-300 placeholder:italic transition-all duration-700 hover:shadow-indigo-500/5" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>

           <div className="flex flex-wrap items-center gap-4">
               <div className="p-2.5 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 shadow-xl shadow-slate-200/20 flex items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg">
                     <Filter size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-sm px-2">
                    {['الكل', 'مادة خام', 'منتج نهائي', 'تعبئة وتغليف'].map((cat) => (
                       <button
                         key={cat}
                         onClick={() => setCategory(cat === 'الكل' ? 'all' : cat)}
                         className={cn(
                           "h-12 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-500 shrink-0 whitespace-nowrap",
                           (category === 'all' && cat === 'الكل') || (category === cat)
                             ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105"
                             : "text-slate-400 hover:bg-white hover:text-slate-600"
                         )}
                       >
                         {cat}
                       </button>
                    ))}
                  </div>
               </div>

               <button
                 onClick={() => setLowStockOnly(!lowStockOnly)}
                 className={cn(
                   "h-16 px-8 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all duration-500 flex items-center gap-3 border shadow-lg",
                   lowStockOnly
                     ? "bg-rose-500 text-white border-rose-500 shadow-rose-500/20 scale-105"
                     : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 shadow-slate-200/20"
                 )}
               >
                 <AlertTriangle size={16} className={lowStockOnly ? "animate-bounce text-white" : "text-rose-500"} />
                 نواقص ومخزون حرج فقط
               </button>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-100/60 relative z-10">
           <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <WarehouseIcon size={16} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">تصنيف المستودعات:</span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  <button 
                   onClick={() => setSelectedWarehouseId('all')}
                   className={`h-11 px-6 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${selectedWarehouseId === 'all' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                   كافة المخازن
                  </button>
                  {warehouses.map(w => (
                    <button 
                     key={w.id}
                     onClick={() => setSelectedWarehouseId(w.id)}
                     className={`h-11 px-6 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${selectedWarehouseId === w.id ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                     {w.name}
                    </button>
                  ))}
              </div>
           </div>
           
           <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 ml-auto">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">مراكز التكلفة:</span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  <button 
                   onClick={() => setSelectedCostCenter('all')}
                   className={`h-11 px-6 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${selectedCostCenter === 'all' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                   جميع الأقسام
                  </button>
                  {costCenters.map(c => (
                    <button 
                     key={c.id}
                     onClick={() => setSelectedCostCenter(c.name)}
                     className={`h-11 px-6 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${selectedCostCenter === c.name ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                     {c.name}
                    </button>
                  ))}
              </div>
           </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filtered.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.8, ease: "easeOut" }}
              className="h-full"
            >
               <Card className="dribbble-card border-none group h-full flex flex-col relative overflow-hidden bg-white shadow-[0_15px_40px_-5px_rgba(0,0,0,0.03)] hover:shadow-[0_45px_100px_-10px_rgba(99,102,241,0.12)] transition-all duration-700 rounded-[3rem] border border-slate-100/40 hover:border-primary/10">
                  <div className={cn(
                    "absolute top-0 inset-x-0 h-2 transition-all duration-700 z-20",
                    item.currentBalance <= item.safetyLimit ? "bg-red-500 shadow-[0_5px_15px_rgba(239,68,68,0.3)] animate-pulse" : "bg-slate-100 group-hover:bg-primary"
                  )} />
                  
                  <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 opacity-40 rounded-bl-[10rem] -mr-16 -mt-16 group-hover:bg-primary/5 transition-all duration-1000 rotate-12 pointer-events-none" />
                  
                  <CardContent className="p-10 pb-6 flex-1 relative z-10 flex flex-col">
                    <div className="flex justify-between items-start mb-8 gap-4">
                       <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 group-hover:rotate-12 transition-all duration-700 border border-slate-100">
                              <Package size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <Badge variant="outline" className="bg-white border-slate-100 text-[9px] font-black tracking-widest text-slate-400 px-3 uppercase rounded-full group-hover:border-primary/20 group-hover:text-primary transition-all duration-700">
                                {warehouses.find(w => w.id === item.warehouseId)?.name || 'غير معروف'}
                            </Badge>
                          </div>
                          <h3 className="font-black text-2xl text-slate-900 group-hover:text-primary transition-colors leading-[1.2] line-clamp-2 tracking-tight group-hover:translate-x-1 duration-700">
                             {item.name}
                          </h3>
                       </div>
                       <div className="shrink-0 flex flex-col items-end text-left">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-slate-900/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700">
                             {item.unit}
                          </div>
                       </div>
                    </div>

                    <div className="mt-8 space-y-6 flex-1">
                       <div className="grid grid-cols-2 gap-6 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 shadow-sm relative group-hover:bg-white group-hover:border-primary/10 transition-all duration-700 overflow-hidden">
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">الرصيد المتاح</p>
                             <div className="flex items-baseline gap-2 justify-end">
                                <span className={cn(
                                  "text-4xl font-black tracking-tighter transition-all duration-700 group-hover:scale-110 origin-right",
                                  item.currentBalance <= item.safetyLimit ? "text-red-600" : "text-slate-900"
                                )}>
                                  {item.currentBalance}
                                </span>
                             </div>
                          </div>
                          <div className="border-r border-slate-100 pr-6">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">حد الأمان</p>
                             <div className="flex items-baseline gap-2 justify-end">
                                <span className="text-xl font-black text-slate-400 tracking-tight group-hover:text-slate-600 transition-colors">
                                  {item.safetyLimit}
                                </span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center justify-between p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/50 group-hover:bg-indigo-500 group-hover:border-indigo-500 transition-all duration-700">
                          <TrendingUp size={24} className="text-indigo-200 group-hover:text-white transition-colors" />
                          <div className="text-left">
                             <p className="text-[9px] font-black text-indigo-400 group-hover:text-white/60 uppercase tracking-widest mb-1">القيمة السوقية</p>
                             <div className="flex items-baseline gap-2 justify-end">
                                <span className="text-2xl font-black text-slate-900 group-hover:text-white transition-colors tracking-tighter">
                                   {(item.totalValue || (item.currentBalance * item.price)).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white/50">ج.م</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-8 pt-0 flex gap-4 transition-all duration-700 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                    <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-black bg-slate-50 hover:bg-slate-900 hover:text-white transition-all duration-500" onClick={() => setSelectedItemCard(item)}>
                      <Eye size={18} className="ml-2" />
                      التفاصيل
                    </Button>
                    <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-black bg-indigo-50 text-primary hover:bg-primary hover:text-white transition-all duration-500" onClick={() => setEditingItem(item)}>
                      <Edit2 size={18} className="ml-2" />
                      تعديل
                    </Button>
                    {(profile?.isAdmin || profile?.permissions.canDelete) && (
                      <Button variant="ghost" className="rounded-2xl h-14 w-14 font-black bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-500" onClick={() => setShowDeleteConfirm(item.id)}>
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </CardFooter>
               </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="dribbble-card border-none bg-white shadow-xl overflow-hidden rounded-[3rem]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 h-16 border-none">
                <TableRow>
                  <TableHead className="px-10 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">الصنف</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">المخزن/القسم</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">الرصيد</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">الهالك</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest text-center">السعر</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest text-right px-10">إجمالي القيمة</TableHead>
                  <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest text-center px-6">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, idx) => (
                  <TableRow key={item.id} className="h-28 hover:bg-slate-50/40 transition-all group border-slate-50">
                    <TableCell className="px-10">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden",
                            item.currentBalance <= item.safetyLimit ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                          )}>
                             <Package size={22} className="relative z-10" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors leading-tight">{item.name}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1.5">
                           <Badge variant="secondary" className="w-fit rounded-lg font-black text-[9px] tracking-tight bg-slate-900 text-white border-none px-2 py-0.5 shadow-sm">
                             {warehouses.find(w => w.id === item.warehouseId)?.name || '-'}
                           </Badge>
                           <span className="text-[10px] font-black text-primary/70 uppercase tracking-tight">
                             {item.department || '-'}
                           </span>
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex flex-col items-center">
                          <span className={cn(
                            "text-2xl font-black tracking-tighter",
                            item.currentBalance <= item.safetyLimit ? 'text-red-500 underline underline-offset-8 decoration-2 decoration-red-200' : 'text-slate-900'
                          )}>
                            {(item.currentBalance || 0).toLocaleString()}
                          </span>
                          {item.currentBalance <= item.safetyLimit && (
                            <span className="text-[9px] text-red-400 font-black uppercase mt-1">تنبيه حد الأمان</span>
                          )}
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-black text-orange-600 text-lg tracking-tighter">
                        {item.wasted || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-black text-slate-900 text-lg tracking-tighter">
                      {(item.price || 0).toLocaleString()}
                      <span className="text-[10px] text-slate-400 mr-1 font-bold">ج.م</span>
                    </TableCell>
                    <TableCell className="text-right px-10">
                       <div className="flex flex-col items-end">
                          <span className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors tracking-tighter">
                            {(item.totalValue || ((item.currentBalance || 0) * (item.price || 0))).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">إجمالي محاسبي</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-center print:hidden px-6">
                       <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10" onClick={() => setEditingItem(item)}>
                            <Edit2 size={18} />
                          </Button>
                          {(profile?.isAdmin || profile?.permissions.canDelete) && (
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100" onClick={() => setShowDeleteConfirm(item.id)}>
                              <Trash2 size={18} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200" onClick={() => setSelectedItemCard(item)}>
                            <History size={18} />
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                <TableRow className="bg-slate-900 h-32 font-black border-none sticky bottom-0 z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]">
                  <TableCell colSpan={2} className="px-12">
                     <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                           <span className="text-white/40 text-[10px] uppercase tracking-[0.4em]">نظام مراقبة المخزون الذكي</span>
                        </div>
                        <span className="text-white text-3xl font-black tracking-tighter leading-none">إجمالي قيم المستودعات</span>
                     </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-primary text-4xl font-black tracking-tighter font-mono leading-none">
                        {filtered.reduce((acc, i) => acc + i.currentBalance, 0).toLocaleString()}
                      </span>
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-1">إجمالي الكميات مجمعة</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                       <span className="text-orange-500 text-3xl font-black tracking-tighter font-mono leading-none">
                         {filtered.reduce((acc, i) => acc + (i.wasted || 0), 0).toLocaleString()}
                       </span>
                       <span className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-1">إجمالي الفواقد</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center opacity-10">
                    <div className="w-12 h-px bg-white mx-auto shadow-[0_0_15px_white]" />
                  </TableCell>
                  <TableCell className="text-right px-12">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-3">
                         <span className="text-primary text-5xl font-black tracking-tighter font-mono leading-none">
                           {filtered.reduce((acc, i) => acc + (i.totalValue || (i.currentBalance * i.price)), 0).toLocaleString()}
                         </span>
                         <span className="text-white font-black text-xl">ج.م</span>
                      </div>
                      <span className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-2">القيمة الدفترية الكلية للمخزون</span>
                    </div>
                  </TableCell>
                  <TableCell className="print:hidden"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}


      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-6"
              >
                 <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto text-red-500">
                    <Trash2 size={40} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900">هل أنت متأكد؟</h3>
                    <p className="text-slate-500 font-bold mt-2 leading-relaxed">بمجرد الحذف لن يمكنك استرجاع بيانات هذا الصنف مرة أخرى من النظام.</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <Button variant="ghost" className="h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-100" onClick={() => setShowDeleteConfirm(null)}>إلغاء</Button>
                    <Button className="btn-danger h-14 rounded-2xl font-black" onClick={confirmDelete}>تأكيد الحذف</Button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Edit Item Panel */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-end z-[90]">
            <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="h-full w-full max-w-xl bg-white shadow-2xl overflow-auto p-12"
            >
              <div className="flex items-center justify-between mb-12">
                 <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">تعديل صنف</h2>
                    <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">تعديل بيانات {editingItem.name}</p>
                 </div>
                 <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-500" onClick={() => setEditingItem(null)}>
                    <X size={24} />
                 </Button>
              </div>

              <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">اسم الصنف المعرف</label>
                    <Input className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg px-6 focus-visible:ring-2 focus-visible:ring-primary/20" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">المخزن الأساسي</label>
                      <select 
                        className="w-full h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-no-repeat bg-[right_1.5rem_center]" 
                        value={editingItem.warehouseId} 
                        onChange={e => setEditingItem({...editingItem, warehouseId: e.target.value})}
                      >
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest">مركز التكلفة / القسم</label>
                       <select 
                         className="w-full h-16 rounded-2xl bg-slate-50 border-none px-6 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20" 
                         value={editingItem.department || ''} 
                         onChange={e => setEditingItem({...editingItem, department: e.target.value})}
                       >
                         <option value="">غير مصنف</option>
                         {costCenters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">وحدة القياس</label>
                      <Input className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg px-6" value={editingItem.unit} onChange={e => setEditingItem({...editingItem, unit: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">متوسط السعر (ج.م)</label>
                      <Input type="number" className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg px-6" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">حد الأمان (تنبيه)</label>
                      <Input type="number" className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg px-6" value={editingItem.safetyLimit} onChange={e => setEditingItem({...editingItem, safetyLimit: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="pt-12 flex gap-4">
                     <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-black text-slate-400 hover:bg-slate-50" onClick={() => setEditingItem(null)}>إلغاء التغييرات</Button>
                     <Button className="btn-primary h-16 flex-1 rounded-2xl font-black" onClick={async () => {
                        try {
                           const { id, ...data } = editingItem;
                           await updateDoc(doc(db, 'items', id), data);
                           setEditingItem(null);
                        } catch (err) {
                           console.error(err);
                        }
                     }}>حفظ البيانات الجديدة</Button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Item Card Dialog */}
      <AnimatePresence>
        {selectedItemCard && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[95] overflow-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[3.5rem] w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col shadow-[0_32px_128px_rgba(0,0,0,0.1)] border border-slate-100"
            >
              <div className="p-12 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 relative">
                  <div className="absolute top-0 right-0 w-64 h-full bg-primary/5 rounded-bl-[5rem] -mr-20 pointer-events-none blur-3xl opacity-50" />
                  
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-xl rotate-3">
                         <Package size={28} />
                      </div>
                      <div>
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3 py-1.5 mb-1 tracking-widest uppercase rounded-full">Warehouse Management System</Badge>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">بطاقة مراقبة الصنف</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-slate-500 font-bold">
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-primary" />
                         <span className="text-slate-900">{selectedItemCard.name}</span>
                       </div>
                       <div className="h-4 w-px bg-slate-200" />
                       <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-black text-[10px] uppercase">المخزن:</span>
                          <span className="text-slate-700">{warehouses.find(w => w.id === selectedItemCard.warehouseId)?.name}</span>
                       </div>
                       <div className="h-4 w-px bg-slate-200" />
                       <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-black text-[10px] uppercase">الوحدة الأساسية:</span>
                          <span className="text-slate-700">{selectedItemCard.unit}</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-4 relative z-10">
                   <Button variant="outline" className="h-16 px-10 rounded-3xl border-slate-200 font-black gap-3 text-slate-900 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all" onClick={() => window.print()}>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                         <Printer size={18} />
                      </div>
                      طباعة التقرير الفني
                   </Button>
                   <Button variant="ghost" className="h-16 w-16 rounded-[22px] bg-white shadow-xl border border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all hover:rotate-90" onClick={() => setSelectedItemCard(null)}>
                      <X size={28} />
                   </Button>
                 </div>
              </div>

               <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                <div className="px-12 pt-12 pb-8">
                   <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                      {[
                        { label: 'رصيد أول المدة', value: selectedItemCard.openingBalance || 0, color: 'text-slate-400', icon: <History size={24} />, bg: "bg-slate-50" },
                        { label: 'إجمالي التوريدات', value: (selectedItemCard.inward || 0) + (selectedItemCard.returned || 0), color: 'text-emerald-500', icon: <ArrowDownLeft size={24} />, bg: "bg-emerald-50/30" },
                        { label: 'إجمالي المنصرفات', value: selectedItemCard.outward || 0, color: 'text-red-500', icon: <ArrowUpRight size={24} />, bg: "bg-red-50/30" },
                        { label: 'إجمالي الهالك والمفقود', value: selectedItemCard.wasted || 0, color: 'text-orange-500', icon: <AlertCircle size={24} />, bg: "bg-orange-50/30" },
                        { label: 'رصيد المخزن الحالي', value: selectedItemCard.currentBalance || 0, color: 'text-white', highlight: true, icon: <Package size={24} />, bg: "bg-slate-900" }
                      ].map((stat, i) => (
                        <div key={i} className={cn(
                          "p-10 rounded-[3rem] border transition-all duration-700 relative overflow-hidden group/stat flex flex-col justify-between h-[180px]",
                          stat.highlight 
                            ? "bg-slate-900 text-white border-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.3)]" 
                            : cn(stat.bg, "border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:-translate-y-2")
                        )}>
                           <div className="flex items-center justify-between relative z-10">
                              <div className={cn("p-3 rounded-2.5xl transition-transform duration-500 group-hover/stat:scale-110 group-hover/stat:rotate-12", 
                                stat.highlight ? "bg-white/10 text-primary shadow-lg" : "bg-white text-slate-400 shadow-sm border border-slate-50")}>
                                 {stat.icon}
                              </div>
                              <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] font-mono", stat.highlight ? "text-white/40" : "text-slate-400")}>{stat.label}</span>
                           </div>
                           <div className="relative z-10">
                              <p className={cn("text-5xl font-black tracking-tighter mb-1 font-mono", stat.highlight ? "text-white" : "text-slate-900")}>
                                 {(stat.value || 0).toLocaleString()}
                              </p>
                              <p className={cn("text-xs font-bold uppercase tracking-widest", stat.highlight ? "text-primary-foreground/40" : "text-slate-400")}>
                                 {selectedItemCard.unit}
                              </p>
                           </div>
                           {stat.highlight && (
                              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover/stat:bg-primary/20 transition-all duration-1000" />
                           )}
                        </div>
                      ))}
                   </div>
                </div>

                <div className="px-12 pb-12">
                   <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)] group/table transition-all duration-700">
                      <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center relative overflow-hidden">
                         <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/table:opacity-100 transition-opacity duration-1000" />
                         <div className="relative z-10">
                            <h4 className="font-black text-slate-900 uppercase tracking-[0.25em] text-[11px] flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                 <Activity size={16} />
                              </div>
                              سجل الحركة التفصيلية (كارت الصنف)
                            </h4>
                            <p className="text-slate-400 font-bold text-xs mt-2 ml-11">عرض العمليات التاريخية المسجلة على هذا الصنف بدقة</p>
                         </div>
                         <div className="flex items-center gap-3 relative z-10">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">سجل محاسبي معتمد</span>
                         </div>
                      </div>
                      <Table>
                         <TableHeader className="bg-slate-50/50 h-20 border-b border-slate-100">
                            <TableRow className="border-none">
                               <TableHead className="font-black text-slate-900 text-right px-10 text-[10px] uppercase tracking-widest">التاريخ والوقت</TableHead>
                               <TableHead className="font-black text-slate-900 text-right text-[10px] uppercase tracking-widest">نوع العملية</TableHead>
                               <TableHead className="font-black text-slate-900 text-center text-[10px] uppercase tracking-widest">الوارد (In)</TableHead>
                               <TableHead className="font-black text-slate-900 text-center text-[10px] uppercase tracking-widest">المنصرف (Out)</TableHead>
                               <TableHead className="font-black text-slate-900 text-center text-[10px] uppercase tracking-widest">الرصيد التراكمي</TableHead>
                               <TableHead className="font-black text-slate-900 text-right px-10 text-[10px] uppercase tracking-widest">البيان والملاحظات</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {getItemMovements(selectedItemCard.id).slice().reverse().map((m, idx) => (
                              <TableRow key={idx} className="h-24 border-slate-50 hover:bg-slate-50/50 transition-all group/row">
                                <TableCell className="px-10 text-slate-400 font-bold font-mono text-xs group-hover/row:text-slate-900 transition-colors">
                                  {m.date || '---'}
                                </TableCell>
                                <TableCell>
                                   <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        m.type.includes('وارد') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                                        m.type.includes('منصرف') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                                      )} />
                                      <span className="font-black text-[11px] text-slate-900 uppercase tracking-tight">{m.type}</span>
                                   </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={cn("font-black text-xl tracking-tighter font-mono", m.in > 0 ? "text-emerald-600" : "text-slate-100")}>
                                    {m.in > 0 ? `+${(m.in || 0).toLocaleString()}` : '0.00'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={cn("font-black text-xl tracking-tighter font-mono", m.out > 0 ? "text-red-500" : "text-slate-100")}>
                                    {m.out > 0 ? `-${(m.out || 0).toLocaleString()}` : '0.00'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="inline-flex items-center justify-center min-w-[100px] h-12 rounded-2xl bg-slate-50 group-hover/row:bg-white group-hover/row:shadow-sm border border-transparent group-hover/row:border-slate-100 transition-all">
                                    <span className="font-black text-slate-900 text-2xl tracking-tighter font-mono">
                                      {(m.balance || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-10">
                                   <div className="flex items-start gap-2">
                                      <div className="mt-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                         <MessageSquare size={12} className="text-slate-300" />
                                      </div>
                                      <span className="text-slate-600 font-bold text-sm leading-relaxed max-w-[300px]">
                                        {m.notes}
                                      </span>
                                   </div>
                                </TableCell>
                              </TableRow>
                            ))}
                         </TableBody>
                      </Table>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"""

# Stitch back the file with the replacement
updated_content = content[:start_idx] + new_code + content[end_idx:]
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("SUCCESS: Code replaced successfully!")
