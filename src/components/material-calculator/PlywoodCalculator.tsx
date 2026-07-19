import React, { useState, useEffect } from "react";
import { PlywoodCalculation, PlywoodPart } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Ruler, DollarSign, Box, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const PlywoodCalculator = ({
  onAdd,
  products,
}: {
  onAdd: (calc: PlywoodCalculation) => void;
  products?: any[];
}) => {
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sheetWidth, setSheetWidth] = useState<number>(122);
  const [sheetHeight, setSheetHeight] = useState<number>(244);
  const [sheetPrice, setSheetPrice] = useState<number>(800);
  const [parts, setParts] = useState<PlywoodPart[]>([]);
  const [calcResult, setCalcResult] = useState<PlywoodCalculation | null>(null);

  const handleProductSelect = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    setSelectedProduct(product);
    if (!product) return;
    const item = product.departments
      .flatMap((d: any) => d.items)
      .find((i: any) => i.name.includes("أبلكاش"));
    if (item) {
      setParts([
        {
          id: uuidv4(),
          label: item.name,
          width: 50,
          length: 50,
          quantity: item.quantity,
        },
      ]);
    }
  };

  const addPart = () => {
    setParts([
      ...parts,
      { id: uuidv4(), label: "قطعة جديدة", width: 50, length: 50, quantity: 1 },
    ]);
  };

  const updatePart = (id: string, field: keyof PlywoodPart, value: any) => {
    setParts(parts.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  useEffect(() => {
    const totalNetAreaM2 = parts.reduce(
      (sum, p) => sum + (p.width * p.length * p.quantity) / 10000,
      0,
    );
    const sheetAreaM2 = (sheetWidth * sheetHeight) / 10000;
    const estimatedSheets = Math.ceil(totalNetAreaM2 / (sheetAreaM2 * 0.85)); // 15% waste assumption

    setCalcResult({
      id: uuidv4(),
      sheetWidth,
      sheetHeight,
      sheetPrice,
      parts,
      cuttingGapMm: 0,
      wasteMarginMm: 0,
      estimatedSheets,
      totalNetAreaM2,
      totalSheetAreaM2: estimatedSheets * sheetAreaM2,
      utilizationPercent:
        (totalNetAreaM2 / (estimatedSheets * sheetAreaM2)) * 100,
      totalCost: estimatedSheets * sheetPrice,
    });
  }, [sheetWidth, sheetHeight, sheetPrice, parts]);

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
          حاسبة الأبلكاش
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            عرض اللوح (cm)
          </label>
          <input
            type="number"
            value={sheetWidth}
            onChange={(e) => setSheetWidth(Number(e.target.value))}
            className="w-full p-3 bg-slate-50 border rounded-2xl font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            طول اللوح (cm)
          </label>
          <input
            type="number"
            value={sheetHeight}
            onChange={(e) => setSheetHeight(Number(e.target.value))}
            className="w-full p-3 bg-slate-50 border rounded-2xl font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            سعر اللوح
          </label>
          <input
            type="number"
            value={sheetPrice}
            onChange={(e) => setSheetPrice(Number(e.target.value))}
            className="w-full p-3 bg-slate-50 border rounded-2xl font-bold"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-900">الأجزاء المطلوبة</h3>
          <button
            onClick={addPart}
            className="flex items-center gap-2 text-indigo-600 font-bold text-sm"
          >
            <PlusCircle size={16} />
            إضافة جزء
          </button>
        </div>
        {parts.map((part) => (
          <div
            key={part.id}
            className="grid grid-cols-5 gap-4 bg-slate-50 p-4 rounded-2xl items-center"
          >
            <input
              value={part.label}
              onChange={(e) => updatePart(part.id, "label", e.target.value)}
              className="col-span-2 p-2 bg-white border rounded-xl"
            />
            <input
              type="number"
              value={part.width}
              onChange={(e) =>
                updatePart(part.id, "width", Number(e.target.value))
              }
              className="p-2 bg-white border rounded-xl"
              placeholder="عرض"
            />
            <input
              type="number"
              value={part.length}
              onChange={(e) =>
                updatePart(part.id, "length", Number(e.target.value))
              }
              className="p-2 bg-white border rounded-xl"
              placeholder="طول"
            />
            <button
              onClick={() => setParts(parts.filter((p) => p.id !== part.id))}
              className="text-rose-500"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {calcResult && (
        <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between shadow-2xl">
          <div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
              التكلفة الإجمالية ({calcResult.estimatedSheets} لوح)
            </p>
            <p className="text-4xl font-black tracking-tighter">
              {calcResult.totalCost.toLocaleString("ar-EG")}
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
