import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { WoodCalculator } from "./material-calculator/WoodCalculator";
import { MarbleCalculator } from "./material-calculator/MarbleCalculator";
import { GlassCalculator } from "./material-calculator/GlassCalculator";
import { PlywoodCalculator } from "./material-calculator/PlywoodCalculator";
import { FabricCalculator } from "./material-calculator/FabricCalculator";
import { HardwareCalculator } from "./material-calculator/HardwareCalculator";
import { ProjectManager } from "./material-calculator/ProjectManager";
import { EstimationProject } from "./material-calculator/types";
import { PlusCircle, List, Trash2 } from "lucide-react";

export function MaterialCalculatorView() {
  const [activeSubTab, setActiveSubTab] = useState<
    "wood" | "marble" | "glass" | "plywood" | "fabric" | "hardware" | "projects" | "saved"
  >("wood");
  const [products, setProducts] = useState<any[]>([]);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [project, setProject] = useState<EstimationProject & { id?: string }>({
    projectName: "مشروع جديد",
    clientName: "عميل عام",
    date: new Date().toISOString().split("T")[0],
    woodCalcs: [],
    marbleCalcs: [],
    glassCalcs: [],
    plywoodCalcs: null,
    fabricCalcs: [],
    hardwareCalcs: [],
    totalCost: 0,
    laborCost: 0,
    packagingCost: 0,
    shippingCost: 0,
    overheadPercent: 15,
    profitPercent: 20,
    taxPercent: 14,
    finalPrice: 0,
    notes: "",
  });

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, "productRecipes"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    });
    const unsubProjects = onSnapshot(collection(db, "materialEstimations"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSavedProjects(data);
    });
    return () => {
        unsubProducts();
        unsubProjects();
    }
  }, []);

  const handleRemove = (
    type: "wood" | "marble" | "glass" | "plywood" | "fabric" | "hardware",
    id: string,
  ) => {
    setProject((prev) => {
      const key = `${type}Calcs` as keyof EstimationProject;
      const items = Array.isArray(prev[key])
        ? (prev[key] as any[])
        : prev[key]
          ? [prev[key]]
          : [];
      const filteredItems = items.filter((item) => item.id !== id);
      const removedItem = items.find((item) => item.id === id);
      const costDiff = removedItem ? removedItem.totalCost : 0;

      return {
        ...prev,
        [key]: type === "plywood" ? null : filteredItems,
        totalCost: prev.totalCost - costDiff,
      };
    });
  };

  const handleAddWood = (calc: any) =>
    setProject((prev) => ({
      ...prev,
      woodCalcs: [...prev.woodCalcs, calc],
      totalCost: prev.totalCost + calc.totalCost,
    }));
  const handleAddMarble = (calc: any) =>
    setProject((prev) => ({
      ...prev,
      marbleCalcs: [...prev.marbleCalcs, calc],
      totalCost: prev.totalCost + calc.totalCost,
    }));
  const handleAddGlass = (calc: any) =>
    setProject((prev) => ({
      ...prev,
      glassCalcs: [...prev.glassCalcs, calc],
      totalCost: prev.totalCost + calc.totalCost,
    }));
  const handleAddPlywood = (calc: any) =>
    setProject((prev) => ({
      ...prev,
      plywoodCalcs: calc,
      totalCost: prev.totalCost + calc.totalCost,
    }));
  const handleAddFabric = (calc: any) =>
    setProject((prev) => ({
      ...prev,
      fabricCalcs: [...prev.fabricCalcs, calc],
      totalCost: prev.totalCost + calc.totalCost,
    }));
  const handleAddHardware = (calc: any) =>
    setProject((prev) => ({
      ...prev,
      hardwareCalcs: [...(prev.hardwareCalcs || []), calc],
      totalCost: prev.totalCost + calc.totalCost,
    }));

  const handleSaveProject = async () => {
    try {
      if (project.id) {
        await updateDoc(doc(db, "materialEstimations", project.id), {
            ...project,
            updatedAt: serverTimestamp()
        });
        alert('تم تحديث الحسبة بنجاح');
      } else {
        await addDoc(collection(db, "materialEstimations"), {
            ...project,
            createdAt: serverTimestamp()
        });
        alert('تم حفظ الحسبة بنجاح');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذه الحسبة؟')) {
        await deleteDoc(doc(db, "materialEstimations", id));
    }
  }

  const handleNewProject = () => {
    setProject({
        projectName: "مشروع جديد",
        clientName: "عميل عام",
        date: new Date().toISOString().split("T")[0],
        woodCalcs: [],
        marbleCalcs: [],
        glassCalcs: [],
        plywoodCalcs: null,
        fabricCalcs: [],
        hardwareCalcs: [],
        totalCost: 0,
        laborCost: 0,
        packagingCost: 0,
        shippingCost: 0,
        overheadPercent: 15,
        profitPercent: 20,
        taxPercent: 14,
        finalPrice: 0,
        notes: "",
    });
    setActiveSubTab('wood');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
      <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">
            حاسبة الخامات الاحترافية
            </h1>
            <div className="flex gap-2">
                <button onClick={handleNewProject} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">
                    <PlusCircle size={18} />
                    حسبة جديدة
                </button>
                <button onClick={handleSaveProject} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20">
                    <List size={18} />
                    حفظ الحسبة
                </button>
            </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            إجمالي تكلفة المشروع المباشرة
          </p>
          <p className="text-3xl font-black text-indigo-600 tracking-tighter">
            {project.totalCost.toLocaleString("ar-EG", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-[14px] overflow-x-auto">
        {[
          { id: "wood", label: "أخشاب" },
          { id: "marble", label: "رخام" },
          { id: "glass", label: "زجاج" },
          { id: "plywood", label: "أبلكاش" },
          { id: "fabric", label: "قماش" },
          { id: "hardware", label: "إكسسوار" },
          { id: "projects", label: "المشروع الحالي" },
          { id: "saved", label: "الحسبات المحفوظة" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 min-w-[120px] p-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeSubTab === tab.id ? "bg-white shadow-sm text-indigo-700" : "text-slate-600 hover:bg-slate-200"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[14px] shadow-sm border border-slate-100">
        {activeSubTab === "wood" && (
          <WoodCalculator onAdd={handleAddWood} products={products} />
        )}
        {activeSubTab === "marble" && (
          <MarbleCalculator onAdd={handleAddMarble} products={products} />
        )}
        {activeSubTab === "glass" && (
          <GlassCalculator onAdd={handleAddGlass} products={products} />
        )}
        {activeSubTab === "plywood" && (
          <PlywoodCalculator onAdd={handleAddPlywood} products={products} />
        )}
        {activeSubTab === "fabric" && (
          <FabricCalculator onAdd={handleAddFabric} products={products} />
        )}
        {activeSubTab === "hardware" && (
          <HardwareCalculator onAdd={handleAddHardware} products={products} />
        )}
        {activeSubTab === "projects" && (
          <ProjectManager project={project} onRemove={handleRemove} setProject={setProject} />
        )}
        {activeSubTab === "saved" && (
            <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 mb-6">الحسبات المحفوظة</h2>
                {savedProjects.length === 0 ? (
                    <div className="text-center p-6 text-slate-500 font-bold bg-slate-50 rounded-[14px] border border-slate-100">لا توجد حسبات محفوظة</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedProjects.map(sp => (
                            <div key={sp.id} className="p-6 bg-slate-50 border border-slate-200 rounded-[14px] hover:border-indigo-300 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">{sp.projectName}</h3>
                                        <p className="text-sm font-bold text-slate-500">{sp.clientName} - {sp.date}</p>
                                    </div>
                                    <p className="text-xl font-black text-indigo-700">{sp.totalCost?.toLocaleString('ar-EG')} ج.م</p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => {
                                            setProject(sp);
                                            setActiveSubTab('projects');
                                        }} 
                                        className="flex-1 bg-white border border-slate-200 text-indigo-700 font-bold py-2 rounded-xl hover:bg-indigo-50"
                                    >
                                        فتح الحسبة
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteProject(sp.id)}
                                        className="p-2 text-red-500 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

