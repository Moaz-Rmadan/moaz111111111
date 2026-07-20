import React, { useState, useEffect, useMemo } from 'react';
import { ProductionJob, Issuance, Employee, JobLabor, JobOtherCost, CostCenter, Item, WorkCenter, ManufacturingOperation, BOM } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DollarSign, Search, Plus, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { SearchableSelect } from './SearchableSelect';

import { handleFirestoreError } from '../lib/firestore-utils';

export function ProductionCostsView({ 
  productionJobs, 
  costCenters,
  issuances, 
  employees, 
  jobLabors, 
  jobOtherCosts,
  items,
  boms,
  workCenters,
  manufacturingOperations
}: { 
  productionJobs: ProductionJob[],
  costCenters: CostCenter[],
  issuances: Issuance[],
  employees: Employee[],
  jobLabors: JobLabor[],
  jobOtherCosts: JobOtherCost[],
  items: Item[],
  boms: BOM[],
  workCenters: WorkCenter[],
  manufacturingOperations: ManufacturingOperation[]
}) {
  const employeeOptions = useMemo(() => {
    return employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      subtext: emp.department || ''
    }));
  }, [employees]);

  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [showAddOther, setShowAddOther] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);
  
  const [materialForm, setMaterialForm] = useState({
    costCenter: '',
    selectedItems: [{ itemId: '', quantity: 0 }]
  });
  
  const [laborForm, setLaborForm] = useState({
    employeeId: '',
    stage: '',
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    notes: ''
  });
  
  const [otherForm, setOtherForm] = useState({
    stage: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    notes: ''
  });

  const matchingBOM = selectedJob ? boms.find(b => b.productId === selectedJob.productId) : null;

  const handleApplyBOM = () => {
    if (matchingBOM) {
      setMaterialForm({
        ...materialForm,
        selectedItems: matchingBOM.items.map(item => ({ itemId: item.itemId, quantity: item.quantity }))
      });
    }
  };

  useEffect(() => {
    if (costCenters.length > 0 && !materialForm.costCenter) {
      setMaterialForm(prev => ({ ...prev, costCenter: costCenters[0].name }));
    }
  }, [costCenters]);

  const handleAddMaterialItem = () => {
    setMaterialForm({
      ...materialForm,
      selectedItems: [...materialForm.selectedItems, { itemId: '', quantity: 0 }]
    });
  };

  const handleRemoveMaterialItem = (index: number) => {
    setMaterialForm({
      ...materialForm,
      selectedItems: materialForm.selectedItems.filter((_, i) => i !== index)
    });
  };

  const handleMaterialItemChange = (index: number, field: string, value: any) => {
    const newItems = [...materialForm.selectedItems];
    (newItems[index] as any)[field] = value;
    setMaterialForm({ ...materialForm, selectedItems: newItems });
  };

  const handleAddMaterial = async () => {
    if (!selectedJob || materialForm.selectedItems.some(i => !i.itemId || i.quantity <= 0)) {
      setMaterialError('يرجى التأكد من ملء جميع البيانات والكميات');
      return;
    }
    
    setMaterialError(null);
    try {
      const date = new Date().toISOString();
      
      for (const selectedItem of materialForm.selectedItems) {
        const item = items.find(i => i.id === selectedItem.itemId);
        if (!item) continue;

        const total = selectedItem.quantity * item.price;
        
        await addDoc(collection(db, 'issuances'), {
          jobOrderNo: selectedJob.orderNo,
          costCenter: materialForm.costCenter || selectedJob.status,
          itemId: selectedItem.itemId,
          quantity: selectedItem.quantity,
          total,
          price: item.price,
          unit: item.unit,
          date
        });

        // Update Item Stock
        await updateDoc(doc(db, 'items', selectedItem.itemId), {
          outward: increment(selectedItem.quantity),
          currentBalance: increment(-selectedItem.quantity)
        });
      }

      setShowAddMaterial(false);
      setMaterialForm({
        costCenter: costCenters[0]?.name || '',
        selectedItems: [{ itemId: '', quantity: 0 }]
      });
    } catch (err) {
      handleFirestoreError(err, 'write', 'issuances');
    }
  };

  const filteredJobs = productionJobs.filter(job => 
    job.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.orderNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddLabor = async () => {
    if (!selectedJob || !laborForm.employeeId || laborForm.hours <= 0 || !laborForm.stage) return;
    const emp = employees.find(e => e.id === laborForm.employeeId);
    if (!emp) return;
    
    const rate = emp.dailyRate / 8; // Assume 8 hours work day
    const total = laborForm.hours * rate;
    
    try {
      await addDoc(collection(db, 'jobLabors'), {
        ...laborForm,
        jobId: selectedJob.id,
        rate,
        total,
        createdAt: serverTimestamp()
      });
      setShowAddLabor(false);
      setLaborForm({ employeeId: '', stage: '', date: new Date().toISOString().split('T')[0], hours: 0, notes: '' });
    } catch (err) { handleFirestoreError(err, 'write', 'jobLabors'); }
  };

  const handleAddOther = async () => {
    if (!selectedJob || !otherForm.description || otherForm.amount <= 0 || !otherForm.stage) return;
    try {
      await addDoc(collection(db, 'jobOtherCosts'), {
        ...otherForm,
        jobId: selectedJob.id,
        createdAt: serverTimestamp()
      });
      setShowAddOther(false);
      setOtherForm({ stage: '', date: new Date().toISOString().split('T')[0], description: '', amount: 0, notes: '' });
    } catch (err) { handleFirestoreError(err, 'write', 'jobOtherCosts'); }
  };

  const handleDeleteLabor = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'jobLabors', id));
    } catch (err) { handleFirestoreError(err, 'delete', 'jobLabors'); }
  };

  const handleDeleteOther = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'jobOtherCosts', id));
    } catch (err) { handleFirestoreError(err, 'delete', 'jobOtherCosts'); }
  };

  if (!selectedJob) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">تكاليف الإنتاج</h2>
            <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">إدارة وتحليل تكاليف أوامر الإنتاج في كافة المراحل</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            className="h-14 pr-12 rounded-2xl border-none shadow-sm bg-white font-bold text-lg" 
            placeholder="ابحث برقم الأمر، اسم العميل، أو المنتج..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => {
            const jobMaterials = issuances.filter(i => i.jobOrderNo === job.orderNo);
            const jobLaborsList = jobLabors.filter(l => l.jobId === job.id);
            const jobOtherCostsList = jobOtherCosts.filter(o => o.jobId === job.id);

            const materialCost = jobMaterials.reduce((sum, m) => sum + m.total, 0);
            const laborCost = jobLaborsList.reduce((sum, l) => sum + l.total, 0);
            const otherCost = jobOtherCostsList.reduce((sum, o) => sum + o.amount, 0);
            const totalCost = materialCost + laborCost + otherCost;

            return (
              <Card 
                key={job.id} 
                className="dribbble-card border-none overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative" 
                onClick={() => setSelectedJob(job)}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg">
                      {job.orderNo}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي التكلفة</p>
                      <p className="font-black text-lg text-slate-900">{totalCost.toLocaleString()} ج.م</p>
                    </div>
                  </div>
                  <CardTitle className="font-black text-xl text-slate-900 line-clamp-1">{job.productName}</CardTitle>
                  <CardDescription className="font-bold text-primary">{job.clientName}</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">سعر البيع</p>
                      <p className="font-black text-slate-700">{(job.sellingPrice || 0).toLocaleString()} ج.م</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الربح المتوقع</p>
                      <p className={`font-black ${((job.sellingPrice || 0) - totalCost) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {((job.sellingPrice || 0) - totalCost).toLocaleString()} ج.م
                      </p>
                    </div>
                  </div>
                </CardContent>
                {/* Profit/Loss Indicator Bar */}
                <div className={`h-1.5 w-full ${((job.sellingPrice || 0) - totalCost) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const jobMaterials = issuances.filter(i => i.jobOrderNo === selectedJob.orderNo);
  const jobLaborsList = jobLabors.filter(l => l.jobId === selectedJob.id);
  const jobOtherCostsList = jobOtherCosts.filter(o => o.jobId === selectedJob.id);

  const materialCost = jobMaterials.reduce((sum, m) => sum + m.total, 0);
  const laborCost = jobLaborsList.reduce((sum, l) => sum + l.total, 0);
  const otherCost = jobOtherCostsList.reduce((sum, o) => sum + o.amount, 0);
  const totalCost = materialCost + laborCost + otherCost;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setSelectedJob(null)} className="rounded-xl font-bold">
          العودة للقائمة
        </Button>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">تحليل تكاليف أمر إنتاج: {selectedJob.orderNo}</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">{selectedJob.productName} - {selectedJob.clientName}</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <Button 
          variant={activeTab === 'summary' ? 'default' : 'ghost'} 
          className={`rounded-xl font-bold flex-1 ${activeTab === 'summary' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('summary')}
        >الملخص</Button>
        <Button 
          variant={activeTab === 'materials' ? 'default' : 'ghost'} 
          className={`rounded-xl font-bold flex-1 ${activeTab === 'materials' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('materials')}
        >الخامات</Button>
        <Button 
          variant={activeTab === 'labor' ? 'default' : 'ghost'} 
          className={`rounded-xl font-bold flex-1 ${activeTab === 'labor' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('labor')}
        >العمالة</Button>
        <Button 
          variant={activeTab === 'other' ? 'default' : 'ghost'} 
          className={`rounded-xl font-bold flex-1 ${activeTab === 'other' ? 'btn-primary' : ''}`}
          onClick={() => setActiveTab('other')}
        >تكاليف أخرى</Button>
      </div>

      <Card className="dribbble-card border-none">
        <CardContent className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-8">
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">سعر البيع</span>
                  <div className="text-2xl font-black text-slate-900 mt-2">{(selectedJob.sellingPrice || 0).toLocaleString()} ج.م</div>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">التكلفة التقديرية</span>
                  <div className="text-2xl font-black text-slate-900 mt-2">{(selectedJob.estimatedCost || 0).toLocaleString()} ج.م</div>
                </div>
                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-lg shadow-slate-900/10 relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">إجمالي التكلفة الفعلية</span>
                    <div className="text-2xl font-black text-white mt-2">{totalCost.toLocaleString()} ج.م</div>
                  </div>
                  {/* Progress Bar Background */}
                  {selectedJob.estimatedCost && selectedJob.estimatedCost > 0 && (
                    <div 
                      className={`absolute bottom-0 left-0 h-1.5 ${totalCost > selectedJob.estimatedCost ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min((totalCost / selectedJob.estimatedCost) * 100, 100)}%` }}
                    />
                  )}
                </div>
                <div className={`p-6 rounded-3xl border ${((selectedJob.sellingPrice || 0) - totalCost) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <span className={`text-sm font-black uppercase tracking-widest ${((selectedJob.sellingPrice || 0) - totalCost) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>هامش الربح</span>
                  <div className={`text-2xl font-black mt-2 ${((selectedJob.sellingPrice || 0) - totalCost) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {((selectedJob.sellingPrice || 0) - totalCost).toLocaleString()} ج.م
                  </div>
                </div>
              </div>

              {/* Variance Analysis */}
              {selectedJob.estimatedCost && selectedJob.estimatedCost > 0 ? (
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="font-black text-lg text-slate-900">تحليل الانحراف (Variance Analysis)</h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">مقارنة التكلفة الفعلية بالتكلفة التقديرية (المقايسة)</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-black text-sm ${totalCost > selectedJob.estimatedCost ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {totalCost > selectedJob.estimatedCost ? 'تجاوز التكلفة: ' : 'وفر في التكلفة: '}
                      {Math.abs(selectedJob.estimatedCost - totalCost).toLocaleString()} ج.م
                    </div>
                  </div>
                  
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full ${totalCost > selectedJob.estimatedCost ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((totalCost / selectedJob.estimatedCost) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>0 ج.م</span>
                    <span>المقايسة: {selectedJob.estimatedCost.toLocaleString()} ج.م</span>
                  </div>
                </div>
              ) : null}

              {/* Cost Breakdown by Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <span className="text-sm font-black text-blue-400 uppercase tracking-widest">تكلفة الخامات</span>
                  <div className="text-3xl font-black text-blue-600 mt-2">{materialCost.toLocaleString()} ج.م</div>
                </div>
                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">تكلفة العمالة</span>
                  <div className="text-3xl font-black text-indigo-600 mt-2">{laborCost.toLocaleString()} ج.م</div>
                </div>
                <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                  <span className="text-sm font-black text-orange-400 uppercase tracking-widest">تكاليف أخرى</span>
                  <div className="text-3xl font-black text-orange-600 mt-2">{otherCost.toLocaleString()} ج.م</div>
                </div>
              </div>

              {/* Cost Breakdown by Stage */}
              <div className="space-y-4">
                <h3 className="font-black text-lg text-slate-900">تحليل التكلفة حسب المرحلة (Cost by Stage)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {costCenters.map(center => {
                    const stageMaterial = jobMaterials.filter(m => m.costCenter === center.name).reduce((sum, m) => sum + m.total, 0);
                    const stageLabor = jobLabors.filter(l => l.jobId === selectedJob.id && l.stage === center.name).reduce((sum, l) => sum + l.total, 0);
                    const stageOther = jobOtherCosts.filter(o => o.jobId === selectedJob.id && o.stage === center.name).reduce((sum, o) => sum + o.amount, 0);
                    const stageTotal = stageMaterial + stageLabor + stageOther;

                    if (stageTotal === 0) return null;

                    return (
                      <div key={center.id} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                          <span className="font-black text-slate-900">{center.name}</span>
                          <span className="font-black text-primary">{stageTotal.toLocaleString()} ج.م</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">خامات</span>
                            <span className="font-bold text-slate-900">{stageMaterial.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">عمالة</span>
                            <span className="font-bold text-slate-900">{stageLabor.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-500">أخرى</span>
                            <span className="font-bold text-slate-900">{stageOther.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-lg text-slate-900">الخامات المنصرفة للأمر</h3>
                <Button onClick={() => setShowAddMaterial(!showAddMaterial)} className="btn-primary h-10 px-6">
                  <Plus size={16} className="ml-2" />
                  صرف خامات
                </Button>
              </div>

              {showAddMaterial && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="font-black text-slate-900">صرف خامات جديدة</h4>
                  {materialError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{materialError}</div>}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">مركز التكلفة (المرحلة)</label>
                    <select 
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white font-bold"
                      value={materialForm.costCenter}
                      onChange={e => setMaterialForm({...materialForm, costCenter: e.target.value})}
                    >
                      {costCenters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-700">الأصناف</label>
                      <Button variant="outline" size="sm" onClick={handleAddMaterialItem} className="rounded-xl border-slate-200 font-bold text-primary hover:bg-primary/5">
                        <Plus size={14} className="ml-1" />
                        إضافة صنف
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {materialForm.selectedItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-end p-4 bg-white rounded-2xl border border-slate-100 relative group">
                          {materialForm.selectedItems.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 left-2 text-slate-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => handleRemoveMaterialItem(idx)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                          <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">الصنف</label>
                            <select 
                              className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white"
                              value={item.itemId}
                              onChange={e => handleMaterialItemChange(idx, 'itemId', e.target.value)}
                            >
                              <option value="">اختر صنف...</option>
                              {items.map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.name} (المتاح: {i.currentBalance} {i.unit})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">الكمية</label>
                            <Input 
                              className="rounded-xl h-11"
                              type="number" 
                              value={item.quantity} 
                              onChange={e => handleMaterialItemChange(idx, 'quantity', Number(e.target.value))}
                              min="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleAddMaterial} className="btn-primary px-8">تأكيد الصرف</Button>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الصنف</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobMaterials.map(m => {
                    const item = items.find(i => i.id === m.itemId);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-bold">{item ? item.name : m.itemId}</TableCell>
                        <TableCell className="font-bold">{m.quantity} {m.unit}</TableCell>
                        <TableCell className="font-bold">{m.price.toLocaleString()} ج.م</TableCell>
                        <TableCell className="font-black text-primary">{m.total.toLocaleString()} ج.م</TableCell>
                      </TableRow>
                    );
                  })}
                  {jobMaterials.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">لا توجد خامات منصرفة لهذا الطلب</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'labor' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-slate-900 text-xl">سجلات العمالة</h4>
                <Button onClick={() => setShowAddLabor(true)} className="btn-primary">
                  <Plus size={18} className="ml-2" />
                  إضافة سجل
                </Button>
              </div>
              
              {showAddLabor && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">مرحلة التصنيع</label>
                      <select className="w-full h-12 rounded-xl border border-slate-200 px-3 bg-white font-bold" value={laborForm.stage} onChange={e => setLaborForm({...laborForm, stage: e.target.value})}>
                        <option value="">اختر المرحلة</option>
                        {costCenters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">الموظف</label>
                      <SearchableSelect
                        options={employeeOptions}
                        selectedValue={laborForm.employeeId}
                        onChange={(val) => setLaborForm({...laborForm, employeeId: val})}
                        placeholder="اختر الموظف..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">عدد الساعات</label>
                      <Input type="number" className="h-12 rounded-xl" value={laborForm.hours} onChange={e => setLaborForm({...laborForm, hours: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setShowAddLabor(false)} className="font-bold">إلغاء</Button>
                    <Button onClick={handleAddLabor} className="btn-primary px-8">حفظ السجل</Button>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-right font-black">المرحلة</TableHead>
                    <TableHead className="text-right font-black">الموظف</TableHead>
                    <TableHead className="text-right font-black">التاريخ</TableHead>
                    <TableHead className="text-right font-black">الساعات</TableHead>
                    <TableHead className="text-right font-black">الإجمالي</TableHead>
                    <TableHead className="text-right font-black">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobLaborsList.map(l => (
                    <TableRow key={l.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-600">{l.stage || 'غير محدد'}</TableCell>
                      <TableCell className="font-black text-slate-900">{employees.find(e => e.id === l.employeeId)?.name || 'غير معروف'}</TableCell>
                      <TableCell className="font-bold text-slate-500">{l.date}</TableCell>
                      <TableCell className="font-bold text-blue-600">{l.hours} ساعة</TableCell>
                      <TableCell className="font-black text-emerald-600">{l.total.toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLabor(l.id)} className="text-red-500 hover:bg-red-50 rounded-xl">
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobLaborsList.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400 font-bold">لا توجد سجلات عمالة</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'other' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-slate-900 text-xl">تكاليف متنوعة</h4>
                <Button onClick={() => setShowAddOther(true)} className="btn-primary">
                  <Plus size={18} className="ml-2" />
                  إضافة تكلفة
                </Button>
              </div>

              {showAddOther && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">مرحلة التصنيع</label>
                      <select className="w-full h-12 rounded-xl border border-slate-200 px-3 bg-white font-bold" value={otherForm.stage} onChange={e => setOtherForm({...otherForm, stage: e.target.value})}>
                        <option value="">اختر المرحلة</option>
                        {costCenters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">الوصف</label>
                      <Input className="h-12 rounded-xl" value={otherForm.description} onChange={e => setOtherForm({...otherForm, description: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">المبلغ</label>
                      <Input type="number" className="h-12 rounded-xl" value={otherForm.amount} onChange={e => setOtherForm({...otherForm, amount: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setShowAddOther(false)} className="font-bold">إلغاء</Button>
                    <Button onClick={handleAddOther} className="btn-primary px-8">حفظ التكلفة</Button>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-right font-black">المرحلة</TableHead>
                    <TableHead className="text-right font-black">الوصف</TableHead>
                    <TableHead className="text-right font-black">التاريخ</TableHead>
                    <TableHead className="text-right font-black">المبلغ</TableHead>
                    <TableHead className="text-right font-black">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobOtherCostsList.map(o => (
                    <TableRow key={o.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-600">{o.stage || 'غير محدد'}</TableCell>
                      <TableCell className="font-black text-slate-900">{o.description}</TableCell>
                      <TableCell className="font-bold text-slate-500">{o.date}</TableCell>
                      <TableCell className="font-black text-orange-600">{o.amount.toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteOther(o.id)} className="text-red-500 hover:bg-red-50 rounded-xl">
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobOtherCostsList.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400 font-bold">لا توجد تكاليف أخرى</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
