import React, { useState, useEffect } from "react";
import { GlassCalculation } from "./types";
import { v4 as uuidv4 } from "uuid";
import {
  Ruler,
  Layers,
  DollarSign,
  Box,
  PlusCircle,
  Maximize,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const GlassCalculator = ({
  onAdd,
  products,
}: {
  onAdd: (calc: GlassCalculation) => void;
  products?: any[];
}) => {
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [type, setType] = useState<GlassCalculation["type"]>("plain");
  const [thicknessMm, setThicknessMm] = useState<number>(6);
  const [length, setLength] = useState<number>(100);
  const [width, setWidth] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(1);
  const [pricePerM2, setPricePerM2] = useState<number>(500);

  const [calcResult, setCalcResult] = useState<GlassCalculation | null>(null);

  const handleProductSelect = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    setSelectedProduct(product);
    if (!product) return;
    const item = product.departments
      .flatMap((d: any) => d.items)
      .find((i: any) => i.name.includes("زجاج") || i.name.includes("مرايا"));
    if (item) {
      setQuantity(item.quantity);
      setType(item.name.includes("مرايا") ? "mirror" : "plain");
    }
  };

  useEffect(() => {
    const netAreaM2 = (length * width) / 10000;
    const totalAreaM2 = netAreaM2 * quantity;
    const materialCost = totalAreaM2 * pricePerM2;
    const totalCost = materialCost; // Simple for now

    setCalcResult({
      id: uuidv4(),
      type,
      thicknessMm,
      length,
      width,
      quantity,
      pricePerM2,
      bevelingRate: 0,
      boringRate: 0,
      boringCount: 0,
      netAreaM2: totalAreaM2,
      weightKg: totalAreaM2 * thicknessMm * 2.5, // 2.5kg per mm per m2
      perimeterM: ((length + width) * 2) / 100,
      materialCost,
      laborCost: 0,
      totalCost,
      label: `${type} - ${length}x${width}cm (${thicknessMm}mm)`,
    });
  }, [type, thicknessMm, length, width, quantity, pricePerM2]);

  const InputField = ({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          {...props}
          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-900"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-[14px] shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
          حاسبة الزجاج
        </h2>
        <div className="flex bg-slate-100 p-1.5 rounded-[14px]">
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "px-6 py-2.5 rounded-xl font-black text-xs transition-all",
              mode === "manual"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-500",
            )}
          >
            يدوي
          </button>
          <button
            onClick={() => setMode("automatic")}
            className={cn(
              "px-6 py-2.5 rounded-xl font-black text-xs transition-all",
              mode === "automatic"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-500",
            )}
          >
            تلقائي
          </button>
        </div>
      </div>

      {mode === "automatic" && (
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            اختر المنتج (لجلب الخامات)
          </label>
          <select
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-[14px] font-bold text-slate-900"
            onChange={(e) => handleProductSelect(e.target.value)}
          >
            <option value="">اختر المنتج...</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            نوع الزجاج
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-[14px] font-bold text-slate-900"
          >
            <option value="plain">عادي</option>
            <option value="tinted">ملون</option>
            <option value="securit">سيكوريت</option>
            <option value="double">دابل</option>
          </select>
        </div>
        <InputField
          label="السماكة (mm)"
          icon={Layers}
          type="number"
          value={thicknessMm}
          onChange={(e: any) => setThicknessMm(Number(e.target.value))}
        />
        <InputField
          label="الطول (cm)"
          icon={Ruler}
          type="number"
          value={length}
          onChange={(e: any) => setLength(Number(e.target.value))}
        />
        <InputField
          label="العرض (cm)"
          icon={Ruler}
          type="number"
          value={width}
          onChange={(e: any) => setWidth(Number(e.target.value))}
        />
        <InputField
          label="الكمية"
          icon={Box}
          type="number"
          value={quantity}
          onChange={(e: any) => setQuantity(Number(e.target.value))}
        />
        <InputField
          label="سعر المتر المربع"
          icon={DollarSign}
          type="number"
          value={pricePerM2}
          onChange={(e: any) => setPricePerM2(Number(e.target.value))}
        />
      </div>

      {calcResult && (
        <div className="bg-slate-900 p-6 rounded-[14px] text-white flex items-center justify-between shadow-2xl">
          <div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
              التكلفة الإجمالية
            </p>
            <p className="text-4xl font-black tracking-tighter">
              {calcResult.totalCost.toLocaleString("ar-EG", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <button
            onClick={() => onAdd(calcResult)}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[14px] font-black text-sm transition-all shadow-lg shadow-indigo-900/20"
          >
            <PlusCircle size={18} />
            إضافة للحساب
          </button>
        </div>
      )}
    </div>
  );
};
