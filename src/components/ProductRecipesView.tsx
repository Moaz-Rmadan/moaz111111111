import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Plus, Edit2, Trash2, X, Search, Activity, Layers, Coins, TrendingUp, FileText, Target, AlertTriangle, RotateCcw, Printer
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ResponsiveContainer, PieChart, Pie, Cell as RechartsCell, Tooltip } from 'recharts';
import type { ProductRecipe, CostCenter, Item, Purchase, RecipeItem } from '../types';

export function ProductRecipesView({ 
  recipes, 
  costCenters, 
  items: stockItems, 
  purchases = [] 
}: { 
  recipes: ProductRecipe[], 
  costCenters: CostCenter[], 
  items: Item[], 
  purchases?: Purchase[] 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<ProductRecipe | null>(null);
  const [search, setSearch] = useState('');
  const [showAnalysisRecipe, setShowAnalysisRecipe] = useState<ProductRecipe | null>(null);
  
  // Risk & Volatility Simulation States (for the Odoo structure popup)
  const [simMaterialsHike, setSimMaterialsHike] = useState<number>(0); // as percentage (e.g., 10 means +10%)
  const [simLaborHike, setSimLaborHike] = useState<number>(0); // as percentage

  const [recipeForm, setRecipeForm] = useState<Partial<ProductRecipe>>({
    name: '',
    category: 'أخرى',
    costingMethod: 'standard',
    sellingPrice: 0,
    indirectOverheadPercent: 0,
    wasteOverheadPercent: 0,
    targetMarginPercent: 20,
    departments: []
  });

  useEffect(() => {
    if (showAddForm && !editingRecipe) {
      setRecipeForm({
        name: '',
        category: 'أخرى',
        costingMethod: 'standard',
        sellingPrice: 0,
        indirectOverheadPercent: 5, // default 5% overhead
        wasteOverheadPercent: 5,     // default 5% waste
        targetMarginPercent: 25,     // default 25% target margin
        departments: costCenters.map(cc => ({
          departmentId: cc.id,
          departmentName: cc.name,
          items: [],
          totalCost: 0,
          notes: ''
        }))
      });
    }
  }, [showAddForm, editingRecipe, costCenters]);

  useEffect(() => {
    if (editingRecipe) {
      setRecipeForm({
        costingMethod: 'standard',
        sellingPrice: 0,
        indirectOverheadPercent: 0,
        wasteOverheadPercent: 0,
        targetMarginPercent: 20,
        ...editingRecipe
      });
    }
  }, [editingRecipe]);

  // Dynamic Odoo Cost Calculator
  const getLiveItemPrice = useCallback((itemName: string, method: 'standard' | 'avco' | 'latest', manualPrice: number): number => {
    if (method === 'standard') return manualPrice;

    // Find the item catalog record first
    const targetItem = stockItems.find(si => si.name && si.name.trim() === itemName.trim());
    if (!targetItem) return manualPrice;

    // Retrieve matching purchases from data store using itemId
    const itemPurchases = purchases.filter(p => p.itemId === targetItem.id) || [];
    if (itemPurchases.length === 0) {
      return targetItem.price || manualPrice;
    }

    if (method === 'avco') {
      // Odoo AVCO: Weighted Average of all purchases
      const totalCost = itemPurchases.reduce((sum, p) => sum + (p.total || (p.quantity * p.unitPrice)), 0);
      const totalQty = itemPurchases.reduce((sum, p) => sum + p.quantity, 0);
      return totalQty > 0 ? Number((totalCost / totalQty).toFixed(2)) : manualPrice;
    }

    if (method === 'latest') {
      // FIFO alternative: Latest replacement cost
      const sorted = [...itemPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted[0].unitPrice || Number((sorted[0].total / sorted[0].quantity).toFixed(2)) || manualPrice;
    }

    return manualPrice;
  }, [purchases, stockItems]);

  // Bulk Apply Dynamic Pricing to Current Form
  const handleBulkUpdatePrices = () => {
    const method = recipeForm.costingMethod || 'standard';
    if (method === 'standard') {
      alert('النموذج مبرمج على "التكلفة القياسية المعيارية". يرجى تغيير "طريقة تقييم التكلفة" إلى متوسط التكلفة (AVCO) أو آخر شراء لتفعيل التحديث التلقائي.');
      return;
    }

    const newDepts = [...(recipeForm.departments || [])].map(dept => {
      const updatedItems = dept.items.map(item => {
        const livePrice = getLiveItemPrice(item.name, method, item.unitPrice);
        return {
          ...item,
          unitPrice: livePrice,
          total: Number((item.quantity * livePrice).toFixed(2))
        };
      });

      return {
        ...dept,
        items: updatedItems,
        totalCost: updatedItems.reduce((sum, it) => sum + it.total, 0)
      };
    });

    setRecipeForm({
      ...recipeForm,
      departments: newDepts
    });
  };

  const handleAddItem = (deptIdx: number) => {
    const newDepts = [...(recipeForm.departments || [])];
    const newItem: RecipeItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      quantity: 1,
      unit: 'قطعة',
      unitPrice: 0,
      total: 0,
      type: 'material' // Default Odoo item classification: material
    };
    newDepts[deptIdx].items.push(newItem);
    setRecipeForm({ ...recipeForm, departments: newDepts });
  };

  const handleUpdateItem = (deptIdx: number, itemIdx: number, updates: Partial<RecipeItem>) => {
    const newDepts = [...(recipeForm.departments || [])];
    const item = { ...newDepts[deptIdx].items[itemIdx], ...updates };
    
    // Auto fill properties from stock database on change
    if (updates.name && !updates.unit && !updates.unitPrice) {
      const stockItem = stockItems.find(si => si.name && si.name.trim() === updates.name.trim());
      if (stockItem) {
        item.unit = stockItem.unit;
        // evaluate cost based on select method dynamically
        const method = recipeForm.costingMethod || 'standard';
        item.unitPrice = getLiveItemPrice(stockItem.name, method, stockItem.price);
        
        // Match item classification with department where possible, or default
        if (stockItem.category && (stockItem.category.includes('أجر') || stockItem.category.includes('مصنعية'))) {
          item.type = 'labor';
        } else if (stockItem.category && (stockItem.category.includes('مصاريف') || stockItem.category.includes('إهلاك'))) {
          item.type = 'overhead';
        } else {
          item.type = 'material';
        }
      }
    }

    item.total = Number((item.quantity * item.unitPrice).toFixed(2));
    newDepts[deptIdx].items[itemIdx] = item;
    
    // Recalculate department total
    newDepts[deptIdx].totalCost = newDepts[deptIdx].items.reduce((sum, it) => sum + it.total, 0);
    
    setRecipeForm({ ...recipeForm, departments: newDepts });
  };

  const handleRemoveItem = (deptIdx: number, itemIdx: number) => {
    const newDepts = [...(recipeForm.departments || [])];
    newDepts[deptIdx].items.splice(itemIdx, 1);
    newDepts[deptIdx].totalCost = newDepts[deptIdx].items.reduce((sum, it) => sum + it.total, 0);
    setRecipeForm({ ...recipeForm, departments: newDepts });
  };

  const handleSave = async () => {
    if (!recipeForm.name) return;
    const total = (recipeForm.departments || []).reduce((sum, d) => sum + Number(d.totalCost || 0), 0);
    
    const data = {
      ...recipeForm,
      totalEstimatedCost: total,
      lastUpdated: new Date().toISOString()
    };

    try {
      if (editingRecipe) {
        await updateDoc(doc(db, 'productRecipes', editingRecipe.id), data);
      } else {
        await addDoc(collection(db, 'productRecipes'), data);
      }
      setShowAddForm(false);
      setEditingRecipe(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النموذج؟')) return;
    try {
      await deleteDoc(doc(db, 'productRecipes', id));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase()));

  // ----------------------------------------------------
  // Odoo cost breakdown aggregator
  // ----------------------------------------------------
  const getRecipeCostStructure = (recipe: ProductRecipe) => {
    let rawMaterialsCost = 0;
    let laborCost = 0;
    let lineOverheadCost = 0;

    (recipe.departments || []).forEach(dept => {
      (dept.items || []).forEach(item => {
        const type = item.type || 'material';
        if (type === 'material') {
          rawMaterialsCost += item.total || 0;
        } else if (type === 'labor') {
          laborCost += item.total || 0;
        } else if (type === 'overhead') {
          lineOverheadCost += item.total || 0;
        }
      });
    });

    const wasteRate = recipe.wasteOverheadPercent || 0;
    const wasteValue = rawMaterialsCost * (wasteRate / 100);
    const materialsWithWaste = rawMaterialsCost + wasteValue;

    const directCost = materialsWithWaste + laborCost + lineOverheadCost;
    
    const indirectRate = recipe.indirectOverheadPercent || 0;
    const indirectOverheadValue = directCost * (indirectRate / 100);

    const totalCalculatedCost = directCost + indirectOverheadValue;

    const sellingPrice = recipe.sellingPrice || 0;
    const netProfit = sellingPrice - totalCalculatedCost;
    const grossMarginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
    
    const suggestedPriceAtTarget = recipe.targetMarginPercent && recipe.targetMarginPercent < 100 
      ? totalCalculatedCost / (1 - (recipe.targetMarginPercent / 100))
      : totalCalculatedCost * 1.25;

    return {
      rawMaterialsCost,
      wasteValue,
      materialsWithWaste,
      laborCost,
      lineOverheadCost,
      directCost,
      indirectOverheadValue,
      totalCalculatedCost,
      sellingPrice,
      netProfit,
      grossMarginPercent,
      suggestedPriceAtTarget
    };
  };

  // Aggregated Costing Stats for the Odoo Panel Header
  const costingStats = useMemo(() => {
    if (recipes.length === 0) return { totalBOMs: 0, avgCost: 0, avgMargin: 0, avcoCount: 0 };
    
    let totalCalculated = 0;
    let totalMargins = 0;
    let pricedRecipesCount = 0;
    let avcoCount = 0;

    recipes.forEach(r => {
      const struct = getRecipeCostStructure(r);
      totalCalculated += struct.totalCalculatedCost;
      if (struct.sellingPrice > 0) {
        totalMargins += struct.grossMarginPercent;
        pricedRecipesCount++;
      }
      if (r.costingMethod === 'avco') {
        avcoCount++;
      }
    });

    return {
      totalBOMs: recipes.length,
      avgCost: Number((totalCalculated / recipes.length).toFixed(0)),
      avgMargin: pricedRecipesCount > 0 ? Number((totalMargins / pricedRecipesCount).toFixed(1)) : 0,
      avcoCount
    };
  }, [recipes]);

  // Handle printing of Cost Sheet
  const handlePrintCostSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 leading-none">نماذج وهيكلية التكاليف دقيقة التفاصيل</h2>
          <p className="text-slate-500 mt-2 font-bold text-lg text-right">تحليل مباشر وتكامل أسعار الخام، الأجور، والتكاليف غير المباشرة كبرنامج Odoo ERP</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="بحث في النماذج..." 
              className="pr-10 h-12 rounded-xl border-slate-200 text-right font-bold text-sm" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowAddForm(true)} className="btn-primary h-12 px-6 rounded-xl font-bold">
            <Plus size={20} className="ml-2" />
            تجديد مكونات BoM / التكلفة
          </Button>
        </div>
      </div>

      {/* Embedded KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
        <Card className="rounded-[1.5rem] border-none shadow-md bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black">نماذج BoM النشطة</p>
              <h3 className="text-2xl font-black text-slate-950 font-mono mt-1">{costingStats.totalBOMs} <span className="text-xs text-slate-500 font-sans">بطاقة</span></h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-md bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Coins size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black">متوسط تكلفة الإنتاج</p>
              <h3 className="text-2xl font-black text-blue-600 font-mono mt-1">{costingStats.avgCost.toLocaleString()} <span className="text-xs font-sans">ج.م</span></h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-md bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black">هامش الربح المتوقع</p>
              <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">%{costingStats.avgMargin}</h3>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-md bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-black">طريقة AVCO النشطة</p>
              <h3 className="text-2xl font-black text-orange-600 font-mono mt-1">{costingStats.avcoCount} <span className="text-xs text-slate-500 font-sans">بطاقات مدمجة</span></h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
        {filtered.map(recipe => {
          const stats = getRecipeCostStructure(recipe);
          return (
            <Card key={recipe.id} className="dribbble-card border-none hover:shadow-2xl transition-all group overflow-hidden flex flex-col justify-between">
              
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[11px] px-3 py-1 rounded-lg">
                    {recipe.category}
                  </Badge>
                  
                  {/* Valuation Method badge */}
                  <div className="flex items-center gap-1.5">
                    {recipe.costingMethod === 'avco' ? (
                      <Badge className="bg-blue-50 text-blue-600 border border-blue-100 font-black text-[9px] px-2 py-0.5 rounded-md">
                        متوسط (AVCO)
                      </Badge>
                    ) : recipe.costingMethod === 'latest' ? (
                      <Badge className="bg-violet-50 text-violet-600 border border-violet-100 font-black text-[9px] px-2 py-0.5 rounded-md">
                        آخر شراء (FIFO)
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-150 text-slate-600 border border-slate-200 font-black text-[9px] px-2 py-0.5 rounded-md">
                        معياري (Standard)
                      </Badge>
                    )}

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => setEditingRecipe(recipe)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50">
                        <Edit2 size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(recipe.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </div>

                <CardTitle className="text-2xl font-black text-slate-900">{recipe.name}</CardTitle>
                
                <CardDescription>
                  <div className="mt-2 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center justify-between text-base">
                      <span className="text-slate-500 font-medium text-sm">التكلفة المحسوبة:</span>
                      <span className="font-mono text-primary font-black">{stats.totalCalculatedCost.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                    </div>
                    {stats.sellingPrice > 0 ? (
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">سعر البيع المقترح:</span>
                        <span className="text-slate-700 font-mono">{stats.sellingPrice.toLocaleString()} ج.م</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">سعر البيع غير محدد</div>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 flex-1">
                {/* Visual margin feedback */}
                {stats.sellingPrice > 0 && (
                  <div className="mb-4 p-3 rounded-2xl bg-slate-50 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-500">العائد وهامش الربح المتوقع</span>
                    <Badge className={stats.grossMarginPercent > 15 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"}>
                      {stats.netProfit > 0 ? `صافي الربح +${stats.netProfit.toLocaleString(undefined, {maximumFractionDigits:0})} (${stats.grossMarginPercent.toFixed(1)}%)` : `خسارة مقدرة ${stats.netProfit.toLocaleString(undefined, {maximumFractionDigits:0})}`}
                    </Badge>
                  </div>
                )}

                <div className="space-y-3">
                  {recipe.departments.filter(d => (d.items?.length || 0) > 0 || (d.totalCost || 0) > 0).map((dept, i) => (
                    <div key={i} className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 group/item hover:bg-white hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-black text-slate-900 py-0.5 px-2 bg-white rounded-md shadow-sm border border-slate-150">{dept.departmentName}</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{dept.totalCost.toLocaleString()} ج.م</span>
                      </div>
                      <div className="space-y-1">
                        {dept.items.slice(0, 2).map((item, idx) => {
                          const isLabor = item.type === 'labor';
                          const isOverhead = item.type === 'overhead';
                          return (
                            <div key={idx} className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                              <span>
                                <span className={isLabor ? "text-blue-600" : isOverhead ? "text-violet-600" : "text-amber-600"}>
                                  ● {item.name}{' '}
                                </span>
                                <small className="text-slate-400 font-normal">({item.quantity} {item.unit})</small>
                              </span>
                              <span className="text-slate-600 font-mono">{item.total.toLocaleString()}</span>
                            </div>
                          );
                        })}
                        {dept.items.length > 2 && (
                          <div className="text-[9px] text-primary font-black pt-0.5">+{dept.items.length - 2} بنود أخرى تحت القسم...</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="bg-slate-50/30 p-4 border-t border-slate-100 flex items-center justify-between">
                <Button 
                  onClick={() => {
                    setShowAnalysisRecipe(recipe);
                    setSimMaterialsHike(0);
                    setSimLaborHike(0);
                  }}
                  variant="outline" 
                  className="w-full text-xs font-black py-2 rounded-xl flex items-center justify-center gap-2 border-slate-200 hover:border-primary hover:text-primary transition-all"
                >
                  <Activity size={14} />
                  تحليل هيكل التكلفة (Odoo Real Analysis)
                </Button>
              </CardFooter>

            </Card>
          );
        })}
      </div>

      {/* Editor Modal (Add/Edit) */}
      {(showAddForm || editingRecipe) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-auto" dir="rtl">
          <Card className="dribbble-card w-full max-w-5xl max-h-[92vh] overflow-hidden my-8 border-none shadow-2xl flex flex-col">
            
            <CardHeader className="bg-white z-20 border-b border-slate-100 pb-5 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                      {editingRecipe ? 'تحرير بطاقة تكلفة وتركيب تصنيعي BoM' : 'إنشاء بطاقة تكلفة وتركيب تصنيعي BoM جديد'}
                    </CardTitle>
                    <Badge className="bg-primary/10 text-primary uppercase font-bold text-[9px] tracking-widest px-2.5 py-0.5 rounded-md">ERP cost sheet</Badge>
                  </div>
                  <CardDescription className="font-bold text-sm text-slate-500 mt-1">تحديد الخامات، أتعاب الفنيين، ونسب الهالك والتطوير الصناعي العام على مستوى المنتج</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddForm(false); setEditingRecipe(null); }} className="rounded-xl h-10 w-10 hover:bg-slate-100 transition-colors">
                  <X size={22} className="text-slate-400" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-6 p-6 bg-slate-50/20">
              {/* Product meta & Odoo costing parameters */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <h4 className="font-black text-lg text-slate-800 border-b border-slate-50 pb-2">تفاصيل وهوية المنتج الفنية</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      اسم الموديل / المنتج المعتمد
                    </label>
                    <Input 
                      placeholder="مثل: غرفة نوم ملكي، طقم صالون..." 
                      className="h-11 rounded-xl bg-slate-50/50 border-slate-150 font-black text-sm text-right focus:bg-white" 
                      value={recipeForm.name}
                      onChange={e => setRecipeForm({...recipeForm, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      التصنيف الأساسي
                    </label>
                    <select 
                      className="w-full h-11 rounded-xl border border-slate-150 bg-slate-50/50 px-3 font-bold text-sm text-right focus:bg-white outline-none"
                      value={recipeForm.category}
                      onChange={e => setRecipeForm({...recipeForm, category: e.target.value as any})}
                    >
                      <option value="نوم">غرف نوم</option>
                      <option value="سفرة">غرف سفرة</option>
                      <option value="انتريه">انتريه وصالون</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      طريقة تحديد تكلفة البنود (طراز Odoo)
                    </label>
                    <select 
                      className="w-full h-11 rounded-xl border border-slate-150 bg-slate-50/50 px-3 font-bold text-sm text-right focus:bg-white outline-none"
                      value={recipeForm.costingMethod}
                      onChange={e => setRecipeForm({...recipeForm, costingMethod: e.target.value as any})}
                    >
                      <option value="standard">التكلفة القياسية المعيارية (يدوي بالبطاقة)</option>
                      <option value="avco">متوسط التكلفة المتحرك للمشتريات (Live AVCO)</option>
                      <option value="latest">آخر سعر شراء إحلالي (FIFO/Replacement Market)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">سعر البيع الافتراضي (ج.م)</label>
                    <Input 
                      type="number"
                      className="h-11 rounded-xl bg-slate-50/50 text-right font-mono font-bold"
                      value={recipeForm.sellingPrice || ''}
                      placeholder="0"
                      onChange={e => setRecipeForm({...recipeForm, sellingPrice: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">نسبة التكاليف الإضافية غير المباشرة %</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        className="h-11 rounded-xl bg-slate-50/50 text-left font-mono font-bold pl-8"
                        value={recipeForm.indirectOverheadPercent || ''}
                        placeholder="0"
                        onChange={e => setRecipeForm({...recipeForm, indirectOverheadPercent: Number(e.target.value)})}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">نسبة هالك الخامات المسموح بها %</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        className="h-11 rounded-xl bg-slate-50/50 text-left font-mono font-bold pl-8"
                        value={recipeForm.wasteOverheadPercent || ''}
                        placeholder="0"
                        onChange={e => setRecipeForm({...recipeForm, wasteOverheadPercent: Number(e.target.value)})}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">نسبة هامش الربح المستهدف %</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        className="h-11 rounded-xl bg-slate-50/50 text-left font-mono font-bold pl-8"
                        value={recipeForm.targetMarginPercent || ''}
                        placeholder="0"
                        onChange={e => setRecipeForm({...recipeForm, targetMarginPercent: Number(e.target.value)})}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2 border-t border-slate-50 flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[11px] text-slate-500 font-bold max-w-xl">
                    💡 <span className="text-primary font-black">أتمتة Odoo ERP:</span> عند اختيار متوسط التكلفة AVCO أو آخر شراء، يمكنك جلب الأسعار الحقيقية المحدثة فوراً لجميع مدخلات البطاقة من سجل فواتير المشتريات المعتمدة عبر الضغط على الزر المقابل.
                  </div>
                  {(recipeForm.costingMethod === 'avco' || recipeForm.costingMethod === 'latest') && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleBulkUpdatePrices} 
                      className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 font-black text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 self-end"
                    >
                      <RotateCcw size={14} />
                      تحديث أسعار الخامات والمصنعيات تلقائياً
                    </Button>
                  )}
                </div>
              </div>

              {/* Department Bill of Materials sections */}
              <div className="space-y-6">
                {recipeForm.departments?.map((dept, deptIdx) => (
                  <div key={deptIdx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-sm">
                          {deptIdx + 1}
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-slate-900">{dept.departmentName}</h3>
                          <p className="text-slate-400 text-xs font-bold">المواد الخام والعمليات المعينة للقسم</p>
                        </div>
                      </div>
                      <div className="flex items-end gap-1 font-mono text-primary font-black">
                        <span className="text-xs text-slate-400 font-sans font-bold">تكلفة القسم المبدئية:</span>
                        <span>{(dept.totalCost || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-sans opacity-70">ج.م</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Columns Headers */}
                      <div className="grid grid-cols-12 gap-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:grid">
                        <div className="col-span-4 text-right">البند (خامة / مصنعية)</div>
                        <div className="col-span-2 text-center">التصنيف الوظيفي لـ Odoo</div>
                        <div className="col-span-2 text-center">الكمية</div>
                        <div className="col-span-2 text-center">سعر الوحدة</div>
                        <div className="col-span-1 text-center font-bold">الإجمالي</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Line Rows */}
                      <div className="space-y-2">
                        {dept.items.map((item, itemIdx) => (
                          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/20 transition-all items-center">
                            
                            {/* Input Item name & Suggestion */}
                            <div className="col-span-4">
                              <label className="text-[9px] font-black text-slate-400 sm:hidden">البند</label>
                              <div className="relative">
                                <Input 
                                  placeholder="ابحث في الخامات أو اكتب اسماً حراً..."
                                  list={`items-list-${deptIdx}-${itemIdx}`}
                                  className="h-10 rounded-lg border-slate-200 bg-white font-bold text-sm text-right"
                                  value={item.name}
                                  onChange={e => handleUpdateItem(deptIdx, itemIdx, { name: e.target.value })}
                                />
                                <datalist id={`items-list-${deptIdx}-${itemIdx}`}>
                                  {stockItems.map(si => <option key={si.id} value={si.name} />)}
                                </datalist>
                              </div>
                            </div>

                            {/* Classification Type (Material vs Labor vs Overhead) */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 sm:hidden">التصنيف الوظيفي</label>
                              <select 
                                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-2 font-bold text-xs text-right outline-none"
                                value={item.type || 'material'}
                                onChange={e => handleUpdateItem(deptIdx, itemIdx, { type: e.target.value as any })}
                              >
                                <option value="material">خامة / خامات أولية</option>
                                <option value="labor">أجور فنيين ومصنعيات</option>
                                <option value="overhead">خط إنتاج / استهلاك وإضافي</option>
                              </select>
                            </div>

                            {/* Quantity */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 sm:hidden">الكمية</label>
                              <div className="flex items-center gap-1">
                                <Input 
                                  type="number"
                                  className="h-10 rounded-lg border-slate-200 bg-white font-black text-center"
                                  value={item.quantity}
                                  onChange={e => handleUpdateItem(deptIdx, itemIdx, { quantity: Number(e.target.value) })}
                                />
                                <span className="text-[10px] font-bold text-slate-400">{item.unit || 'قطعة'}</span>
                              </div>
                            </div>

                            {/* Unit Price */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 sm:hidden">سعر الوحدة</label>
                              <Input 
                                type="number"
                                className="h-10 rounded-lg border-slate-200 bg-white font-black text-center"
                                value={item.unitPrice}
                                onChange={e => handleUpdateItem(deptIdx, itemIdx, { unitPrice: Number(e.target.value) })}
                              />
                            </div>

                            {/* Total calculated price */}
                            <div className="col-span-1 flex items-center justify-center font-black text-slate-900 bg-slate-50 h-10 rounded-lg text-xs font-mono">
                              {item.total.toLocaleString()}
                            </div>

                            {/* Remove button */}
                            <div className="col-span-1 flex items-center justify-center">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(deptIdx, itemIdx)} className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Item Button */}
                      <Button 
                        variant="outline" 
                        className="w-full h-11 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all font-bold text-xs"
                        onClick={() => handleAddItem(deptIdx)}
                      >
                        <Plus size={16} className="ml-1" />
                        إضافة مادة أو أجر مصنعية لـ {dept.departmentName}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            
            {/* Modal Bottom control bar */}
            <div className="shrink-0 p-6 bg-slate-900 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Formula calculations displayed elegantly */}
              {(() => {
                const totalDeptsPrice = (recipeForm.departments || []).reduce((sum, d) => sum + Number(d.totalCost || 0), 0);
                
                // material cost
                let matSub = 0;
                let labSub = 0;
                let overSub = 0;
                (recipeForm.departments || []).forEach(d => {
                  (d.items || []).forEach(i => {
                    const ty = i.type || 'material';
                    if (ty === 'material') matSub += i.total;
                    else if (ty === 'labor') labSub += i.total;
                    else if (ty === 'overhead') overSub += i.total;
                  });
                });

                const matWasteCost = matSub * ((recipeForm.wasteOverheadPercent || 0) / 100);
                const baseDirectSum = matSub + matWasteCost + labSub + overSub;
                const indirectAllocation = baseDirectSum * ((recipeForm.indirectOverheadPercent || 0) / 100);
                const finalEstimateTotal = baseDirectSum + indirectAllocation;

                const targetMargin = recipeForm.targetMarginPercent || 0;
                const computedSuggestedPrice = targetMargin < 100 
                  ? finalEstimateTotal / (1 - (targetMargin / 100))
                  : finalEstimateTotal * 1.25;

                return (
                  <div className="text-right text-white space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-400 font-bold">التكلفة المحملة الإجمالية المقدرة:</span>
                      <span className="text-4xl font-black text-white font-mono tracking-tighter">
                        {finalEstimateTotal.toLocaleString(undefined, {maximumFractionDigits: 1})}
                      </span>
                      <span className="text-sm text-slate-400">ج.م</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-bold flex flex-wrap gap-x-4">
                      <span>الخامات: {matSub.toLocaleString()} ج.م {matWasteCost > 0 && `(+${matWasteCost.toLocaleString()} هالك)`}</span>
                      <span>الأجور: {labSub.toLocaleString()} ج.م</span>
                      <span>التكاليف غير المباشرة المضافة: {indirectAllocation.toLocaleString()} ج.م</span>
                    </div>
                    {targetMargin > 0 && (
                      <div className="text-indigo-400 text-xs font-black">
                        🎯 السعر البيعي الموصى به لتحقيق (%{targetMargin} هامش): {computedSuggestedPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ج.م
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3 w-full md:w-auto">
                <Button 
                  variant="ghost" 
                  className="flex-1 md:flex-none h-12 px-8 rounded-xl font-bold text-white hover:bg-white/10 text-sm transition-all" 
                  onClick={() => { setShowAddForm(false); setEditingRecipe(null); }}
                >إلغاء</Button>
                
                <Button 
                  className="flex-1 md:flex-none btn-primary h-12 px-10 rounded-xl text-sm font-black shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all bg-primary border-none" 
                  onClick={handleSave}
                >حفظ وتطبيق نموذج التكاليف</Button>
              </div>
            </div>

          </Card>
        </div>
      )}

      {/* advanced "Cost Structure Analysis" Sheet modal */}
      {showAnalysisRecipe && (() => {
        const stats = getRecipeCostStructure(showAnalysisRecipe);
        
        // Compute simulation state adjusted results
        const rawMaterialsSim = stats.rawMaterialsCost * (1 + simMaterialsHike / 100);
        const wasteSim = rawMaterialsSim * ((showAnalysisRecipe.wasteOverheadPercent || 0) / 100);
        const laborSim = stats.laborCost * (1 + simLaborHike / 100);
        const overheadsSim = stats.lineOverheadCost;
        const directCostSim = rawMaterialsSim + wasteSim + laborSim + overheadsSim;
        const indirectValueSim = directCostSim * ((showAnalysisRecipe.indirectOverheadPercent || 0) / 100);
        const finalCostSim = directCostSim + indirectValueSim;

        const manualSellingPrice = stats.sellingPrice;
        const simNetProfit = manualSellingPrice - finalCostSim;
        const simMarginPercent = manualSellingPrice > 0 ? (simNetProfit / manualSellingPrice) * 100 : 0;

        // data for dynamic Odoo Recharts representation
        const chartData = [
          { name: 'خامات الخامات المباشرة', value: rawMaterialsSim, color: '#F59E0B' },
          { name: 'تكلفة هالك الخامات المقدر', value: wasteSim, color: '#EF4444' },
          { name: 'أجور تشغيل ومصنعيات', value: laborSim, color: '#3B82F6' },
          { name: 'مصاريف خطوط العمل', value: overheadsSim, color: '#8B5CF6' },
          { name: 'التكاليف العامة المستقطعة', value: indirectValueSim, color: '#10B981' }
        ].filter(v => v.value > 0);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-auto" dir="rtl">
            <Card className="dribbble-card w-full max-w-5xl max-h-[92vh] overflow-hidden my-8 border-none shadow-2xl flex flex-col print-container">
              
              <CardHeader className="bg-white border-b border-slate-100 pb-5 shrink-0 hidden-on-print">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FileText size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-900">
                        كشف تحليل هيكل التكاليف المعتمد | Odoo Cost Structure
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-bold text-xs mt-1">
                        بطاقة تحليل معيارية تحاكي عناصر تكلفة المنتج والأقسام وهوامش الربح الحقيقية
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handlePrintCostSheet} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs gap-1.5 h-10 px-4 rounded-lg">
                      <Printer size={15} />
                      طبع الكشف
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowAnalysisRecipe(null)} className="rounded-xl h-10 w-10 hover:bg-slate-100 transition-colors">
                      <X size={20} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-6 p-6 md:p-8 bg-white" id="print-area">
                
                {/* Print Only Header Info */}
                <div className="hidden print-header-active text-center pb-8 border-b-2 border-slate-800 space-y-2 mb-6">
                  <h1 className="text-3xl font-black text-slate-950">لوجستيات وتكاليف الأثاث الفاخر المتميزة</h1>
                  <p className="text-xs text-slate-500 font-bold">نظام تخطيط موارد التصنيع والتحليل الهيكلي</p>
                  <p className="text-sm font-black text-indigo-700">تقرير تقييم وهيكل تكلفة تصنيع المنتج: {showAnalysisRecipe.name}</p>
                  <div className="grid grid-cols-2 text-right text-xs text-slate-600 max-w-lg mx-auto pt-2 border-t border-slate-100">
                    <div><strong>تاريخ الاستخراج:</strong> {new Date().toLocaleDateString('ar-EG')}</div>
                    <div><strong>طريقة التقييم:</strong> {showAnalysisRecipe.costingMethod === 'avco' ? 'متوسط التكلفة AVCO' : showAnalysisRecipe.costingMethod === 'latest' ? 'آخر شراء' : 'التكلفة القياسية'}</div>
                  </div>
                </div>

                {/* Main Product Title for both views */}
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase mb-1">{showAnalysisRecipe.category}</Badge>
                    <h3 className="text-3xl font-black text-slate-900 leading-none">{showAnalysisRecipe.name}</h3>
                    <p className="text-slate-500 text-xs font-bold mt-2">
                      طريقة التسعير الحالية بالـ BoM: {' '}
                      <span className="text-indigo-600 font-black">
                        {showAnalysisRecipe.costingMethod === 'avco' ? 'متوسط تكلفة المشتريات المتحرك (AVCO)' : showAnalysisRecipe.costingMethod === 'latest' ? 'آخر تكلفة شراء للوحدة (FIFO)' : 'التكلفة المعيارية الثابتة'}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي التكلفة الكلية المجمعة</span>
                    <span className="text-4xl font-black text-primary font-mono select-all">
                      {finalCostSim.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-sm font-sans font-bold">ج.م</span>
                    </span>
                    {(simMaterialsHike !== 0 || simLaborHike !== 0) && (
                      <span className="text-[10px] font-extrabold text-red-500 block mt-1">
                        (محاكاة تغير الأسعار مفعلة بالتقرير)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Odoo Cost Breakdown & Margins Table - Col 7 */}
                  <div className="lg:col-span-7 space-y-6">
                    <Card className="rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 bg-white">
                      <h4 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-2">تحليل المكونات الصناعية والتحميل الإضافي</h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-medium">تكلفة المواد الخام المباشرة:</span>
                          <span className="font-mono font-bold text-slate-800">{rawMaterialsSim.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                        </div>

                        {showAnalysisRecipe.wasteOverheadPercent !== undefined && showAnalysisRecipe.wasteOverheadPercent > 0 && (
                          <div className="flex justify-between items-center text-xs text-amber-600 bg-amber-50/50 p-2 rounded-xl">
                            <span>نسبة الهالك الصناعي المعتمد (% {showAnalysisRecipe.wasteOverheadPercent}):</span>
                            <span className="font-mono font-bold">+{wasteSim.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-2">
                          <span className="text-slate-500 font-medium">إجمالي كلفة المواد (مع الهالك):</span>
                          <span className="font-mono font-extrabold text-slate-900">{ (rawMaterialsSim + wasteSim).toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                        </div>

                        <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-2">
                          <span className="text-slate-500 font-medium font-bold text-blue-600">أجور المصنعيات للفنيين والعمالة:</span>
                          <span className="font-mono font-extrabold text-blue-600">{laborSim.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                        </div>

                        {stats.lineOverheadCost > 0 && (
                          <div className="flex justify-between items-center text-sm text-violet-600">
                            <span>مصاريف واستهلاك ماكينات خطوط العمل:</span>
                            <span className="font-mono font-bold">{overheadsSim.toLocaleString()} ج.م</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-base font-black border-t-2 border-slate-100 pt-3 text-slate-900">
                          <span>إجمالي التكلفة المباشرة للنموذج:</span>
                          <span className="font-mono text-lg">{directCostSim.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                        </div>

                        {showAnalysisRecipe.indirectOverheadPercent !== undefined && showAnalysisRecipe.indirectOverheadPercent > 0 && (
                          <div className="flex justify-between items-center text-xs text-emerald-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/30">
                            <span>التكاليف غير المباشرة (% {showAnalysisRecipe.indirectOverheadPercent} مثل الإيجار ومصاريف الكهرباء):</span>
                            <span className="font-mono font-bold">+{indirectValueSim.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-lg font-black bg-indigo-50/30 text-indigo-950 p-3 rounded-2xl border border-indigo-100/50">
                          <span>التكلفة النهائية الكلية (Landed Cost):</span>
                          <span className="font-mono text-xl">{finalCostSim.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                        </div>
                      </div>
                    </Card>

                    {/* Sales Pricing Analysis Block */}
                    <Card className="rounded-2xl border border-orange-100 p-5 bg-gradient-to-br from-orange-50/20 to-indigo-50/20 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Target className="text-orange-500" size={18} />
                        <h4 className="font-black text-sm text-slate-900">هيكل تسعير المبيعات وتقييم هامش الربح</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-100 text-center space-y-1">
                          <span className="text-[10px] font-black text-slate-400">سعر البيع الافتراضي بالبطاقة</span>
                          <div className="text-xl font-black text-slate-900 font-mono">
                            {manualSellingPrice > 0 ? `${manualSellingPrice.toLocaleString()} ج.م` : 'غير محدد'}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-100 text-center space-y-1">
                          <span className="text-[10px] font-black text-slate-400">سعر بيع موصى به ({showAnalysisRecipe.targetMarginPercent || 25}% هامش)</span>
                          <div className="text-xl font-black text-indigo-600 font-mono">
                            {stats.suggestedPriceAtTarget.toLocaleString(undefined, {maximumFractionDigits: 0})} ج.م
                          </div>
                        </div>
                      </div>

                      {manualSellingPrice > 0 ? (
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black text-slate-400 block mb-0.5">هامش الربح المتوقع للفاتورة</span>
                            <span className="text-lg font-black text-slate-800 font-mono">
                              {simNetProfit.toLocaleString(undefined, {maximumFractionDigits:0})} ج.م
                            </span>
                          </div>
                          
                          <div className="text-left">
                            <span className="text-xs font-black text-slate-400 block mb-0.5">نسبة هامش الربح</span>
                            <span className={`text-xl font-black font-mono ${simMarginPercent > 12 ? "text-emerald-600" : "text-amber-600"}`}>
                              {simMarginPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic text-center py-2">يرجى تحديد "سعر البيع الافتراضي" ضمن تعديل النموذج لاستعراض هامش الربح ومعدل تغطية التكاليف بدقة.</p>
                      )}
                    </Card>
                  </div>

                  {/* Right Side Visual Analytics - Chart & Volatility Simulator - Col 5 */}
                  <div className="lg:col-span-5 space-y-6 hidden-on-print">
                    
                    {/* Visual Donut Chart */}
                    <Card className="rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 bg-white">
                      <h4 className="font-black text-sm text-slate-950 text-right">مخطط توزيع أعباء التكاليف</h4>
                      <div className="h-44 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <RechartsCell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => `${v.toLocaleString()} ج.م`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                        {chartData.map((d, index) => (
                          <div key={index} className="flex items-center gap-1.5 text-slate-600">
                            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
                            <span>{d.name} ({((d.value / finalCostSim) * 105).toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Volatility & Risk Simulator (What-If analysis) */}
                    <Card className="rounded-2xl border border-red-100 p-5 shadow-sm space-y-4 bg-gradient-to-b from-white to-red-50/10">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="text-red-500" size={16} />
                        <h4 className="font-black text-sm text-slate-900">محاكاة مخاطر تغير الأسعار وعوامل تضخم السوق</h4>
                      </div>
                      <p className="text-slate-400 text-xs font-bold leading-relaxed">
                        قم بسحب المؤشرات لمحاكاة تضخم بالبلاد أو تقلب الأسعار وتأثيره الحي ومباشر على النسبة وصافي الأرباح:
                      </p>

                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-slate-705">
                            <span>تغير تكلفة الخامات المستعلمة:</span>
                            <span className="text-amber-600 font-black">%{simMaterialsHike > 0 ? `+${simMaterialsHike}` : simMaterialsHike}</span>
                          </div>
                          <input 
                            type="range" 
                            min="-25" 
                            max="75" 
                            step="5"
                            className="w-full cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none accent-amber-500"
                            value={simMaterialsHike}
                            onChange={(e) => setSimMaterialsHike(Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-slate-705">
                            <span>تضخم وزيادة أجور العمالة الصافية:</span>
                            <span className="text-blue-600 font-black">%{simLaborHike > 0 ? `+${simLaborHike}` : simLaborHike}</span>
                          </div>
                          <input 
                            type="range" 
                            min="-20" 
                            max="60" 
                            step="5"
                            className="w-full cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none accent-blue-600"
                            value={simLaborHike}
                            onChange={(e) => setSimLaborHike(Number(e.target.value))}
                          />
                        </div>

                        {(simMaterialsHike !== 0 || simLaborHike !== 0) && (
                          <Button 
                            variant="ghost" 
                            onClick={() => { setSimMaterialsHike(0); setSimLaborHike(0); }} 
                            className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 rounded-lg py-1 px-3 mt-1 h-7 font-black"
                          >
                            إلغاء المحاكاة وعودة للواقع
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>

                </div>

                {/* Print Line Items Table (Odoo PDF styled) */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="font-black text-sm text-slate-900 leading-none">تفاصيل كافة البنود من أقسام التصنيع والمصنعيات</h4>
                  
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-right font-black text-slate-800 font-bold text-xs">القسم / المرحلة</TableHead>
                          <TableHead className="text-right font-black text-slate-800 font-bold text-xs">البند والمواصفة</TableHead>
                          <TableHead className="text-right font-black text-slate-800 font-bold text-xs">النوع ERP</TableHead>
                          <TableHead className="text-center font-black text-slate-800 font-bold text-xs">الكمية معينة</TableHead>
                          <TableHead className="text-center font-black text-slate-800 font-bold text-xs">سعر الوحدة</TableHead>
                          <TableHead className="text-center font-black text-slate-800 font-bold text-xs">الإجمالي المبدئي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(showAnalysisRecipe.departments || []).map((dept) => 
                          (dept.items || []).map((item, itemIdx) => {
                            const isLabor = item.type === 'labor';
                            const isOverhead = item.type === 'overhead';
                            
                            // Calculate simulating cost
                            let simPrice = item.unitPrice;
                            if (item.type === 'material' || !item.type) {
                              simPrice = item.unitPrice * (1 + simMaterialsHike / 100);
                            } else if (item.type === 'labor') {
                              simPrice = item.unitPrice * (1 + simLaborHike / 100);
                            }
                            const simTotal = item.quantity * simPrice;

                            return (
                              <TableRow key={`${dept.departmentId}-${item.id}-${itemIdx}`} className="hover:bg-slate-50/50">
                                <TableCell className="font-bold text-slate-900 text-xs">{dept.departmentName}</TableCell>
                                <TableCell className="font-bold text-slate-700 text-xs">{item.name}</TableCell>
                                <TableCell className="text-xs">
                                  {isLabor ? (
                                    <span className="text-blue-600 font-black">أجر تشغيل</span>
                                  ) : isOverhead ? (
                                    <span className="text-violet-600 font-black">إضافي وهندسة</span>
                                  ) : (
                                    <span className="text-amber-600 font-black">مادة أولية</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs text-slate-800 font-bold">{item.quantity} {item.unit}</TableCell>
                                <TableCell className="text-center font-mono text-xs text-slate-800 font-bold">{simPrice.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</TableCell>
                                <TableCell className="text-center font-mono text-xs text-slate-950 font-black bg-slate-50/30">{simTotal.toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        );
      })()}

    </div>
  );
}
