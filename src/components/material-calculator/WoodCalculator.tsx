import React, { useState, useMemo } from "react";
import { WoodCalculation } from "./types";
import { Ruler, Trees, DollarSign, Box, PlusCircle, Calculator } from "lucide-react";
import { WOOD_TYPES } from "./constants";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const WoodCalculator = ({
  onAdd,
  products,
}: {
  onAdd: (calc: WoodCalculation) => void;
  products: any[];
}) => {
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [form, setForm] = useState({
    type: "plank" as "plank" | "log",
    woodType: "beech",
    dimensionUnit: "cm" as "cm" | "inch",
    thickness: "",
    width: "",
    length: "",
    girth: "",
    diameter: "",
    logMethod: "hoppus" as "hoppus" | "cylinder",
    quantity: "1",
    label: "",
  });

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product);
    if (!product) return;
    // Auto-fill logic (simplified for Phase 1 - find first wood-related item in BOM)
    // This needs to be robust, but for Phase 1, just a demonstration
    const woodItem = product.departments
      .flatMap((d: any) => d.items)
      .find((i: any) => i.name.includes("خشب"));
    if (woodItem) {
      setForm((prev) => ({ ...prev, quantity: woodItem.quantity.toString() }));
    }
  };

  const computed = useMemo(() => {
    const qty = Number(form.quantity) || 0;
    const priceM3 =
      WOOD_TYPES[form.woodType as keyof typeof WOOD_TYPES]?.pricePerM3 || 0;

    let volumeM3 = 0;
    if (form.type === "plank") {
      let thickCm = Number(form.thickness) || 0;
      let wideCm = Number(form.width) || 0;
      let len = Number(form.length) || 0;
      if (form.dimensionUnit === "inch") {
        thickCm *= 2.54;
        wideCm *= 2.54;
      }
      volumeM3 = (thickCm / 100) * (wideCm / 100) * (len / 100) * qty;
    } else {
      const lenM = (Number(form.length) || 0) / 100;
      if (form.logMethod === "hoppus") {
        const girthM = (Number(form.girth) || 0) / 100;
        volumeM3 = Math.pow(girthM / 4, 2) * lenM * qty;
      } else {
        const rM = (Number(form.diameter) || 0) / 2 / 100;
        volumeM3 = Math.PI * Math.pow(rM, 2) * lenM * qty;
      }
    }

    return {
      volumeM3: parseFloat(volumeM3.toFixed(4)),
      totalCost: Math.round(volumeM3 * priceM3),
    };
  }, [form]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <Trees size={24} />
          </div>
          حاسبة الأخشاب
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
            تلقائي (من BOM)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mode === "automatic" && (
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">
              اختر المنتج لجلب الخامات
            </label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              onChange={(e) => handleProductSelect(e.target.value)}
            >
              <option value="">اختر من قائمة المنتجات...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">
            نوع الخشب
          </label>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 transition-all outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            value={form.woodType}
            onChange={(e) => setForm({ ...form, woodType: e.target.value })}
          >
            {Object.entries(WOOD_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {mode === "manual" && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">
              طريقة الحساب
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl h-11">
              <button
                onClick={() => setForm({ ...form, type: "plank" })}
                className={cn(
                  "flex-1 rounded-lg font-black text-xs transition-all",
                  form.type === "plank"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                ألواح
              </button>
              <button
                onClick={() => setForm({ ...form, type: "log" })}
                className={cn(
                  "flex-1 rounded-lg font-black text-xs transition-all",
                  form.type === "log"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                كتل / جذوع
              </button>
            </div>
          </div>
        )}

        {mode === "manual" &&
          (form.type === "plank" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">السُمك (سم)</label>
                <Input
                  type="number"
                  value={form.thickness}
                  onChange={(e) => setForm({ ...form, thickness: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">العرض (سم)</label>
                <Input
                  type="number"
                  value={form.width}
                  onChange={(e) => setForm({ ...form, width: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الطول (سم)</label>
                <Input
                  type="number"
                  value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الطول (سم)</label>
                <Input
                  type="number"
                  value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              {form.logMethod === "hoppus" ? (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">المحيط (سم)</label>
                  <Input
                    type="number"
                    value={form.girth}
                    onChange={(e) => setForm({ ...form, girth: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">القطر (سم)</label>
                  <Input
                    type="number"
                    value={form.diameter}
                    onChange={(e) => setForm({ ...form, diameter: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              )}
            </>
          ))}
        
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">الكمية</label>
          <Input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            placeholder="1"
          />
        </div>
      </div>

      <div className="bg-indigo-900 p-6 rounded-[14px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-200">
        <div className="text-center md:text-right">
          <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-1">
            التكلفة التقديرية المباشرة
          </p>
          <div className="flex items-baseline gap-2 justify-center md:justify-start">
            <p className="text-5xl font-black tracking-tighter">
              {computed.totalCost.toLocaleString("ar-EG")}
            </p>
            <p className="text-xl font-bold text-indigo-300">ج.م</p>
          </div>
          <p className="text-xs text-indigo-400 mt-1 font-bold">حجم الخشب: {computed.volumeM3} متر مكعب</p>
        </div>
        <Button
          onClick={() =>
            onAdd({
              ...form,
              id: Math.random().toString(),
              thickness: Number(form.thickness),
              width: Number(form.width),
              length: Number(form.length),
              quantity: Number(form.quantity),
              pricePerM3:
                WOOD_TYPES[form.woodType as keyof typeof WOOD_TYPES]
                  ?.pricePerM3 || 0,
              volumeM3: computed.volumeM3,
              weightKg: 0,
              totalCost: computed.totalCost,
              density: 600,
              label:
                form.label ||
                WOOD_TYPES[form.woodType as keyof typeof WOOD_TYPES]?.label ||
                "خشب",
            } as WoodCalculation)
          }
          className="w-full md:w-auto h-14 px-10 rounded-[14px] bg-white text-indigo-900 hover:bg-indigo-50 shadow-xl"
        >
          <PlusCircle size={20} className="ml-2" />
          إضافة الحسبة للمشروع
        </Button>
      </div>
    </div>
  );
};
