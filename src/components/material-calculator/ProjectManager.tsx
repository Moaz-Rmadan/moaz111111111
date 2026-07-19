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
  Calculator
} from "lucide-react";

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
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-8 gap-8">
        <div className="flex-1 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
              اسم المشروع
            </label>
            <input
              type="text"
              value={project.projectName}
              onChange={(e) =>
                setProject((prev: any) => ({
                  ...prev,
                  projectName: e.target.value,
                }))
              }
              className="w-full text-3xl font-black text-slate-900 tracking-tighter bg-transparent border-none outline-none focus:ring-0 p-0"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
              اسم العميل
            </label>
            <input
              type="text"
              value={project.clientName}
              onChange={(e) =>
                setProject((prev: any) => ({
                  ...prev,
                  clientName: e.target.value,
                }))
              }
              className="w-full text-slate-500 font-bold text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
            />
          </div>
        </div>
        <div className="flex gap-4 shrink-0">
          <button
            onClick={() => window.print()}
            className="bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-200"
          >
            طباعة التقرير
          </button>
          <div className="text-right bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-600/20">
            <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">
              سعر البيع النهائي للعميل
            </p>
            <p className="text-4xl font-black">
              {(project.finalPrice || 0).toLocaleString("ar-EG", { maximumFractionDigits: 0 })} ج.م
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            title="الاكسسوارات والخردوات"
            type="hardware"
            items={project.hardwareCalcs}
            icon={Wrench}
            onRemove={onRemove}
          />
        )}
      </div>

      {/* Pricing Configuration Section */}
      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Calculator size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800">حسابات التسعير وهوامش الربح</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">العمالة والمصنعيات (ج.م)</label>
                  <div className="flex items-center">
                      <input type="number" value={project.laborCost || 0} onChange={(e) => setProject((prev: any) => ({ ...prev, laborCost: Number(e.target.value) }))} className="w-full text-xl font-black text-slate-900 border-none bg-transparent focus:ring-0 p-0" />
                      <DollarSign size={18} className="text-slate-400" />
                  </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">التعبئة والتغليف (ج.م)</label>
                  <div className="flex items-center">
                      <input type="number" value={project.packagingCost || 0} onChange={(e) => setProject((prev: any) => ({ ...prev, packagingCost: Number(e.target.value) }))} className="w-full text-xl font-black text-slate-900 border-none bg-transparent focus:ring-0 p-0" />
                      <Package size={18} className="text-slate-400" />
                  </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">النقل والشحن (ج.م)</label>
                  <div className="flex items-center">
                      <input type="number" value={project.shippingCost || 0} onChange={(e) => setProject((prev: any) => ({ ...prev, shippingCost: Number(e.target.value) }))} className="w-full text-xl font-black text-slate-900 border-none bg-transparent focus:ring-0 p-0" />
                      <Layers size={18} className="text-slate-400" />
                  </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">المصروفات الإدارية (%)</label>
                  <div className="flex items-center">
                      <input type="number" value={project.overheadPercent || 0} onChange={(e) => setProject((prev: any) => ({ ...prev, overheadPercent: Number(e.target.value) }))} className="w-full text-xl font-black text-slate-900 border-none bg-transparent focus:ring-0 p-0" />
                      <Percent size={18} className="text-slate-400" />
                  </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">هامش الربح (%)</label>
                  <div className="flex items-center">
                      <input type="number" value={project.profitPercent || 0} onChange={(e) => setProject((prev: any) => ({ ...prev, profitPercent: Number(e.target.value) }))} className="w-full text-xl font-black text-slate-900 border-none bg-transparent focus:ring-0 p-0" />
                      <Percent size={18} className="text-slate-400" />
                  </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">القيمة المضافة (%)</label>
                  <div className="flex items-center">
                      <input type="number" value={project.taxPercent || 0} onChange={(e) => setProject((prev: any) => ({ ...prev, taxPercent: Number(e.target.value) }))} className="w-full text-xl font-black text-slate-900 border-none bg-transparent focus:ring-0 p-0" />
                      <Percent size={18} className="text-slate-400" />
                  </div>
              </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
              <div className="space-y-2 mb-4 border-b border-slate-700 pb-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">مراكز التكلفة (الخامات)</h4>
                  {project.woodCalcs?.length > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                          <span>الأخشاب:</span>
                          <span>{project.woodCalcs.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
                      </div>
                  )}
                  {project.marbleCalcs?.length > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                          <span>الرخام:</span>
                          <span>{project.marbleCalcs.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
                      </div>
                  )}
                  {project.glassCalcs?.length > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                          <span>الزجاج والمرايا:</span>
                          <span>{project.glassCalcs.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
                      </div>
                  )}
                  {project.plywoodCalcs && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                          <span>الأبلكاش:</span>
                          <span>{(project.plywoodCalcs as any).totalCost?.toLocaleString('ar-EG', { maximumFractionDigits: 0 }) || 0} ج.م</span>
                      </div>
                  )}
                  {project.fabricCalcs?.length > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                          <span>الأقمشة:</span>
                          <span>{project.fabricCalcs.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
                      </div>
                  )}
                  {project.hardwareCalcs?.length > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                          <span>الإكسسوارات والخردوات:</span>
                          <span>{project.hardwareCalcs.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
                      </div>
                  )}
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>إجمالي تكلفة الخامات المباشرة:</span>
                  <span className="text-white text-lg">{project.totalCost?.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>العمالة + التغليف + الشحن:</span>
                  <span className="text-white text-lg">+ {((project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>المصروفات الإدارية والتشغيلية ({(project.overheadPercent || 0)}%):</span>
                  <span className="text-white text-lg">+ {(((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * ((project.overheadPercent || 0) / 100)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="h-px bg-slate-700 w-full my-2"></div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>إجمالي التكلفة:</span>
                  <span className="text-white text-lg">{(((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * (1 + (project.overheadPercent || 0) / 100)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>هامش الربح المستهدف ({(project.profitPercent || 0)}%):</span>
                  <span className="text-white text-lg">+ {((((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * (1 + (project.overheadPercent || 0) / 100)) * ((project.profitPercent || 0) / 100)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="h-px bg-slate-700 w-full my-2"></div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>السعر قبل الضريبة:</span>
                  <span className="text-white text-lg">{((((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * (1 + (project.overheadPercent || 0) / 100)) * (1 + (project.profitPercent || 0) / 100)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>ضريبة القيمة المضافة ({(project.taxPercent || 0)}%):</span>
                  <span className="text-white text-lg">+ {(((((project.totalCost || 0) + (project.laborCost || 0) + (project.packagingCost || 0) + (project.shippingCost || 0)) * (1 + (project.overheadPercent || 0) / 100)) * (1 + (project.profitPercent || 0) / 100)) * ((project.taxPercent || 0) / 100)).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
              <div className="h-px bg-slate-700 w-full my-4"></div>
              <div className="flex justify-between items-center">
                  <span className="text-lg font-black uppercase tracking-widest text-indigo-400">السعر النهائي للعميل</span>
                  <span className="text-3xl font-black text-indigo-400">{(project.finalPrice || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
              </div>
          </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
          ملاحظات المشروع
        </h3>
        <textarea
          value={project.notes}
          onChange={(e) =>
            setProject((prev: any) => ({ ...prev, notes: e.target.value }))
          }
          className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-800 font-bold resize-none h-24"
          placeholder="أضف ملاحظات للمشروع هنا..."
        />
      </div>
    </div>
  );
};

const Section = ({ title, type, items, icon: Icon, onRemove }: any) => {
  const totalSectionCost = items.reduce((acc: number, item: any) => acc + (item.totalCost || 0), 0);

  return (
  <div className="bg-white p-6 rounded-2xl border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Icon size={20} />
        </div>
        {title}
      </h3>
      <div className="bg-slate-100 px-4 py-2 rounded-xl text-slate-700 font-bold text-sm flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest opacity-60">إجمالي التكلفة:</span>
          <span>{totalSectionCost.toLocaleString('ar-EG')} ج.م</span>
      </div>
    </div>
    <div className="space-y-3">
      {items.map((item: any) => (
        <div
          key={item.id}
          className="flex justify-between items-center bg-slate-50 p-4 rounded-xl text-sm border border-slate-100"
        >
          <span className="font-bold text-slate-700">{item.label}</span>
          <div className="flex items-center gap-4">
            <span className="font-black text-indigo-700 bg-white shadow-sm border border-slate-100 px-3 py-1 rounded-lg">
              {item.totalCost.toLocaleString("ar-EG")} ج.م
            </span>
            <button
              onClick={() => onRemove(type, item.id)}
              className="text-red-500 hover:text-red-700 bg-white border border-slate-100 hover:bg-red-50 shadow-sm rounded-lg p-2 transition-colors"
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
