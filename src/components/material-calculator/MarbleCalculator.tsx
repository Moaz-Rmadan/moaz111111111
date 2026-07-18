import React, { useState, useEffect } from 'react';
import { MarbleCalculation } from './types';
import { v4 as uuidv4 } from 'uuid';

export const MarbleCalculator = ({ onAdd }: { onAdd: (calc: MarbleCalculation) => void }) => {
  const [type, setType] = useState<'slab' | 'linear'>('slab');
  const [stoneType, setStoneType] = useState('');
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [thicknessCm, setThicknessCm] = useState(2);
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [cuttingRate, setCuttingRate] = useState(0);
  const [polishingRate, setPolishingRate] = useState(0);
  const [installRate, setInstallRate] = useState(0);
  const [wastePercent, setWastePercent] = useState(5);
  const [calcResult, setCalcResult] = useState<MarbleCalculation | null>(null);

  useEffect(() => {
    // Basic calculation logic
    const netQty = type === 'slab' ? (length * width) / 10000 : length / 100; // m2 or m
    const grossQty = netQty * (1 + wastePercent / 100);
    
    // Simplified cost calculation
    const materialCost = grossQty * pricePerUnit;
    const laborCost = (cuttingRate + polishingRate + installRate) * (type === 'slab' ? netQty : length / 100);
    const totalCost = materialCost + laborCost;

    setCalcResult({
      id: uuidv4(),
      type,
      stoneType,
      length,
      width: type === 'slab' ? width : undefined,
      thicknessCm,
      quantity,
      pricePerUnit,
      cuttingRate,
      polishingRate,
      installRate,
      wastePercent,
      netQty,
      grossQty,
      weightKg: grossQty * thicknessCm * 25, // Rough estimate
      materialCost,
      laborCost,
      totalCost,
      label: `${stoneType} ${type === 'slab' ? 'Slab' : 'Linear'}`
    });
  }, [type, stoneType, length, width, thicknessCm, quantity, pricePerUnit, cuttingRate, polishingRate, installRate, wastePercent]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">حاسبة الرخام</h2>
      <div className="grid grid-cols-2 gap-4">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="p-2 border rounded-xl">
          <option value="slab">لوح (Slab)</option>
          <option value="linear">خط طولي (Linear)</option>
        </select>
        <input type="text" placeholder="نوع الحجر" value={stoneType} onChange={(e) => setStoneType(e.target.value)} className="p-2 border rounded-xl" />
        <input type="number" placeholder="الطول (سم)" value={length} onChange={(e) => setLength(Number(e.target.value))} className="p-2 border rounded-xl" />
        {type === 'slab' && <input type="number" placeholder="العرض (سم)" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="p-2 border rounded-xl" />}
        <input type="number" placeholder="السماكة (سم)" value={thicknessCm} onChange={(e) => setThicknessCm(Number(e.target.value))} className="p-2 border rounded-xl" />
        <input type="number" placeholder="الكمية" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="p-2 border rounded-xl" />
        <input type="number" placeholder="سعر الوحدة" value={pricePerUnit} onChange={(e) => setPricePerUnit(Number(e.target.value))} className="p-2 border rounded-xl" />
      </div>
      
      {calcResult && (
        <div className="bg-slate-50 p-4 rounded-xl">
          <p>التكلفة الإجمالية: {calcResult.totalCost.toFixed(2)}</p>
          <button onClick={() => onAdd(calcResult)} className="mt-2 bg-primary text-white p-2 rounded-xl">إضافة للحساب</button>
        </div>
      )}
    </div>
  );
};

