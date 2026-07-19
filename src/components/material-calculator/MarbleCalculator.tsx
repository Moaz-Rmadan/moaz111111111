import React, { useState, useEffect } from "react";
import { MarbleCalculation } from "./types";
import { v4 as uuidv4 } from "uuid";
import {
  Ruler,
  Layers,
  DollarSign,
  Zap,
  AlertTriangle,
  Box,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming this utility exists

export const MarbleCalculator = ({
  onAdd,
  products,
}: {
  onAdd: (calc: MarbleCalculation) => void;
  products?: any[];
}) => {
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [type, setType] = useState<"slab" | "linear">("slab");
  const [stoneType, setStoneType] = useState("");
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

  const handleProductSelect = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    setSelectedProduct(product);
    if (!product) return;
    const item = product.departments
      .flatMap((d: any) => d.items)
      .find((i: any) => i.name.includes("رخام") || i.name.includes("جرانيت"));
    if (item) {
      setQuantity(item.quantity);
      setStoneType(item.name);
    }
  };

  useEffect(() => {
    const netQty = type === "slab" ? (length * width) / 10000 : length / 100;
    const grossQty = netQty * (1 + wastePercent / 100);
    const materialCost = grossQty * pricePerUnit;
    const laborCost =
      (cuttingRate + polishingRate + installRate) *
      (type === "slab" ? netQty : length / 100);
    const totalCost = materialCost + laborCost;

    setCalcResult({
      id: uuidv4(),
      type,
      stoneType,
      length,
      width: type === "slab" ? width : undefined,
      thicknessCm,
      quantity,
      pricePerUnit,
      cuttingRate,
      polishingRate,
      installRate,
      wastePercent,
      netQty,
      grossQty,
      weightKg: grossQty * thicknessCm * 25,
      materialCost,
      laborCost,
      totalCost,
      label: `${stoneType} ${type === "slab" ? "Slab" : "Linear"}`,
    });
  }, [
    type,
    stoneType,
    length,
    width,
    thicknessCm,
    quantity,
    pricePerUnit,
    cuttingRate,
    polishingRate,
    installRate,
    wastePercent,
  ]);

  const InputField = ({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          {...props}
          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-900"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
          حاسبة الرخام الدقيقة
        </h2>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
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
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
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

      {mode === "manual" && (
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
            نوع التقطيع
          </label>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setType("slab")}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-black text-xs transition-all",
                type === "slab"
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500",
              )}
            >
              لوح (Slab)
            </button>
            <button
              onClick={() => setType("linear")}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-black text-xs transition-all",
                type === "linear"
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500",
              )}
            >
              خط طولي
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="نوع الحجر"
          icon={Box}
          type="text"
          placeholder="رخام كرارا..."
          value={stoneType}
          onChange={(e: any) => setStoneType(e.target.value)}
        />
        <InputField
          label="الطول (سم)"
          icon={Ruler}
          type="number"
          value={length}
          onChange={(e: any) => setLength(Number(e.target.value))}
        />
        {type === "slab" && (
          <InputField
            label="العرض (سم)"
            icon={Ruler}
            type="number"
            value={width}
            onChange={(e: any) => setWidth(Number(e.target.value))}
          />
        )}
        <InputField
          label="السماكة (سم)"
          icon={Layers}
          type="number"
          value={thicknessCm}
          onChange={(e: any) => setThicknessCm(Number(e.target.value))}
        />
        <InputField
          label="سعر الوحدة"
          icon={DollarSign}
          type="number"
          value={pricePerUnit}
          onChange={(e: any) => setPricePerUnit(Number(e.target.value))}
        />
      </div>

      {calcResult && (
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between shadow-2xl">
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
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-900/20"
          >
            <PlusCircle size={18} />
            إضافة للحساب
          </button>
        </div>
      )}
    </div>
  );
};
