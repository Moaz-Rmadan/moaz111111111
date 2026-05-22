import fs from 'fs';

const file = 'src/App.tsx';
const content = fs.readFileSync(file, 'utf-8');

const regex = /function ArchiveView\(\{ employees, payrolls, transactions \}: \{ employees: Employee\[\], payrolls: Payroll\[\], transactions: FinancialTransaction\[\] \}\) \{([\s\S]*?)(?=function SalesModule)/;

const newString = `function ArchiveView({ employees, payrolls, transactions }: { employees: Employee[], payrolls: Payroll[], transactions: FinancialTransaction[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('الكل');

  // Pagination Engine
  const [archivedPayrolls, setArchivedPayrolls] = useState<Payroll[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchArchivedPayrolls = async (isInitial = false) => {
    if (loading) return;
    if (!isInitial && !hasMore) return;
    setLoading(true);

    try {
      let q = query(
        collection(db, 'payrolls'), 
        where('status', '==', 'مدفوع'),
        orderBy('paymentDate', 'desc'),
        limit(50)
      );

      if (!isInitial && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snap = await getDocs(q);
      
      const newPayrolls = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payroll));
      
      if (snap.docs.length < 50) {
        setHasMore(false);
      }
      
      setLastVisible(snap.docs[snap.docs.length - 1]);
      
      if (isInitial) {
        setArchivedPayrolls(newPayrolls);
      } else {
        setArchivedPayrolls(prev => [...prev, ...newPayrolls]);
      }
    } catch (err) {
      handleFirestoreError(err, 'list', 'payrolls');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchArchivedPayrolls(true);
  }, []);

  const totalArchived = archivedPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

  const departments = ['الكل', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[]];
  
  const filtered = archivedPayrolls.filter(p => {
    const emp = employees.find(e => e.id === p.employeeId);
    const matchesSearch = emp?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'الكل' || emp?.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleUpdatePayroll = async () => {
    if (!editingPayroll) return;
    try {
      const { id, ...data } = editingPayroll;
      const netSalary = (data.baseSalary || 0) + (data.totalBonuses || 0) + (data.totalOvertime || 0) - (data.totalDeductions || 0) - (data.totalExpenses || 0) - (data.totalLoans || 0);
      await updateDoc(doc(db, 'payrolls', id), { ...data, netSalary });
      
      // Update local state temporarily
      setArchivedPayrolls(prev => prev.map(p => p.id === id ? { ...data, id, netSalary } as Payroll : p));
      
      setEditingPayroll(null);
    } catch (err) { handleFirestoreError(err, 'update', 'payrolls'); }
  };

  const handleDeletePayroll = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'payrolls', deletingId));
      setArchivedPayrolls(prev => prev.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (err) { handleFirestoreError(err, 'delete', 'payrolls'); }
  };

  const handleExportExcel = () => {
    const dataToExport = filtered.map(p => ({
      'الأسبوع': \`أسبوع \${p.weekNumber}\`,
      'الفترة': \`\${p.startDate} - \${p.endDate}\`,
      'التاريخ': p.paymentDate || 'غير محدد',
      'اسم الموظف': employees.find(e => e.id === p.employeeId)?.name || 'غير معروف',
      'اليومية': p.dailyRate,
      'أيام العمل': p.daysWorked,
      'إجمالي اليوميات': p.baseSalary,
      'إضافي': p.totalOvertime,
      'مكافآت': p.totalBonuses,
      'خصومات': p.totalDeductions,
      'مصروفات': p.totalExpenses || 0,
      'سلف': p.totalLoans,
      'صافي الراتب': p.netSalary,
      'الحالة': p.status
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archived_Payroll");
    XLSX.writeFile(wb, \`Archived_Payroll_\${new Date().toLocaleDateString()}.xlsx\`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">الأرشيف</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">مرحباً بك.. إليك ملخص الحالة المالية الحالية.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportExcel} className="btn-secondary h-12 px-6 shadow-sm">
            <Download size={18} className="ml-2" />
            تصدير Excel لنتائج البحث
          </Button>
          <div className="bg-white p-3 px-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-lg">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 tracking-widest">إجمالي المعروض</p>
              <p className="text-lg font-black text-slate-900">{totalArchived.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            placeholder="بحث عن موظف..." 
            className="pl-4 pr-11 h-12 rounded-xl border-slate-200 bg-white font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="h-12 rounded-xl border border-slate-200 px-4 bg-white font-bold text-sm min-w-[150px]"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      <Card className="dribbble-card overflow-hidden border-none shadow-xl shadow-slate-200/40">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
              <TableRow className="border-b-0">
                <TableHead className="text-right font-black text-slate-900 py-4">الأسبوع</TableHead>
                <TableHead className="text-right font-black text-slate-900">التاريخ</TableHead>
                <TableHead className="text-right font-black text-slate-900">الموظف</TableHead>
                <TableHead className="text-right font-black text-slate-900">القسم</TableHead>
                <TableHead className="text-right font-black text-slate-900">الصافي</TableHead>
                <TableHead className="text-right font-black text-slate-900">تفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const emp = employees.find(e => e.id === p.employeeId);
                return (
                  <TableRow key={p.id} className="group hover:bg-slate-50 border-b border-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-black">
                          {p.weekNumber}
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 text-xs text-left">أسبوع</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-black text-slate-900">{p.paymentDate || 'غير محدد'}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.startDate} / {p.endDate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users size={16} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900">{emp?.name}</p>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">{emp?.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-600 border-none font-bold">
                        {emp?.department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-lg bg-green-50 text-green-700 px-3 py-1 rounded-xl">
                        {p.netSalary.toLocaleString()} 
                        <span className="text-xs mr-1 opacity-70">ج.م</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedPayroll(p)} 
                          className="h-8 font-bold text-primary hover:bg-primary/5 rounded-lg"
                        >
                          عرض الكشف
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPayroll(p)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(p.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FolderOpen size={48} className="opacity-20" />
                      <p className="font-bold">لا توجد سجلات مؤرشفة تلبي معايير البحث</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button 
            className="btn-secondary px-8 font-black rounded-xl h-12"
            onClick={() => fetchArchivedPayrolls()}
            disabled={loading}
          >
            {loading ? 'جاري التحميل...' : 'عرض المزيد...'}
          </Button>
        </div>
      )}

      {selectedPayroll && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="dribbble-card w-full max-w-lg overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black text-2xl mb-1">تفاصيل الدفع</CardTitle>
                <CardDescription className="font-bold text-sm">
                  كشف راتب {employees.find(e => e.id === selectedPayroll.employeeId)?.name}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedPayroll(null)} className="rounded-full bg-white shadow-sm h-10 w-10 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">تاريخ الدفع</p>
                  <p className="font-black text-slate-800">{selectedPayroll.paymentDate || 'غير مسجل'}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الفترة</p>
                  <p className="font-bold text-sm text-slate-600">{selectedPayroll.startDate} / {selectedPayroll.endDate}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-2">التفاصيل المالية</h4>
                
                <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                  <span className="text-slate-500">إجمالي اليوميات ({selectedPayroll.daysWorked} أيام)</span>
                  <span className="text-slate-900 cursor-help" title={\`اليومية: \${selectedPayroll.dailyRate} ج.م\`}>{selectedPayroll.baseSalary} ج.م</span>
                </div>
                
                {selectedPayroll.totalBonuses > 0 && (
                  <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                    <span className="text-slate-500">مكافآت وبدلات</span>
                    <span className="text-green-600">+{selectedPayroll.totalBonuses} ج.م</span>
                  </div>
                )}
                
                {selectedPayroll.totalOvertime > 0 && (
                  <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                    <span className="text-slate-500">إضافي (أوفرتايم)</span>
                    <span className="text-green-600">+{selectedPayroll.totalOvertime} ج.م</span>
                  </div>
                )}

                {selectedPayroll.totalProduction ? (
                  <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                    <span className="text-slate-500">إنتاج (للمقاولين)</span>
                    <span className="text-green-600">+{selectedPayroll.totalProduction} ج.م</span>
                  </div>
                ) : null}

                {selectedPayroll.totalDeductions > 0 && (
                  <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                    <span className="text-slate-500">خصومات وجزاءات وتأخير</span>
                    <span className="text-red-500">-{selectedPayroll.totalDeductions} ج.م</span>
                  </div>
                )}
                
                {selectedPayroll.totalExpenses > 0 && (
                  <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                    <span className="text-slate-500">مصروفات وعهد</span>
                    <span className="text-red-500">-{selectedPayroll.totalExpenses} ج.م</span>
                  </div>
                )}

                {selectedPayroll.totalLoans > 0 && (
                  <div className="flex justify-between items-center py-2 text-sm font-bold border-b border-slate-50">
                    <span className="text-slate-500">سداد سلف</span>
                    <span className="text-orange-500">-{selectedPayroll.totalLoans} ج.م</span>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 flex justify-between items-center">
                <span className="font-black text-primary">الصافي الذي تم دفعه</span>
                <span className="text-2xl font-black text-primary">{selectedPayroll.netSalary} ج.م</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingPayroll && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           {/* Modal Implementation Similar to PayrollView but simplified */}
           <Card className="w-full max-w-lg">
             <CardHeader>
               <CardTitle>تعديل السجل</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                {/* Simplified editing layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">الأساسي</label>
                    <Input type="number" value={editingPayroll.baseSalary} onChange={e => setEditingPayroll({...editingPayroll, baseSalary: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">مكافآت</label>
                    <Input type="number" value={editingPayroll.totalBonuses} onChange={e => setEditingPayroll({...editingPayroll, totalBonuses: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">إضافي</label>
                    <Input type="number" value={editingPayroll.totalOvertime} onChange={e => setEditingPayroll({...editingPayroll, totalOvertime: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">خصومات</label>
                    <Input type="number" value={editingPayroll.totalDeductions} onChange={e => setEditingPayroll({...editingPayroll, totalDeductions: Number(e.target.value)})} />
                  </div>
                   <div className="space-y-2">
                    <label className="text-sm font-bold">مصروفات</label>
                    <Input type="number" value={editingPayroll.totalExpenses || 0} onChange={e => setEditingPayroll({...editingPayroll, totalExpenses: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">سداد سلف</label>
                    <Input type="number" value={editingPayroll.totalLoans} onChange={e => setEditingPayroll({...editingPayroll, totalLoans: Number(e.target.value)})} />
                  </div>
                </div>
             </CardContent>
             <CardFooter className="flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setEditingPayroll(null)}>إلغاء</Button>
               <Button onClick={handleUpdatePayroll} className="btn-primary">حفظ الصافي: {(editingPayroll.baseSalary||0) + (editingPayroll.totalBonuses||0) + (editingPayroll.totalOvertime||0) - (editingPayroll.totalDeductions||0) - (editingPayroll.totalExpenses||0) - (editingPayroll.totalLoans||0)}</Button>
             </CardFooter>
           </Card>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="dribbble-card w-full max-w-sm">
            <CardHeader>
              <CardTitle className="font-black text-xl text-red-600">تأكيد الحذف</CardTitle>
              <CardDescription className="font-bold">هل أنت متأكد من حذف هذا السجل المؤرشف؟ لا يمكن التراجع.</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setDeletingId(null)}>إلغاء</Button>
              <Button onClick={handleDeletePayroll} className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 font-black">حذف نهائي</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
\n`;

const finalCode = content.replace(regex, newString);
fs.writeFileSync(file, finalCode);
console.log('Done!');
