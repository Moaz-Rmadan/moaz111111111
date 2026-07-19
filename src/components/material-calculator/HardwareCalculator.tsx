import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { HardwareCalculation } from './types';
import { Box, DollarSign, PlusCircle, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HardwareCalculator = ({ onAdd, products }: { onAdd: (calc: HardwareCalculation) => void, products?: any[] }) => {
  const [mode, setMode] = useState<'manual' | 'automatic'>('manual');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemName, setItemName] = useState<string>('مفصلات 90 درجة');
  const [quantity, setQuantity] = useState<number>(10);
  const [pricePerUnit, setPricePerUnit] = useState<number>(25);
  
  const [calcResult, setCalcResult] = useState<HardwareCalculation | null>(null);

  const handleProductSelect = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    setSelectedProduct(product);
    if (!product) return;
    const item = product.departments.flatMap((d: any) => d.items).find((i: any) => i.name.includes('اكسسوار') || i.name.includes('مفصلة') || i.name.includes('مقبض'));
    if (item) {
        setQuantity(item.quantity);
        setItemName(item.name);
    }
  };

  useEffect(() => {
    const totalCost = quantity * pricePerUnit;
    
    setCalcResult({
      id: uuidv4(),
      itemName,
      quantity,
      pricePerUnit,
      totalCost,
      label: `اكسسوار: ${itemName} (${quantity} وحدة)`
    });
  }, [itemName, quantity, pricePerUnit]);

  const InputField = ({ label, icon: Icon, ...props }: any) => (
      <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</label>
          <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Icon size={18} className="text-slate-400" />
              </div>
              <input 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block p-3.5 pr-12 font-bold transition-all" 
                  {...props} 
              />
          </div>
      </div>
  );

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">حاسبة الإكسسوارات والخردوات</h2>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setMode('manual')} className={cn("px-6 py-2.5 rounded-xl font-black text-xs transition-all", mode === 'manual' ? "bg-white shadow-sm text-indigo-700" : "text-slate-500")}>يدوي</button>
          <button onClick={() => setMode('automatic')} className={cn("px-6 py-2.5 rounded-xl font-black text-xs transition-all", mode === 'automatic' ? "bg-white shadow-sm text-indigo-700" : "text-slate-500")}>تلقائي</button>
        </div>
      </div>

      {mode === 'automatic' && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">اختر المنتج (لجلب الخامات)</label>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900" onChange={(e) => handleProductSelect(e.target.value)}>
                <option value="">اختر المنتج...</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="اسم القطعة" icon={PenTool} type="text" placeholder="مفصلات، مقبض، مجرى درج..." value={itemName} onChange={(e: any) => setItemName(e.target.value)} />
        <InputField label="الكمية (وحدة/طقم)" icon={Box} type="number" value={quantity} onChange={(e: any) => setQuantity(Number(e.target.value))} />
        <InputField label="سعر الوحدة" icon={DollarSign} type="number" value={pricePerUnit} onChange={(e: any) => setPricePerUnit(Number(e.target.value))} />
      </div>

      {calcResult && (
        <div className="mt-8 bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-indigo-900">ملخص التكلفة</h3>
              <p className="text-3xl font-black text-indigo-700">{calcResult.totalCost.toLocaleString('ar-EG')} <span className="text-sm font-bold text-indigo-500">ج.م</span></p>
          </div>
          <button 
              onClick={() => onAdd(calcResult)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
              <PlusCircle size={20} />
              إضافة للمشروع
          </button>
        </div>
      )}
    </div>
  );
};
