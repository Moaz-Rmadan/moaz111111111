import React, { useState, useMemo } from "react";
import { WoodCalculation } from "./types";
import { Ruler, Trees, DollarSign, Box, PlusCircle } from "lucide-react";
import { WOOD_TYPES } from "./constants";
import { cn } from "@/lib/utils";

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
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
          <Trees size={28} className="text-emerald-600" /> حاسبة الأخشاب
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
            {products.map((p) => (
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
            نوع الخشب
          </label>
          <select
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
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
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
              نوع التقطيع
            </label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setForm({ ...form, type: "plank" })}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-black text-xs transition-all",
                  form.type === "plank"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-500",
                )}
              >
                ألواح (Plank)
              </button>
              <button
                onClick={() => setForm({ ...form, type: "log" })}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-black text-xs transition-all",
                  form.type === "log"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-500",
                )}
              >
                جذوع (Log)
              </button>
            </div>
          </div>
        )}

        {mode === "manual" &&
          (form.type === "plank" ? (
            <>
              <InputField
                label="السُمك (سم)"
                icon={Ruler}
                type="number"
                value={form.thickness}
                onChange={(e: any) =>
                  setForm({ ...form, thickness: e.target.value })
                }
              />
              <InputField
                label="العرض (سم)"
                icon={Ruler}
                type="number"
                value={form.width}
                onChange={(e: any) =>
                  setForm({ ...form, width: e.target.value })
                }
              />
              <InputField
                label="الطول (سم)"
                icon={Ruler}
                type="number"
                value={form.length}
                onChange={(e: any) =>
                  setForm({ ...form, length: e.target.value })
                }
              />
            </>
          ) : (
            <>
              <InputField
                label="الطول (سم)"
                icon={Ruler}
                type="number"
                value={form.length}
                onChange={(e: any) =>
                  setForm({ ...form, length: e.target.value })
                }
              />
              {form.logMethod === "hoppus" ? (
                <InputField
                  label="المحيط (سم)"
                  icon={Ruler}
                  type="number"
                  value={form.girth}
                  onChange={(e: any) =>
                    setForm({ ...form, girth: e.target.value })
                  }
                />
              ) : (
                <InputField
                  label="القطر (سم)"
                  icon={Ruler}
                  type="number"
                  value={form.diameter}
                  onChange={(e: any) =>
                    setForm({ ...form, diameter: e.target.value })
                  }
                />
              )}
            </>
          ))}
        <InputField
          label="الكمية"
          icon={Box}
          type="number"
          value={form.quantity}
          onChange={(e: any) => setForm({ ...form, quantity: e.target.value })}
        />
      </div>

      <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between shadow-2xl">
        <div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
            التكلفة التقديرية
          </p>
          <p className="text-4xl font-black tracking-tighter">
            {computed.totalCost.toLocaleString("ar-EG")} ج.م
          </p>
        </div>
        <button
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
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-900/20"
        >
          <PlusCircle size={18} />
          إضافة للحسبة
        </button>
      </div>
    </div>
  );
};
