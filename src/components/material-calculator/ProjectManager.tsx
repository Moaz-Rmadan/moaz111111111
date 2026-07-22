import React, { useEffect } from "react";
import { EstimationProject } from "./types";
import {
  FileText,
  DollarSign,
  Package,
  Gem,
  Scissors,
  Layers,
  Trash2,
  Wrench,
  Percent,
  Calculator,
  Printer,
  ChevronRight,
  Target,
  ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const ProjectManager = ({
  project,
  onRemove,
  setProject,
}: {
  project: EstimationProject;
  onRemove: (
    type: "wood" | "marble" | "glass" | "plywood" | "fabric" | "hardware",
    id: string,
  ) => void;
  setProject: (p: any) => void;
}) => {

  // Auto-calculate final price
  useEffect(() => {
    const totalMaterial = project.totalCost || 0;
    const labor = project.laborCost || 0;
    const packaging = project.packagingCost || 0;
    const shipping = project.shippingCost || 0;

    const directCost = totalMaterial + labor + packaging + shipping;

    const overhead = directCost * ((project.overheadPercent || 0) / 100);
    const subtotal = directCost + overhead;
    const profit = subtotal * ((project.profitPercent || 0) / 100);
    const preTax = subtotal + profit;
    const tax = preTax * ((project.taxPercent || 0) / 100);
    const final = preTax + tax;
    
    setProject((prev: any) => ({ ...prev, finalPrice: final }));
  }, [project.totalCost, project.laborCost, project.packagingCost, project.shippingCost, project.overheadPercent, project.profitPercent, project.taxPercent]);

  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-10 border-b border-slate-100">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">
              اسم المشروع (لأغراض الطباعة والأرشفة)
            </label>
            <Input
              type="text"
              value={project.projectName}
              onChange={(e) =>
                setProject((prev: any) => ({
                  ...prev,
                  projectName: e.target.value,
                }))
              }
              className="text-3xl font-black h-16 rounded-[14px] border-none shadow-none bg-slate-50 hover:bg-slate-100 transition-all px-6"
              placeholder="مشروع جديد..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">
              العميل المستهدف
            </label>
            <Input
              type="text"
              value={project.clientName}
              onChange={(e) =>
                setProject((prev: any) => ({
                  ...prev,
                  clientName: e.target.value,
                }))
              }
              className="text-lg font-bold h-12 rounded-xl border-none shadow-none bg-slate-50 hover:bg-slate-100 transition-all px-6"
              placeholder="اسم العميل..."
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="h-16 px-8 rounded-[14px] border-2 border-slate-200 text-slate-700 font-black"
          >
            <Printer size={20} className="ml-2" />
            طباعة العرض
          </Button>
          <div className="text-right bg-indigo-600 text-white px-10 py-6 rounded-3xl shadow-2xl shadow-indigo-200 border-b-4 border-indigo-800">
            <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">
              السعر النهائي للبيع
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-black">
                {(project.finalPrice || 0).toLocaleString("ar-EG", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xl font-bold opacity-80">ج.م</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.woodCalcs.length > 0 && (
          <Section
            title="الأخشاب"
            type="wood"
            items={project.woodCalcs}
            icon={Package}
            onRemove={onRemove}
          />
        )}
        {project.marbleCalcs.length > 0 && (
          <Section
            title="الرخام"
            type="marble"
            items={project.marbleCalcs}
            icon={Gem}
            onRemove={onRemove}
          />
        )}
        {project.glassCalcs.length > 0 && (
          <Section
            title="الزجاج"
            type="glass"
            items={project.glassCalcs}
            icon={Package}
            onRemove={onRemove}
          />
        )}
        {project.fabricCalcs.length > 0 && (
          <Section
            title="الأقمشة"
            type="fabric"
            items={project.fabricCalcs}
            icon={Scissors}
            onRemove={onRemove}
          />
        )}
        {project.plywoodCalcs && (
          <Section
            title="الأبلكاش"
            type="plywood"
            items={[project.plywoodCalcs]}
            icon={Layers}
            onRemove={onRemove}
          />
        )}
        {project.hardwareCalcs?.length > 0 && (
          <Section
            title="الإكسسوارات"
            type="hardware"
            items={project.hardwareCalcs}
            icon={Wrench}
            onRemove={onRemove}
          />
        )}
      </div>

      <div className="bg-white p-6 rounded-[14px] border border-slate-100 shadow-sm space-y-10">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Calculator size={24} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-800">إدارة التسعير وهوامش الربح</h3>
                  <p className="text-sm font-bold text-slate-500">تحكم في التكاليف الإضافية والضرائب والربحية</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PricingInput
                label="العمالة والمصنعيات"
                icon={DollarSign}
                value={project.laborCost}
                onChange={(v) => setProject((prev: any) => ({ ...prev, laborCost: v }))}
                suffix="ج.م"
              />
              <PricingInput
                label="التعبئة والتغليف"
                icon={Package}
                value={project.packagingCost}
                onChange={(v) => setProject((prev: any) => ({ ...prev, packagingCost: v }))}
                suffix="ج.م"
              />
              <PricingInput
                label="النقل والشحن"
                icon={Layers}
                value={project.shippingCost}
                onChange={(v) => setProject((prev: any) => ({ ...prev, shippingCost: v }))}
                suffix="ج.م"
              />
              <PricingInput
                label="المصروفات الإدارية"
                icon={Percent}
                value={project.overheadPercent}
                onChange={(v) => setProject((prev: any) => ({ ...prev, overheadPercent: v }))}
                suffix="%"
              />
              <PricingInput
                label="هامش الربح"
                icon={Target}
                value={project.profitPercent}
                onChange={(v) => setProject((prev: any) => ({ ...prev, profitPercent: v }))}
                suffix="%"
              />
              <PricingInput
                label="ضريبة القيمة المضافة"
                icon={ShieldCheck}
                value={project.taxPercent}
                onChange={(v) => setProject((prev: any) => ({ ...prev, taxPercent: v }))}
                suffix="%"
              />
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-[14px] space-y-6 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">تفاصيل تكاليف الخامات</h4>
                      <div className="space-y-3">
                        <CostRow label="الأخشاب" value={project.woodCalcs?.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0)} />
                        <CostRow label="الرخام" value={project.marbleCalcs?.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0)} />
                        <CostRow label="الزجاج والمرايا" value={project.glassCalcs?.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0)} />
                        <CostRow label="الأبلكاش" value={(project.plywoodCalcs as any)?.totalCost || 0} />
                        <CostRow label="الأقمشة" value={project.fabricCalcs?.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0)} />
                        <CostRow label="الإكسسوارات" value={project.hardwareCalcs?.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0)} />
                      </div>
                  </div>

                  <div className="space-y-4 pt-10 lg:pt-0 border-t lg:border-t-0 lg:border-r border-slate-800 lg:pr-10">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">ملخص الحسابات النهائية</h4>
                      <div className="space-y-4">
                          <SummaryRow 
                            label="إجمالي التكلفة المباشرة" 
                            value={(project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)} 
                          />
                          <SummaryRow 
                            label={`المصروفات الإدارية (${project.overheadPercent}%)`} 
                            value={((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * ((project.overheadPercent || 0) / 100)} 
                          />
                          <SummaryRow 
                            label={`هامش الربح (${project.profitPercent}%)`} 
                            value={(((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * (1 + (project.overheadPercent || 0) / 100)) * ((project.profitPercent || 0) / 100)} 
                          />
                          <SummaryRow 
                            label={`ضريبة القيمة المضافة (${project.taxPercent}%)`} 
                            value={((((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * (1 + (project.overheadPercent || 0) / 100)) * (1 + (project.profitPercent || 0) / 100)) * ((project.taxPercent || 0) / 100)} 
                          />
                          <div className="h-px bg-slate-700 w-full my-4"></div>
                          <div className="flex justify-between items-center">
                              <span className="text-xl font-black text-indigo-400">السعر النهائي للعميل</span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-indigo-400">{(project.finalPrice || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })}</span>
                                <span className="text-lg font-bold text-indigo-400 opacity-60">ج.م</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 mr-1">
          ملاحظات وتوصيات المشروع
        </h3>
        <textarea
          value={project.notes}
          onChange={(e) =>
            setProject((prev: any) => ({ ...prev, notes: e.target.value }))
          }
          className="w-full bg-white rounded-[14px] p-6 text-slate-800 font-bold border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none min-h-[150px]"
          placeholder="أضف ملاحظات تفصيلية للمشروع هنا..."
        />
      </div>
    </div>
  );
};

const PricingInput = ({ label, icon: Icon, value, onChange, suffix }: any) => (
  <div className="space-y-3">
    <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
        <Icon size={18} />
      </div>
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pl-12 h-14 rounded-[14px] font-black text-lg border-2 border-slate-100 focus:border-indigo-500"
        placeholder="0.00"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">{suffix}</div>
    </div>
  </div>
);

const CostRow = ({ label, value }: { label: string, value: number }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center text-sm font-bold py-1">
      <span className="text-slate-400">{label}:</span>
      <span className="text-slate-200">{value.toLocaleString('ar-EG')} ج.م</span>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string, value: number }) => (
  <div className="flex justify-between items-center text-sm font-bold">
    <span className="text-slate-400">{label}:</span>
    <span className="text-slate-200">{(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
  </div>
);

const Section = ({ title, type, items, icon: Icon, onRemove }: any) => {
  const totalSectionCost = items.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0);

  return (
    <div className="bg-white p-6 rounded-[14px] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all flex items-center justify-center">
            <Icon size={20} />
          </div>
          {title}
        </h3>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black">
          {totalSectionCost.toLocaleString('ar-EG')} ج.م
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item: any) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-slate-50/50 p-4 rounded-[14px] text-sm border border-slate-100 hover:bg-white hover:border-slate-200 transition-all"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-slate-800 truncate max-w-[120px]">{item.label}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.woodType || item.stoneType || ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-900">
                {item.totalCost.toLocaleString("ar-EG")}
              </span>
              <button
                onClick={() => onRemove(type, item.id)}
                className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
