import React, { useState, useMemo } from 'react';
import { WoodCalculation } from './types';
import { Calculator, Trees } from 'lucide-react';
import { WOOD_TYPES } from './constants';

export const WoodCalculator = ({ onAdd }: { onAdd: (calc: WoodCalculation) => void }) => {
  const [form, setForm] = useState({
    type: 'plank' as 'plank' | 'log',
    woodType: 'beech',
    dimensionUnit: 'cm' as 'cm' | 'inch',
    thickness: '',
    width: '',
    length: '',
    girth: '',
    diameter: '',
    logMethod: 'hoppus' as 'hoppus' | 'cylinder',
    quantity: '1',
    label: '',
  });

  const computed = useMemo(() => {
    const qty = Number(form.quantity) || 0;
    const priceM3 = WOOD_TYPES[form.woodType as keyof typeof WOOD_TYPES]?.pricePerM3 || 0;
    
    let volumeM3 = 0;
    if (form.type === 'plank') {
        let thickCm = Number(form.thickness) || 0;
        let wideCm = Number(form.width) || 0;
        let len = Number(form.length) || 0;
        if (form.dimensionUnit === 'inch') {
            thickCm *= 2.54;
            wideCm *= 2.54;
        }
        volumeM3 = (thickCm / 100) * (wideCm / 100) * (len / 100) * qty;
    } else {
        const lenM = (Number(form.length) || 0) / 100;
        if (form.logMethod === 'hoppus') {
            const girthM = (Number(form.girth) || 0) / 100;
            volumeM3 = Math.pow(girthM / 4, 2) * lenM * qty;
        } else {
            const rM = ((Number(form.diameter) || 0) / 2) / 100;
            volumeM3 = Math.PI * Math.pow(rM, 2) * lenM * qty;
        }
    }
    
    return {
        volumeM3: parseFloat(volumeM3.toFixed(4)),
        totalCost: Math.round(volumeM3 * priceM3)
    };
  }, [form]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Trees size={24} className="text-emerald-600"/> حاسبة الأخشاب
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
            <select className="border rounded-xl p-3 bg-slate-50" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                <option value="plank">ألواح (Plank)</option>
                <option value="log">جذوع (Log)</option>
            </select>
            <select className="border rounded-xl p-3 bg-slate-50" value={form.woodType} onChange={e => setForm({...form, woodType: e.target.value})}>
                {Object.entries(WOOD_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
        </div>

        {form.type === 'plank' ? (
            <div className="grid grid-cols-3 gap-4">
                <input className="border rounded-xl p-3" type="number" placeholder="السُمك" value={form.thickness} onChange={e => setForm({...form, thickness: e.target.value})}/>
                <input className="border rounded-xl p-3" type="number" placeholder="العرض" value={form.width} onChange={e => setForm({...form, width: e.target.value})}/>
                <input className="border rounded-xl p-3" type="number" placeholder="الطول (سم)" value={form.length} onChange={e => setForm({...form, length: e.target.value})}/>
            </div>
        ) : (
             <div className="space-y-4">
                 <input className="w-full border rounded-xl p-3" type="number" placeholder="الطول (سم)" value={form.length} onChange={e => setForm({...form, length: e.target.value})}/>
                 <div className="grid grid-cols-2 gap-4">
                    <input className="border rounded-xl p-3" type="number" placeholder="المحيط (سم)" value={form.girth} onChange={e => setForm({...form, girth: e.target.value})}/>
                    <input className="border rounded-xl p-3" type="number" placeholder="القطر (سم)" value={form.diameter} onChange={e => setForm({...form, diameter: e.target.value})}/>
                 </div>
             </div>
        )}

        <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
            <div className='font-bold text-slate-600'>التكلفة التقديرية:</div>
            <div className='text-xl font-black text-blue-700'>{computed.totalCost.toLocaleString()} ج.م</div>
        </div>

        <button className="w-full bg-slate-900 text-white rounded-xl p-4 font-black text-lg hover:bg-slate-800" onClick={() => onAdd({
            ...form,
            id: Math.random().toString(),
            thickness: Number(form.thickness),
            width: Number(form.width),
            length: Number(form.length),
            quantity: Number(form.quantity),
            pricePerM3: WOOD_TYPES[form.woodType as keyof typeof WOOD_TYPES]?.pricePerM3 || 0,
            volumeM3: computed.volumeM3,
            weightKg: 0, // Simplified
            totalCost: computed.totalCost,
            density: 600,
            label: form.label || WOOD_TYPES[form.woodType as keyof typeof WOOD_TYPES]?.label || 'خشب'
        } as WoodCalculation)}>إضافة للحسبة</button>
    </div>
  );
};

