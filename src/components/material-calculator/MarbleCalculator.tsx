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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
            <Layers size={24} />
          </div>
          حاسبة الرخام
        </h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "px-6 py-2 rounded-lg font-black text-xs transition-all",
              mode === "manual"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            إدخال يدوي
          </button>
          <button
            onClick={() => setMode("automatic")}
            className={cn(
              "px-6 py-2 rounded-lg font-black text-xs transition-all",
              mode === "automatic"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            تلقائي
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mode === "automatic" && (
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">اختر المنتج</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
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

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">نوع التقطيع</label>
          <div className="flex bg-slate-100 p-1 rounded-xl h-11">
            <button
              onClick={() => setType("slab")}
              className={cn(
                "flex-1 rounded-lg font-black text-xs transition-all",
                type === "slab"
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              لوح (Slab)
            </button>
            <button
              onClick={() => setType("linear")}
              className={cn(
                "flex-1 rounded-lg font-black text-xs transition-all",
                type === "linear"
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              خط طولي
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">نوع الحجر</label>
          <Input
            type="text"
            placeholder="رخام كرارا..."
            value={stoneType}
            onChange={(e) => setStoneType(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الطول (سم)</label>
          <Input
            type="number"
            value={length || ''}
            onChange={(e) => setLength(Number(e.target.value))}
            placeholder="0.00"
          />
        </div>

        {type === "slab" && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">العرض (سم)</label>
            <Input
              type="number"
              value={width || ''}
              onChange={(e) => setWidth(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">السماكة (سم)</label>
          <Input
            type="number"
            value={thicknessCm || ''}
            onChange={(e) => setThicknessCm(Number(e.target.value))}
            placeholder="2.00"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">سعر الوحدة</label>
          <Input
            type="number"
            value={pricePerUnit || ''}
            onChange={(e) => setPricePerUnit(Number(e.target.value))}
            placeholder="0.00"
          />
        </div>
      </div>

      {calcResult && (
        <div className="bg-indigo-900 p-6 rounded-[14px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-200">
          <div className="text-center md:text-right">
            <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-1">
              إجمالي تكلفة الرخام
            </p>
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <p className="text-5xl font-black tracking-tighter">
                {calcResult.totalCost.toLocaleString("ar-EG", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xl font-bold text-indigo-300">ج.م</p>
            </div>
            <p className="text-xs text-indigo-400 mt-1 font-bold italic">تشمل الخامات والمصنعيات المقدرة</p>
          </div>
          <Button
            onClick={() => onAdd(calcResult)}
            className="w-full md:w-auto h-14 px-10 rounded-[14px] bg-white text-indigo-900 hover:bg-indigo-50 shadow-xl"
          >
            <PlusCircle size={20} className="ml-2" />
            إضافة الحسبة للمشروع
          </Button>
        </div>
      )}
    </div>
  );
};
